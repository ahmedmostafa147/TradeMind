import {
  exceedsRiskLimit,
  maxLossPerTrade,
  safeDiv,
  suggestedQuantity,
} from '@/lib/risk-math';

/**
 * Pre-trade sizing outputs, recomputed on every keystroke.
 *
 * MIRROR OF lib/core/calc/sizing_result.dart, per CLAUDE.md §5.
 *
 * Deliberately tolerant of partial input: it is called against half-typed
 * fields, so every field is nullable and nothing throws.
 */
export type SizingResult = {
  /** Loss budget from settings. 0 when capital or the risk rule is unusable. */
  maxLoss: number;
  /** Risk per share (entry − stop). Null until both prices are valid. */
  riskPerShare: number | null;
  /** Null when entry <= stop or the prices are incomplete. */
  suggestedQty: number | null;
  /**
   * The quantity the rest of the outputs are based on: the user's own quantity
   * when they typed one, otherwise the suggestion.
   */
  effectiveQty: number | null;
  positionValue: number | null;
  riskEgp: number | null;
  riskPct: number | null;
  /** Always false when riskPct is null — an unknown risk is not a breach. */
  overRisk: boolean;
  /**
   * True when the loss budget cannot fund even one share at this stop distance.
   * Distinct from "no answer" so the UI can explain rather than show a bare 0.
   */
  capitalTooSmall: boolean;
  /**
   * True when the quantity was cut down to fit the money the trader is actually
   * putting in, rather than by the risk rule.
   */
  limitedByBudget: boolean;
  /** The cash cap that produced limitedByBudget, when one was given. */
  budget: number | null;
};

export const EMPTY_SIZING: SizingResult = {
  maxLoss: 0,
  riskPerShare: null,
  suggestedQty: null,
  effectiveQty: null,
  positionValue: null,
  riskEgp: null,
  riskPct: null,
  overRisk: false,
  capitalTooSmall: false,
  limitedByBudget: false,
  budget: null,
};

const positiveOrNull = (v: number | null | undefined): number | null =>
  v != null && Number.isFinite(v) && v > 0 ? v : null;

export function computeSizing({
  capital,
  maxRiskPercent,
  entry,
  stop,
  userQty,
  budget,
}: {
  capital: number;
  maxRiskPercent: number;
  entry?: number | null;
  stop?: number | null;
  userQty?: number | null;
  /**
   * Cash the trader is willing to commit to THIS position, which is usually far
   * less than their whole capital. The risk rule alone sizes as if the entire
   * account backs every trade; this caps the suggestion at what they are
   * actually spending. The risk limit still applies — whichever of the two
   * allows fewer shares wins.
   */
  budget?: number | null;
}): SizingResult {
  const maxLoss = maxLossPerTrade(capital, maxRiskPercent);

  const validEntry = positiveOrNull(entry);
  const validStop = positiveOrNull(stop);

  const riskPerShare =
    validEntry !== null && validStop !== null && validEntry > validStop
      ? validEntry - validStop
      : null;

  const riskQty =
    validEntry !== null && validStop !== null
      ? suggestedQuantity(maxLoss, validEntry, validStop)
      : null;

  const validBudget = positiveOrNull(budget);

  // How many whole shares the cash actually buys.
  const budgetQty =
    validBudget !== null && validEntry !== null
      ? Math.floor(validBudget / validEntry)
      : null;

  // The tighter of the two constraints, so neither the risk rule nor the wallet
  // is ever exceeded.
  const suggested =
    riskQty !== null && budgetQty !== null
      ? Math.min(budgetQty, riskQty)
      : (riskQty ?? budgetQty);

  const limitedByBudget =
    riskQty !== null && budgetQty !== null && budgetQty < riskQty;

  const effectiveQty =
    userQty != null && userQty > 0 ? userQty : suggested;

  let positionValue: number | null = null;
  let riskEgp: number | null = null;
  let riskPct: number | null = null;

  if (validEntry !== null && effectiveQty !== null && effectiveQty > 0) {
    positionValue = validEntry * effectiveQty;
    if (!Number.isFinite(positionValue)) positionValue = null;

    if (riskPerShare !== null) {
      riskEgp = riskPerShare * effectiveQty;
      if (!Number.isFinite(riskEgp)) {
        riskEgp = null;
      } else {
        riskPct = safeDiv(riskEgp, capital);
      }
    }
  }

  return {
    maxLoss,
    riskPerShare,
    suggestedQty: suggested,
    effectiveQty,
    positionValue,
    riskEgp,
    riskPct,
    overRisk: riskPct !== null && exceedsRiskLimit(riskPct, maxRiskPercent),
    // Only a risk-budget shortfall counts: a budget too small for one share is
    // the trader's own cap, not an "account too small" problem.
    capitalTooSmall: riskQty === 0,
    limitedByBudget,
    budget: validBudget,
  };
}
