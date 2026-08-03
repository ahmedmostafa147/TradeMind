/**
 * A faithful port of lib/core/calc/daily_decisions.dart.
 *
 * `today` is injected rather than read from the clock, for the same reason the
 * Dart version injects it: the day-threshold rules are only testable when the
 * date is an argument.
 *
 * The web has no timeline data — the trade form does not write one and
 * decodeTrade does not read one — so "last touch" falls back to the entry date
 * everywhere here. That is exactly what the Dart version does for a trade with
 * an empty timeline, so the rule is the same rule; it just fires on more trades
 * until the browser can add timeline entries too.
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

const hasLesson = (trade: Trade) => (trade.notes ?? '').trim().length > 0;

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
      // No timeline on the web, so last touch is the entry date.
      daysSinceUpdate: daysSinceEntry,
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
