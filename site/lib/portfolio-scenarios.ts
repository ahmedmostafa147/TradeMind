import { roundToPiastre } from '@/lib/risk-math';
import type { Trade } from '@/lib/trade';

/**
 * Best and worst case across the open book, plus the one-winner breakdown.
 *
 * MIRROR OF lib/core/calc/portfolio_scenarios.dart, per CLAUDE.md §5 — same
 * fallbacks, same guards, same tie-break. The app has had this and the web has
 * not, which was the last feature gap between the two surfaces.
 *
 * The question it answers is the one a trader with four open positions actually
 * has: if this goes badly, how badly — and is a single winner enough to carry
 * the rest?
 */

/**
 * Applied only to open trades carrying no usable target or stop of their own.
 *
 * These are the app's `Settings.fallbackTakeProfitPercent` and
 * `fallbackStopLossPercent`. THE APP LETS THE USER CHANGE THEM AND THE WEB DOES
 * NOT: `users/{uid}/settings/risk` carries capital, the risk ceiling and the
 * waiting threshold, and nothing else, so there is no synced value to read
 * here. Hardcoding the same defaults keeps the two surfaces agreeing for
 * everybody who never changed them, and is honestly wrong only for someone who
 * did — which is the smaller error, and the one that disappears the day those
 * two fields join the settings document.
 */
export const FALLBACK_TAKE_PROFIT_PERCENT = 0.05;
export const FALLBACK_STOP_LOSS_PERCENT = 0.02;

export type OneWinnerOutcome = {
  tradeId: string;
  ticker: string;
  /** This trade's profit at target, minus every other open trade's loss at stop. */
  net: number;
};

export type PortfolioScenarios = {
  openCount: number;
  /** Every open trade reaches its target. Null when nothing is open. */
  totalExpectedProfit: number | null;
  /** Every open trade is stopped out. Negative. Null when nothing is open. */
  totalExpectedLoss: number | null;
  /** One outcome per open trade, best first. */
  oneWinner: OneWinnerOutcome[];
};

export const EMPTY_SCENARIOS: PortfolioScenarios = {
  openCount: 0,
  totalExpectedProfit: null,
  totalExpectedLoss: null,
  oneWinner: [],
};

/** Only meaningful with more than one position open. */
export function hasOneWinnerAnalysis(scenarios: PortfolioScenarios): boolean {
  return scenarios.oneWinner.length > 1;
}

/** True when a single winner leaves the book in profit — the whole question. */
export function coversTheRest(outcome: OneWinnerOutcome): boolean {
  return outcome.net > 0;
}

const finite = (value: number): number => (Number.isFinite(value) ? value : 0);

/**
 * The trade's own target, falling back to the default applied to its entry.
 *
 * A stored value counts only when it sits ABOVE entry — below it is not a
 * target, it is a typo or an imported field that meant something else.
 */
function targetOf(trade: Trade, defaultPercent: number): number | null {
  const stored = trade.takeProfitPrice;
  if (stored !== null && Number.isFinite(stored) && stored > trade.entryPrice) {
    return stored;
  }
  if (!Number.isFinite(defaultPercent) || defaultPercent <= 0) return null;
  return roundToPiastre(trade.entryPrice * (1 + defaultPercent));
}

/**
 * The trade's own stop, falling back to the default below its entry.
 *
 * THE MIRROR OF targetOf, AND IT HAS TO BE. For a while only the profit side
 * had a fallback and the loss side trusted `stopPrice` verbatim, which produced
 * two wrong answers on a trade whose stop was never set properly: a stop of 0
 * (a recommendation imported without one) made the loss the entire position, so
 * "if every trade loses" read as a wipeout; and a stop above entry produced a
 * POSITIVE number, printing a profit on the line labelled as a loss.
 */
function stopOf(trade: Trade, defaultPercent: number): number | null {
  const stored = trade.stopPrice;
  if (Number.isFinite(stored) && stored > 0 && stored < trade.entryPrice) {
    return stored;
  }
  if (!Number.isFinite(defaultPercent) || defaultPercent <= 0) return null;
  const fallback = roundToPiastre(trade.entryPrice * (1 - defaultPercent));
  if (fallback === null || fallback <= 0) return null;
  return fallback;
}

export function portfolioScenarios(
  trades: Trade[],
  {
    defaultTakeProfitPercent = FALLBACK_TAKE_PROFIT_PERCENT,
    defaultStopLossPercent = FALLBACK_STOP_LOSS_PERCENT,
  }: {
    defaultTakeProfitPercent?: number;
    defaultStopLossPercent?: number;
  } = {}
): PortfolioScenarios {
  const open = trades.filter((t) => t.status === 'open' && t.quantity > 0);
  if (open.length === 0) return EMPTY_SCENARIOS;

  const profits: number[] = [];
  const losses: number[] = [];
  let totalProfit = 0;
  let totalLoss = 0;

  for (const trade of open) {
    const target = targetOf(trade, defaultTakeProfitPercent);
    const profit =
      target === null ? 0 : finite((target - trade.entryPrice) * trade.quantity);

    // Negative: a stop below entry produces a loss. Zero when the trade has no
    // usable stop and no default to fall back on, so it contributes nothing
    // rather than a fabricated number.
    const stop = stopOf(trade, defaultStopLossPercent);
    const loss =
      stop === null ? 0 : finite((stop - trade.entryPrice) * trade.quantity);

    profits.push(profit);
    losses.push(loss);
    totalProfit += profit;
    totalLoss += loss;
  }

  const oneWinner: OneWinnerOutcome[] = open
    .map((trade, i) => ({
      tradeId: trade.id,
      ticker: trade.ticker,
      // This one wins; every other one is stopped out. Subtracting its own loss
      // from the total is what removes it from the losing set.
      net: profits[i] + (totalLoss - losses[i]),
    }))
    .sort((a, b) => {
      const byNet = b.net - a.net;
      // Ticker tie-break keeps the order stable across renders — equal nets are
      // common, and JS sort stability is not something to lean on across
      // engines for a list the user watches change.
      return byNet !== 0 ? byNet : a.ticker.localeCompare(b.ticker);
    });

  return {
    openCount: open.length,
    totalExpectedProfit: totalProfit,
    totalExpectedLoss: totalLoss,
    oneWinner,
  };
}
