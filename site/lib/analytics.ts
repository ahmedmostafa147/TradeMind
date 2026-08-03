/**
 * A faithful port of lib/core/calc/journal_analytics.dart and the equity curve
 * from journal_stats.dart.
 *
 * The dashboard shows the same figures the phone shows, so it repeats the app's
 * arithmetic instead of re-deriving it. Every rule the Dart file states in a
 * comment is reproduced here, because each one exists to stop a specific wrong
 * number:
 *
 *   - Planned and cancelled ideas are excluded throughout. They never risked
 *     money, so counting them would distort every average.
 *   - Every unavailable figure is null, never 0 and never NaN. An empty journal
 *     has no "best weekday", and 0.0 would read as a real result.
 *   - Closed trades sort by exit date THEN id. Date pickers yield date-only
 *     values so ties are constant, and an unstable sort would reshuffle the
 *     equity curve between renders.
 *   - A breakeven trade ends both streaks — it is neither a win nor a loss.
 *   - profitFactor is null when there are no losses: the ratio is unbounded and
 *     printing a huge number would mislead.
 */

import { metricsOf, type Trade } from '@/lib/trade';

export type PeriodPnl = {
  /** First day of the bucket. */
  start: Date;
  pnl: number;
  tradeCount: number;
};

export type TagStat = {
  tag: string;
  totalPnl: number;
  tradeCount: number;
  winCount: number;
};

export type TradeExtreme = {
  tradeId: string;
  ticker: string;
  pnl: number;
  exitDate: Date;
};

export type EquityPoint = { date: Date; equity: number };

export type Analytics = {
  closedCount: number;
  openCount: number;
  plannedCount: number;
  cancelledCount: number;
  winCount: number;
  lossCount: number;
  breakevenCount: number;

  totalPnl: number;
  winRate: number | null;
  expectancy: number | null;
  profitFactor: number | null;

  averageR: number | null;
  medianR: number | null;
  averageProfit: number | null;
  averageLoss: number | null;
  largestGain: number | null;
  largestLoss: number | null;

  longestWinStreak: number;
  longestLossStreak: number;
  averageHoldingDays: number | null;
  averagePositionValue: number | null;
  averageChecklistCompletion: number | null;

  mostTradedTicker: string | null;
  mostTradedTickerCount: number;
  bestTrade: TradeExtreme | null;
  worstTrade: TradeExtreme | null;

  bestWeekday: number | null;
  bestWeekdayPnl: number | null;
  worstWeekday: number | null;
  worstWeekdayPnl: number | null;
  bestMonth: number | null;
  bestMonthPnl: number | null;
  worstMonth: number | null;
  worstMonthPnl: number | null;

  monthlyPnl: PeriodPnl[];
  weeklyPnl: PeriodPnl[];

  tagStats: TagStat[];
  sourceStats: TagStat[];

  /** Starts at `capital`, then one point per closed trade at running equity. */
  equityCurve: EquityPoint[];
};

export const EMPTY_ANALYTICS: Analytics = {
  closedCount: 0,
  openCount: 0,
  plannedCount: 0,
  cancelledCount: 0,
  winCount: 0,
  lossCount: 0,
  breakevenCount: 0,
  totalPnl: 0,
  winRate: null,
  expectancy: null,
  profitFactor: null,
  averageR: null,
  medianR: null,
  averageProfit: null,
  averageLoss: null,
  largestGain: null,
  largestLoss: null,
  longestWinStreak: 0,
  longestLossStreak: 0,
  averageHoldingDays: null,
  averagePositionValue: null,
  averageChecklistCompletion: null,
  mostTradedTicker: null,
  mostTradedTickerCount: 0,
  bestTrade: null,
  worstTrade: null,
  bestWeekday: null,
  bestWeekdayPnl: null,
  worstWeekday: null,
  worstWeekdayPnl: null,
  bestMonth: null,
  bestMonthPnl: null,
  worstMonth: null,
  worstMonthPnl: null,
  monthlyPnl: [],
  weeklyPnl: [],
  tagStats: [],
  sourceStats: [],
  equityCurve: [],
};

const MS_PER_DAY = 86_400_000;

/** Dart's DateTime.weekday numbering: Monday = 1 … Sunday = 7. */
function dartWeekday(date: Date): number {
  const js = date.getDay(); // Sunday = 0 … Saturday = 6
  return js === 0 ? 7 : js;
}

/**
 * EGX trades Sunday–Thursday, so weeks bucket from SATURDAY rather than the
 * ISO Monday — otherwise one trading week splits across two buckets.
 */
function startOfWeek(date: Date): Date {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (dartWeekday(day) + 1) % 7;
  day.setDate(day.getDate() - offset);
  return day;
}

/** Whole days between two dates, ignoring the time of day. */
function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / MS_PER_DAY);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function extremeOf(
  totals: Map<number, number>,
  highest: boolean
): { key: number; value: number } | null {
  let result: { key: number; value: number } | null = null;
  for (const [key, value] of totals) {
    if (
      result === null ||
      (highest ? value > result.value : value < result.value) ||
      // Lowest key wins a tie, so the answer never depends on map order.
      (value === result.value && key < result.key)
    ) {
      result = { key, value };
    }
  }
  return result;
}

type Accumulator = { total: number; count: number; wins: number };

function rank(totals: Map<string, Accumulator>): TagStat[] {
  return [...totals.entries()]
    .map(([tag, a]) => ({
      tag,
      totalPnl: a.total,
      tradeCount: a.count,
      winCount: a.wins,
    }))
    .sort((a, b) =>
      // Most profitable first; alphabetical tie-break keeps the order stable.
      b.totalPnl !== a.totalPnl
        ? b.totalPnl - a.totalPnl
        : a.tag.localeCompare(b.tag)
    );
}

/**
 * @param capital Pass 0 when unknown. The equity curve then starts at zero and
 *   reads as cumulative P&L, and every capital-relative figure stays null
 *   rather than being computed against a guess.
 */
export function analyse(
  trades: Trade[],
  capital: number,
  checklistCompletion: (ids: string[]) => number
): Analytics {
  const executed: Trade[] = [];
  const closed: Trade[] = [];

  let openCount = 0;
  let plannedCount = 0;
  let cancelledCount = 0;
  let checklistSum = 0;
  let checklistCount = 0;

  for (const trade of trades) {
    if (trade.completedChecklistItems.length > 0) {
      checklistSum += checklistCompletion(trade.completedChecklistItems);
      checklistCount++;
    }

    if (trade.status === 'planned') {
      plannedCount++;
      continue;
    }
    if (trade.status === 'cancelled') {
      cancelledCount++;
      continue;
    }

    executed.push(trade);

    // Mirrors the Dart condition exactly: a trade counts as closed when it has
    // BOTH exit fields, whatever its status label says. One marked closed but
    // missing its exit is counted as still open rather than dropped from every
    // total.
    if (trade.exitPrice !== null && trade.exitDate !== null) {
      closed.push(trade);
    } else {
      openCount++;
    }
  }

  const averageChecklistCompletion =
    checklistCount === 0 ? null : checklistSum / checklistCount;

  if (executed.length === 0) {
    return {
      ...EMPTY_ANALYTICS,
      plannedCount,
      cancelledCount,
      averageChecklistCompletion,
    };
  }

  closed.sort((a, b) => {
    const byDate = a.exitDate!.getTime() - b.exitDate!.getTime();
    return byDate !== 0 ? byDate : a.id.localeCompare(b.id);
  });

  // ---- one pass over executed trades
  let positionValueSum = 0;
  const tickerCounts = new Map<string, number>();

  for (const trade of executed) {
    positionValueSum += metricsOf(trade, capital).positionValue;
    const ticker = trade.ticker.trim();
    if (ticker) tickerCounts.set(ticker, (tickerCounts.get(ticker) ?? 0) + 1);
  }

  // ---- one pass over closed trades
  let holdingDaysSum = 0;
  let holdingDaysCount = 0;
  let grossProfit = 0;
  let grossLoss = 0; // signed, stays <= 0
  let winSum = 0;
  let winCount = 0;
  let lossSum = 0;
  let lossCount = 0;
  let breakevenCount = 0;
  let totalPnl = 0;
  let winStreak = 0;
  let lossStreak = 0;
  let longestWinStreak = 0;
  let longestLossStreak = 0;

  const rValues: number[] = [];
  const byWeekday = new Map<number, number>();
  const byMonth = new Map<number, number>();
  const byMonthBucket = new Map<number, { start: Date } & Accumulator>();
  const byWeekBucket = new Map<number, { start: Date } & Accumulator>();
  const tagTotals = new Map<string, Accumulator>();
  const sourceTotals = new Map<string, Accumulator>();

  let best: TradeExtreme | null = null;
  let worst: TradeExtreme | null = null;

  const equityCurve: EquityPoint[] = [];
  if (closed.length > 0) {
    equityCurve.push({ date: closed[0].exitDate!, equity: capital });
  }

  for (const trade of closed) {
    const { pnl, rMultiple } = metricsOf(trade, capital);
    if (pnl === null) continue;
    const exitDate = trade.exitDate!;

    totalPnl += pnl;

    // Bad data (an exit dated before the entry) would otherwise pull the
    // average holding period negative.
    const heldDays = daysBetween(trade.entryDate, exitDate);
    if (heldDays >= 0) {
      holdingDaysSum += heldDays;
      holdingDaysCount++;
    }

    if (pnl > 0) {
      grossProfit += pnl;
      winSum += pnl;
      winCount++;
      winStreak++;
      lossStreak = 0;
    } else if (pnl < 0) {
      grossLoss += pnl;
      lossSum += pnl;
      lossCount++;
      lossStreak++;
      winStreak = 0;
    } else {
      // A scratch trade is neither a win nor a loss, so it ends both runs.
      breakevenCount++;
      winStreak = 0;
      lossStreak = 0;
    }
    if (winStreak > longestWinStreak) longestWinStreak = winStreak;
    if (lossStreak > longestLossStreak) longestLossStreak = lossStreak;

    if (best === null || pnl > best.pnl) {
      best = { tradeId: trade.id, ticker: trade.ticker, pnl, exitDate };
    }
    if (worst === null || pnl < worst.pnl) {
      worst = { tradeId: trade.id, ticker: trade.ticker, pnl, exitDate };
    }

    if (rMultiple !== null) rValues.push(rMultiple);

    const wd = dartWeekday(exitDate);
    byWeekday.set(wd, (byWeekday.get(wd) ?? 0) + pnl);
    const mo = exitDate.getMonth() + 1;
    byMonth.set(mo, (byMonth.get(mo) ?? 0) + pnl);

    const monthStart = new Date(exitDate.getFullYear(), exitDate.getMonth(), 1);
    bucket(byMonthBucket, monthStart, pnl);
    bucket(byWeekBucket, startOfWeek(exitDate), pnl);

    // A trade with several tags contributes to each, so tag totals deliberately
    // sum to more than the journal's own total.
    for (const tag of new Set(trade.tags.map((t) => t.trim()))) {
      if (!tag) continue;
      add(tagTotals, tag, pnl);
    }

    const source = trade.source?.trim();
    if (source) add(sourceTotals, source, pnl);
  }

  const closedCount = closed.length;

  let mostTradedTicker: string | null = null;
  let mostTradedTickerCount = 0;
  for (const [ticker, count] of tickerCounts) {
    if (
      count > mostTradedTickerCount ||
      (count === mostTradedTickerCount &&
        mostTradedTicker !== null &&
        ticker.localeCompare(mostTradedTicker) < 0)
    ) {
      mostTradedTicker = ticker;
      mostTradedTickerCount = count;
    }
  }

  const weekdayBest = extremeOf(byWeekday, true);
  const weekdayWorst = extremeOf(byWeekday, false);
  const monthBest = extremeOf(byMonth, true);
  const monthWorst = extremeOf(byMonth, false);

  let running = capital;
  for (const trade of closed) {
    const { pnl } = metricsOf(trade, capital);
    if (pnl === null) continue;
    running += pnl;
    equityCurve.push({ date: trade.exitDate!, equity: running });
  }

  return {
    closedCount,
    openCount,
    plannedCount,
    cancelledCount,
    winCount,
    lossCount,
    breakevenCount,
    totalPnl,
    winRate: closedCount === 0 ? null : winCount / closedCount,
    expectancy: closedCount === 0 ? null : totalPnl / closedCount,
    profitFactor: grossLoss === 0 ? null : grossProfit / Math.abs(grossLoss),
    averageR:
      rValues.length === 0
        ? null
        : rValues.reduce((a, b) => a + b, 0) / rValues.length,
    medianR: median(rValues),
    averageProfit: winCount === 0 ? null : winSum / winCount,
    averageLoss: lossCount === 0 ? null : lossSum / lossCount,
    largestGain: best !== null && best.pnl > 0 ? best.pnl : null,
    largestLoss: worst !== null && worst.pnl < 0 ? worst.pnl : null,
    longestWinStreak,
    longestLossStreak,
    averageHoldingDays:
      holdingDaysCount === 0 ? null : holdingDaysSum / holdingDaysCount,
    averagePositionValue:
      executed.length === 0 ? null : positionValueSum / executed.length,
    averageChecklistCompletion,
    mostTradedTicker,
    mostTradedTickerCount,
    bestTrade: best,
    worstTrade: worst,
    bestWeekday: weekdayBest?.key ?? null,
    bestWeekdayPnl: weekdayBest?.value ?? null,
    worstWeekday: weekdayWorst?.key ?? null,
    worstWeekdayPnl: weekdayWorst?.value ?? null,
    bestMonth: monthBest?.key ?? null,
    bestMonthPnl: monthBest?.value ?? null,
    worstMonth: monthWorst?.key ?? null,
    worstMonthPnl: monthWorst?.value ?? null,
    monthlyPnl: toPeriods(byMonthBucket),
    weeklyPnl: toPeriods(byWeekBucket),
    tagStats: rank(tagTotals),
    sourceStats: rank(sourceTotals),
    equityCurve,
  };
}

function add(map: Map<string, Accumulator>, key: string, pnl: number) {
  const a = map.get(key) ?? { total: 0, count: 0, wins: 0 };
  a.total += pnl;
  a.count++;
  if (pnl > 0) a.wins++;
  map.set(key, a);
}

function bucket(
  map: Map<number, { start: Date } & Accumulator>,
  start: Date,
  pnl: number
) {
  const key = start.getTime();
  const b = map.get(key) ?? { start, total: 0, count: 0, wins: 0 };
  b.total += pnl;
  b.count++;
  if (pnl > 0) b.wins++;
  map.set(key, b);
}

function toPeriods(map: Map<number, { start: Date } & Accumulator>): PeriodPnl[] {
  return [...map.values()]
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map((b) => ({ start: b.start, pnl: b.total, tradeCount: b.count }));
}

/** Dart weekday (1 = Monday) to the Arabic name. */
export const WEEKDAY_NAMES: Record<number, string> = {
  1: 'الاتنين',
  2: 'التلات',
  3: 'الأربع',
  4: 'الخميس',
  5: 'الجمعة',
  6: 'السبت',
  7: 'الحد',
};

export const MONTH_NAMES: Record<number, string> = {
  1: 'يناير',
  2: 'فبراير',
  3: 'مارس',
  4: 'أبريل',
  5: 'مايو',
  6: 'يونيو',
  7: 'يوليو',
  8: 'أغسطس',
  9: 'سبتمبر',
  10: 'أكتوبر',
  11: 'نوفمبر',
  12: 'ديسمبر',
};
