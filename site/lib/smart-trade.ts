import { meetsRatio, roundToPiastre, safeDiv } from '@/lib/risk-math';
import { computeSizing, EMPTY_SIZING, type SizingResult } from '@/lib/sizing';

/**
 * Turns "entry price + a target + a stop" into a complete, sized trade.
 *
 * MIRROR OF lib/core/calc/smart_trade.dart, per CLAUDE.md §5.
 *
 * WHY THIS FILE EXISTS AT ALL. The calculator had its own arithmetic inlined
 * in a React hook, written before this shared layer did, and never moved onto
 * it. It floored the share count with a bare `Math.floor(budget / risk)`
 * instead of calling `suggestedQuantity`, so entry 1.10 against stop 1.00 at
 * 10,000 × 1% answered 999 in the browser and 1000 on the phone — the exact
 * float bug `risk_math.dart` carries an epsilon for, and that the app pins with
 * an acceptance test. Same stock, same inputs, two different answers, and no
 * way for the user to tell which one was lying.
 *
 * Like the Dart original it re-derives no position sizing: that is delegated to
 * {@link computeSizing} so there is exactly one implementation of the risk rule.
 */

/** How well the reward compensates the risk. */
export type TradeQuality = 'good' | 'warning' | 'bad';

/** Mirrors `TradeQuality.plainLabel` — the emoji-free form, since the site
 *  draws its own icons (see the note at the top of components/icons.tsx). */
export const QUALITY_LABEL: Record<TradeQuality, string> = {
  good: 'صفقة جيدة',
  warning: 'المخاطرة مرتفعة',
  bad: 'العائد لا يبرر المخاطرة',
};

export type SmartTradePlan = {
  entryPrice: number | null;
  /** Fractions, not percents: 0.05 is 5%. */
  takeProfitPercent: number;
  stopLossPercent: number;
  /** Rounded to the piastre. These exact values feed everything below. */
  takeProfitPrice: number | null;
  stopLossPrice: number | null;
  rewardPerShare: number | null;
  riskPerShare: number | null;
  /** Reward ÷ risk. Null until both prices are known. */
  rewardRiskRatio: number | null;
  quality: TradeQuality | null;
  sizing: SizingResult;
  expectedProfit: number | null;
  /** Negative, so it reads as a loss and sums correctly with profits. */
  expectedLoss: number | null;
  /**
   * Reward STRICTLY greater than risk. Same guarded shape as
   * `exceedsRiskLimit` — a ratio of exactly 1 is not a win, and rounding noise
   * must not make it look like one.
   */
  rewardBeatsRisk: boolean;
  /** The typed stop is at or above the entry — a position that cannot exist. */
  invertedStop: boolean;
  /** The typed target is at or below the entry. */
  invertedTarget: boolean;
};

export const EMPTY_PLAN: SmartTradePlan = {
  entryPrice: null,
  takeProfitPercent: 0,
  stopLossPercent: 0,
  takeProfitPrice: null,
  stopLossPrice: null,
  rewardPerShare: null,
  riskPerShare: null,
  rewardRiskRatio: null,
  quality: null,
  sizing: EMPTY_SIZING,
  expectedProfit: null,
  expectedLoss: null,
  rewardBeatsRisk: false,
  invertedStop: false,
  invertedTarget: false,
};

export function computeSmartTrade({
  capital,
  maxRiskPercent,
  takeProfitPercent = 0,
  stopLossPercent = 0,
  entryPrice,
  userQty,
  stopPrice,
  targetPrice,
  budget,
}: {
  capital: number;
  maxRiskPercent: number;
  takeProfitPercent?: number;
  stopLossPercent?: number;
  entryPrice?: number | null;
  userQty?: number | null;
  /**
   * An absolute stop, for the "stop by price" input mode. When given and valid
   * it takes precedence over `stopLossPercent`; the percentage is then derived
   * from it for display, so the two modes stay consistent and the price the
   * trader typed is used exactly rather than round-tripped through a
   * percentage.
   */
  stopPrice?: number | null;
  /** The same escape hatch for the target — traders read resistance as a price. */
  targetPrice?: number | null;
  /** Cash committed to this position. Forwarded to {@link computeSizing}. */
  budget?: number | null;
}): SmartTradePlan {
  const entry =
    entryPrice != null && Number.isFinite(entryPrice) && entryPrice > 0
      ? entryPrice
      : null;

  const typedTarget = usable(targetPrice);
  const typedStop = usable(stopPrice);

  const overrideTarget =
    typedTarget !== null && entry !== null && typedTarget > entry
      ? roundToPiastre(typedTarget)
      : null;

  const validTp =
    overrideTarget !== null && entry !== null
      ? (overrideTarget - entry) / entry
      : Number.isFinite(takeProfitPercent) && takeProfitPercent > 0
        ? takeProfitPercent
        : 0;

  const overrideStop =
    typedStop !== null && entry !== null && typedStop < entry
      ? roundToPiastre(typedStop)
      : null;

  const validSl =
    overrideStop !== null && entry !== null
      ? (entry - overrideStop) / entry
      : Number.isFinite(stopLossPercent) &&
          stopLossPercent > 0 &&
          // A stop at or beyond 100% below entry is meaningless.
          stopLossPercent < 1
        ? stopLossPercent
        : 0;

  let takeProfitPrice = overrideTarget;
  let stopLossPrice = overrideStop;
  if (entry !== null) {
    if (overrideTarget === null && validTp > 0) {
      takeProfitPrice = roundToPiastre(entry * (1 + validTp));
    }
    if (overrideStop === null && validSl > 0) {
      stopLossPrice = roundToPiastre(entry * (1 - validSl));
    }
  }

  // Rounding can collapse a tiny percentage onto the entry price itself — 0.1%
  // of 2.00 rounds straight back to 2.00. That is not a usable level, so it is
  // discarded rather than producing a zero-risk trade.
  if (takeProfitPrice !== null && entry !== null && takeProfitPrice <= entry) {
    takeProfitPrice = null;
  }
  if (stopLossPrice !== null && entry !== null && stopLossPrice >= entry) {
    stopLossPrice = null;
  }

  const rewardPerShare =
    entry !== null && takeProfitPrice !== null ? takeProfitPrice - entry : null;
  const riskPerShare =
    entry !== null && stopLossPrice !== null ? entry - stopLossPrice : null;

  const ratio =
    rewardPerShare !== null && riskPerShare !== null
      ? safeDiv(rewardPerShare, riskPerShare)
      : null;

  const quality: TradeQuality | null =
    ratio === null
      ? null
      : meetsRatio(ratio, 2)
        ? 'good'
        : meetsRatio(ratio, 1)
          ? 'warning'
          : 'bad';

  // Sizing comes from the shared implementation; the derived stop is simply fed
  // in as the stop price.
  const sizing = computeSizing({
    capital,
    maxRiskPercent,
    entry,
    stop: stopLossPrice,
    userQty,
    budget,
  });

  const qty = sizing.effectiveQty;
  let expectedProfit: number | null = null;
  let expectedLoss: number | null = null;
  if (qty !== null && qty > 0) {
    if (rewardPerShare !== null) {
      const value = rewardPerShare * qty;
      expectedProfit = Number.isFinite(value) ? value : null;
    }
    if (riskPerShare !== null) {
      const value = -riskPerShare * qty;
      expectedLoss = Number.isFinite(value) ? value : null;
    }
  }

  return {
    entryPrice: entry,
    takeProfitPercent: validTp,
    stopLossPercent: validSl,
    takeProfitPrice,
    stopLossPrice,
    rewardPerShare,
    riskPerShare,
    rewardRiskRatio: ratio,
    quality,
    sizing,
    expectedProfit,
    expectedLoss,
    rewardBeatsRisk:
      ratio !== null && Number.isFinite(ratio) && ratio - 1 > 1e-9,
    // Reported rather than silently ignored: the typed level was rejected, and
    // a field that swallows what you put in it reads as broken.
    invertedStop: typedStop !== null && entry !== null && typedStop >= entry,
    invertedTarget:
      typedTarget !== null && entry !== null && typedTarget <= entry,
  };
}

function usable(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) && value > 0 ? value : null;
}
