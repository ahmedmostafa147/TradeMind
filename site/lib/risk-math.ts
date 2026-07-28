/**
 * A faithful port of the app's lib/core/calc/risk_math.dart.
 *
 * The calculator on the landing page runs the SAME arithmetic the app runs,
 * including both epsilons. Re-deriving it "close enough" for a marketing
 * widget would be the worst possible place to differ: a visitor who checks the
 * number against the installed app and finds a different answer has learned
 * that one of them is lying, and has no way to tell which.
 *
 * Every function is total — it returns null for nonsensical input and never
 * throws, because it is called on every keystroke against a half-typed field.
 */

/**
 * Tolerance applied before the floor in {@link suggestedQuantity}.
 *
 * Without it: entry 1.10, stop 1.00 gives 1.10 - 1.00 = 0.10000000000000009,
 * so 100 / 0.1 computes as 999.9999999999991 and floors to 999 instead of
 * 1000. The bug is invisible to any test using round numbers like 10.00/9.50,
 * whose difference (0.5) is a power of two and therefore exact.
 */
export const QTY_EPSILON = 1e-9;

/**
 * Slack in the strictly-greater risk-limit comparison.
 *
 * Paired with {@link QTY_EPSILON} and useless without it. Once the floor
 * epsilon is in place the suggested quantity can produce a risk a few ulps
 * ABOVE the limit, and a bare `>` would flag the very position this calculator
 * just recommended.
 */
export const RISK_EPSILON = 1e-9;

/** Division that returns null instead of Infinity or NaN. */
export function safeDiv(a: number, b: number): number | null {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  const result = a / b;
  return Number.isFinite(result) ? result : null;
}

/** Maximum loss allowed on a single trade, in EGP. 0 means "no position". */
export function maxLossPerTrade(capital: number, maxRiskPercent: number): number {
  if (!Number.isFinite(capital) || !Number.isFinite(maxRiskPercent)) return 0;
  if (capital <= 0 || maxRiskPercent <= 0) return 0;
  const value = capital * maxRiskPercent;
  return Number.isFinite(value) ? value : 0;
}

/**
 * Largest share count whose risk stays within `maxLoss`.
 *
 * Null when the inputs cannot yield an answer (entry <= stop, or no usable
 * budget). Zero is a real answer — capital too small for this stop distance —
 * and callers should say so rather than render a bare 0, which reads as a bug.
 */
export function suggestedQuantity(
  maxLoss: number,
  entry: number,
  stop: number
): number | null {
  if (!Number.isFinite(entry) || !Number.isFinite(stop) || !Number.isFinite(maxLoss)) {
    return null;
  }
  if (maxLoss <= 0) return null;

  const riskPerShare = entry - stop;
  if (riskPerShare <= 0) return null;

  const raw = safeDiv(maxLoss, riskPerShare);
  if (raw === null) return null;

  const quantity = Math.floor(raw + QTY_EPSILON);
  return quantity > 0 ? quantity : 0;
}

/**
 * The ONLY place a risk ratio may be compared against the limit.
 *
 * Never write `riskPct > maxRiskPercent` inline — a position sized exactly at
 * the limit must not flag, and a bare `>` breaks that for most real price
 * pairs.
 */
export function exceedsRiskLimit(riskPct: number, maxRiskPercent: number): boolean {
  if (!Number.isFinite(riskPct) || !Number.isFinite(maxRiskPercent)) return false;
  return riskPct - maxRiskPercent > RISK_EPSILON;
}

const ARABIC_INDIC_ZERO = 0x0660;

/** Arabic keyboards emit ٠-٩, which Number() rejects. Ported from formatters.dart. */
export function toWesternDigits(input: string): string {
  let out = '';
  for (const ch of input) {
    const code = ch.codePointAt(0)!;
    if (code >= ARABIC_INDIC_ZERO && code <= ARABIC_INDIC_ZERO + 9) {
      out += String(code - ARABIC_INDIC_ZERO);
    } else {
      out += ch;
    }
  }
  return out;
}

/** Parses user input that may contain Arabic-Indic digits or thousands commas. */
export function parseNumber(input: string): number | null {
  const normalised = toWesternDigits(input).replace(/,/g, '').trim();
  if (normalised === '') return null;
  const value = Number(normalised);
  return Number.isFinite(value) ? value : null;
}
