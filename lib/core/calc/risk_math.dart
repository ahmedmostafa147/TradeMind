/// Primitive risk arithmetic. Pure Dart — no Flutter, no Hive, no intl.
///
/// Every function here is *total*: it returns null (or a safe default) for
/// nonsensical input and never throws. That is what makes it safe to call on
/// every keystroke against a half-typed form field.
library;

/// Tolerance applied before the floor in [suggestedQuantity].
///
/// Not arbitrary. The accumulated relative error over this operation chain is a
/// few multiples of 2^-52 (~2.2e-16). For share counts up to ~1e6 — well above
/// anything realistic on EGX — the absolute noise tops out around 1e-9. In the
/// other direction, a *genuine* fractional part here is bounded below by roughly
/// 0.01/maxLoss (prices tick in 0.01), i.e. >= ~1e-6 for any plausible capital.
/// So 1e-9 sits with about three orders of magnitude of clearance on both sides:
/// large enough to swallow representation noise, far too small to bridge a real
/// gap.
///
/// Without it: entry 1.10, stop 1.00 gives 1.10-1.00 = 0.10000000000000009, so
/// 100/0.1 computes as 999.9999999999991 and floors to 999 instead of 1000. The
/// app silently under-sizes by one share on roughly half of all real price
/// pairs, and the bug is invisible to any test using round numbers like
/// 10.00/9.50 (whose difference, 0.5, is a power of two and therefore exact).
const double kQtyEpsilon = 1e-9;

/// Slack in the strictly-greater risk-limit comparison.
///
/// Paired with [kQtyEpsilon] and useless without it. Once the floor epsilon is
/// in place, the suggested quantity can produce a riskEGP a few ulps *above*
/// maxLoss (e.g. 100.00000000000009 against a 100.00 limit). A bare `>` would
/// then flag the app's own suggested position as over-limit — the single most
/// likely user-visible defect in this codebase.
///
/// 1e-9 against a 0.02 limit is a relative tolerance of ~5e-8: about eight
/// orders of magnitude above the noise floor, and eight below anything
/// economically meaningful (1e-9 of 17,000 EGP is 0.000017 EGP).
const double kRiskEpsilon = 1e-9;

/// Division that returns null instead of Infinity or NaN.
///
/// Dart does not throw on double division by zero — `1.0 / 0.0` is Infinity and
/// `0.0 / 0.0` is NaN. Left unguarded, those propagate silently into
/// NumberFormat and into fl_chart, where NaN renders a blank chart or trips an
/// assert far from the actual cause.
double? safeDiv(double a, double b) {
  if (!a.isFinite || !b.isFinite || b == 0) return null;
  final result = a / b;
  return result.isFinite ? result : null;
}

/// Maximum loss allowed on a single trade, in EGP. Returns 0 when the inputs
/// are not usable, so callers can treat it as "no position is permitted".
double maxLossPerTrade({
  required double capital,
  required double maxRiskPercent,
}) {
  if (!capital.isFinite || !maxRiskPercent.isFinite) return 0;
  if (capital <= 0 || maxRiskPercent <= 0) return 0;
  final value = capital * maxRiskPercent;
  return value.isFinite ? value : 0;
}

/// Largest share count whose risk stays within [maxLoss].
///
/// Returns null when the inputs cannot yield an answer (entry <= stop, or no
/// usable loss budget). Returns 0 — a real answer, not an error — when capital
/// is simply too small for the given stop distance; callers should say so
/// explicitly rather than rendering a bare 0, which reads as a bug.
int? suggestedQuantity({
  required double maxLoss,
  required double entry,
  required double stop,
}) {
  if (!entry.isFinite || !stop.isFinite || !maxLoss.isFinite) return null;
  if (maxLoss <= 0) return null;

  final riskPerShare = entry - stop;
  if (riskPerShare <= 0) return null; // entry <= stop

  final raw = safeDiv(maxLoss, riskPerShare);
  if (raw == null) return null;

  final quantity = (raw + kQtyEpsilon).floor();
  return quantity > 0 ? quantity : 0;
}

/// EGX quotes move in whole piastres, so every derived price is rounded to two
/// decimals — and the rounded value is what every later calculation uses, so
/// the numbers on screen are the numbers that were actually computed.
///
/// Returns null rather than NaN for unusable input.
double? roundToPiastre(double value) {
  if (!value.isFinite) return null;
  final rounded = (value * 100).round() / 100;
  return rounded.isFinite ? rounded : null;
}

/// Tolerance for reward/risk threshold comparisons.
///
/// The quality bands sit on exact ratios (1 and 2), but the ratio is computed
/// from prices that were rounded to the piastre, so a plan the user entered as
/// "4% target, 2% stop" can land a hair under 2.0 and flip the badge from
/// "good" to "warning" for no visible reason. Same class of bug as
/// [kRiskEpsilon], same fix.
const double kRatioEpsilon = 1e-9;

/// True when [value] is at or above [threshold], tolerating rounding noise.
bool meetsRatio(double? value, double threshold) {
  if (value == null || !value.isFinite) return false;
  return value - threshold > -kRatioEpsilon;
}

/// The ONLY place a risk ratio may be compared against the limit.
///
/// Never write `riskPct > maxRiskPercent` inline — a position sized exactly at
/// the limit must not flag, and bare `>` breaks that for most real price pairs.
bool exceedsRiskLimit(double riskPct, double maxRiskPercent) {
  if (!riskPct.isFinite || !maxRiskPercent.isFinite) return false;
  return riskPct - maxRiskPercent > kRiskEpsilon;
}
