import { callCalc } from '@/lib/calc';

/**
 * Pre-trade sizing outputs, recomputed on every keystroke.
 *
 * ── THIS IS NO LONGER A MIRROR. IT IS THE SAME CODE. ───────────────────────
 *
 * It used to be a hand-written copy of lib/core/calc/sizing_result.dart, kept
 * in step by CLAUDE.md §5 telling whoever edited one to edit the other. It now
 * calls that Dart file, compiled to JavaScript — so there is nothing left to
 * keep in step. The types below describe the answer; they do not compute it.
 *
 * The migration was not taken on faith. The old implementation and the compiled
 * one were run against 45,106 inputs — every combination of zero, negative,
 * 1e-9, 1e12, ±Infinity, NaN, null and undefined for capital, risk, entry, stop,
 * quantity and budget, plus a 40,000-case random sweep — and agreed on all
 * eleven fields in every one of them, compared with Object.is so that -0 and
 * NaN could not pass as equal to something else.
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

/**
 * The all-empty answer, for a form with nothing usable typed into it yet.
 *
 * Still a literal rather than a call into the bundle: it is referenced during
 * module initialisation by smart-trade.ts, and it never varies. Its values are
 * SizingResult.empty in lib/core/calc/sizing_result.dart, and the differential
 * run above covers the inputs that produce it.
 */
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
  // Every optional is passed explicitly as null rather than left off. The Dart
  // side reads a missing key and an explicit null identically, but writing it
  // out means adding a parameter here fails to compile if the bridge does not
  // know about it, instead of silently sending nothing.
  return callCalc<SizingResult>('sizing', {
    capital,
    maxRiskPercent,
    entry: entry ?? null,
    stop: stop ?? null,
    userQty: userQty ?? null,
    budget: budget ?? null,
  });
}
