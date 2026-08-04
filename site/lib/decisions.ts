/**
 * A faithful port of lib/core/calc/daily_decisions.dart.
 *
 * `today` is injected rather than read from the clock, for the same reason the
 * Dart version injects it: the day-threshold rules are only testable when the
 * date is an argument.
 *
 * "Last touch" is the newest timeline entry, falling back to the entry date —
 * the same rule as the Dart version, on the same data. It used to be the entry
 * date unconditionally, because the browser neither read nor wrote a timeline,
 * which meant «محتاجة ملاحظة» fired on every open position older than a week
 * even when the phone had logged an update that morning.
 */

import { exceedsRiskLimit, safeDiv } from '@/lib/risk-math';
import { metricsOf, type Trade, type TradeMetrics } from '@/lib/trade';

export const STALE_NOTE_DAYS = 7;
export const RECENTLY_CLOSED_DAYS = 7;

export type DecisionItem = {
  trade: Trade;
  metrics: TradeMetrics;
  /** Whole days since entry. Never negative. */
  daysSinceEntry: number;
  daysSinceUpdate: number;
  overRisk: boolean;
};

export type DailyDecisions = {
  /** Risk above the configured limit — the only category that means "you are
   *  breaking your own rule right now", so it renders first. */
  overRisk: DecisionItem[];
  open: DecisionItem[];
  planned: DecisionItem[];
  /**
   * Trades that want a written note.
   *
   * Deliberately NOT "anything untouched for 7 days" — that would keep every
   * finished, fully-documented trade on the list forever and bury the day's
   * actual work. Two cases only: an open position with no update in
   * STALE_NOTE_DAYS, or a trade closed within RECENTLY_CLOSED_DAYS that still
   * has no lesson. Writing the note removes it, which is the point.
   */
  needsReview: DecisionItem[];
  waitingTooLong: DecisionItem[];
  recentlyClosed: DecisionItem[];
  /** True when there is genuinely nothing to act on. `recentlyClosed` does not
   *  count — a closed trade with its lesson written is a record, not a task. */
  isEmpty: boolean;
};

/** Whole days from `from` to `to`, floored at zero.
 *
 *  Clamped because a future-dated entry would otherwise produce a negative age
 *  and quietly drop the trade out of every threshold comparison. */
function daysBetween(from: Date, to: Date): number {
  const start = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const end = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  const days = Math.round((end - start) / 86_400_000);
  return days < 0 ? 0 : days;
}

/** Matches DailyDecisions._hasLesson: a written lesson OR any timeline entry.
 *  A trade whose life is logged has been reviewed, whether or not the single
 *  `notes` field was used for it. */
const hasLesson = (trade: Trade) =>
  (trade.notes ?? '').trim().length > 0 || trade.timeline.length > 0;

/** The newest timeline entry, or the entry date when there are none — a port of
 *  DailyDecisions._lastTouch. */
function lastTouch(trade: Trade): Date {
  let latest = trade.entryDate;
  for (const entry of trade.timeline) {
    if (entry.date.getTime() > latest.getTime()) latest = entry.date;
  }
  return latest;
}

export function decisionsOf(
  trades: Trade[],
  {
    capital,
    maxRiskPercent,
    today,
    waitingThresholdDays,
  }: {
    capital: number;
    maxRiskPercent: number;
    today: Date;
    waitingThresholdDays: number;
  }
): DailyDecisions {
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const overRisk: DecisionItem[] = [];
  const open: DecisionItem[] = [];
  const planned: DecisionItem[] = [];
  const needsReview: DecisionItem[] = [];
  const waitingTooLong: DecisionItem[] = [];
  const recentlyClosed: DecisionItem[] = [];

  for (const trade of trades) {
    const metrics = metricsOf(trade, capital);
    const riskPct = safeDiv(
      (trade.entryPrice - trade.stopPrice) * trade.quantity,
      capital
    );
    const isOverRisk =
      riskPct !== null && exceedsRiskLimit(riskPct, maxRiskPercent);

    const daysSinceEntry = daysBetween(trade.entryDate, day);
    const item: DecisionItem = {
      trade,
      metrics,
      daysSinceEntry,
      daysSinceUpdate: daysBetween(lastTouch(trade), day),
      overRisk: isOverRisk,
    };

    const treatAsOpen = () => {
      open.push(item);
      if (isOverRisk) overRisk.push(item);
      if (item.daysSinceUpdate >= STALE_NOTE_DAYS) needsReview.push(item);
      if (daysSinceEntry > waitingThresholdDays) waitingTooLong.push(item);
    };

    switch (trade.status) {
      case 'planned':
        planned.push(item);
        // A planned idea can still be sized past the limit — flag it before the
        // money is committed, which is the whole point of the app.
        if (isOverRisk) overRisk.push(item);
        break;

      case 'cancelled':
        // Abandoned. Never an action item.
        break;

      case 'open':
        treatAsOpen();
        break;

      case 'closed': {
        // Guard the same inconsistency the analytics handle: marked closed but
        // missing its exit. Treat it as still open rather than silently
        // dropping it from every section.
        if (trade.exitDate === null || trade.exitPrice === null) {
          treatAsOpen();
          break;
        }
        const daysSinceExit = daysBetween(trade.exitDate, day);
        if (daysSinceExit <= RECENTLY_CLOSED_DAYS) {
          recentlyClosed.push(item);
          if (!hasLesson(trade)) needsReview.push(item);
        }
        break;
      }
    }
  }

  const riskOf = (i: DecisionItem) =>
    safeDiv((i.trade.entryPrice - i.trade.stopPrice) * i.trade.quantity, capital) ??
    0;

  // Highest risk first — the worst breach is the most urgent.
  overRisk.sort((a, b) => riskOf(b) - riskOf(a));
  // Oldest first: a position held longest has waited longest for a decision.
  open.sort((a, b) => b.daysSinceEntry - a.daysSinceEntry);
  planned.sort((a, b) => a.daysSinceEntry - b.daysSinceEntry);
  needsReview.sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);
  waitingTooLong.sort((a, b) => b.daysSinceEntry - a.daysSinceEntry);
  recentlyClosed.sort(
    (a, b) => b.trade.exitDate!.getTime() - a.trade.exitDate!.getTime()
  );

  return {
    overRisk,
    open,
    planned,
    needsReview,
    waitingTooLong,
    recentlyClosed,
    isEmpty:
      overRisk.length === 0 &&
      open.length === 0 &&
      planned.length === 0 &&
      needsReview.length === 0 &&
      waitingTooLong.length === 0,
  };
}
