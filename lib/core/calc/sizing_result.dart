import 'risk_math.dart';

/// Pre-trade sizing outputs, recomputed on every keystroke.
///
/// Deliberately tolerant of partial input: it is called against half-typed
/// fields, so every field is nullable and nothing throws. The calculator screen
/// and the live section of the add/edit form both render this.
class SizingResult {
  /// Loss budget from settings. 0 when capital or the risk rule is unusable.
  final double maxLoss;

  /// Risk per share (entry - stop). null until both prices are valid.
  final double? riskPerShare;

  /// null when entry <= stop or the prices are incomplete.
  final int? suggestedQty;

  /// The quantity the rest of the outputs are based on: the user's own
  /// quantity when they typed one, otherwise the suggestion.
  final int? effectiveQty;

  final double? positionValue;
  final double? riskEgp;
  final double? riskPct;

  /// Always false when [riskPct] is null — an unknown risk is not a breach.
  final bool overRisk;

  /// True when the loss budget cannot fund even one share at this stop
  /// distance. Distinct from "no answer" so the UI can explain rather than
  /// showing a bare 0.
  final bool capitalTooSmall;

  /// True when the quantity was cut down to fit the money the trader is
  /// actually putting in, rather than by the risk rule. Lets the UI say why
  /// the suggestion is smaller than the risk budget alone would allow.
  final bool limitedByBudget;

  /// The cash cap that produced [limitedByBudget], when one was given.
  final double? budget;

  const SizingResult._({
    required this.maxLoss,
    required this.riskPerShare,
    required this.suggestedQty,
    required this.effectiveQty,
    required this.positionValue,
    required this.riskEgp,
    required this.riskPct,
    required this.overRisk,
    required this.capitalTooSmall,
    this.limitedByBudget = false,
    this.budget,
  });

  static const SizingResult empty = SizingResult._(
    maxLoss: 0,
    riskPerShare: null,
    suggestedQty: null,
    effectiveQty: null,
    positionValue: null,
    riskEgp: null,
    riskPct: null,
    overRisk: false,
    capitalTooSmall: false,
  );

  factory SizingResult.compute({
    required double capital,
    required double maxRiskPercent,
    double? entry,
    double? stop,
    int? userQty,
    // Cash the trader is willing to commit to THIS position, which is usually
    // far less than their whole capital. The risk rule alone sizes as if the
    // entire account backs every trade; this caps the suggestion at what they
    // are actually spending. The risk limit still applies — whichever of the
    // two allows fewer shares wins.
    double? budget,
  }) {
    final maxLoss = maxLossPerTrade(
      capital: capital,
      maxRiskPercent: maxRiskPercent,
    );

    // Bound to locals rather than tested through a `hasPrices` bool: Dart's
    // type promotion does not survive an indirection through a separate flag,
    // so the nullable parameters would stay double? at every use site.
    final validEntry = (entry != null && entry.isFinite && entry > 0)
        ? entry
        : null;
    final validStop = (stop != null && stop.isFinite && stop > 0) ? stop : null;

    final riskPerShare =
        (validEntry != null && validStop != null && validEntry > validStop)
        ? validEntry - validStop
        : null;

    final riskQty = (validEntry != null && validStop != null)
        ? suggestedQuantity(
            maxLoss: maxLoss,
            entry: validEntry,
            stop: validStop,
          )
        : null;

    final validBudget = (budget != null && budget.isFinite && budget > 0)
        ? budget
        : null;

    // How many whole shares the cash actually buys.
    final budgetQty = (validBudget != null && validEntry != null)
        ? (validBudget / validEntry).floor()
        : null;

    // The tighter of the two constraints, so neither the risk rule nor the
    // wallet is ever exceeded.
    final suggestedQty = (riskQty != null && budgetQty != null)
        ? (budgetQty < riskQty ? budgetQty : riskQty)
        : (riskQty ?? budgetQty);

    final limitedByBudget =
        riskQty != null && budgetQty != null && budgetQty < riskQty;

    final effectiveQty = (userQty != null && userQty > 0)
        ? userQty
        : suggestedQty;

    double? positionValue;
    double? riskEgp;
    double? riskPct;

    if (validEntry != null && effectiveQty != null && effectiveQty > 0) {
      positionValue = validEntry * effectiveQty;
      if (!positionValue.isFinite) positionValue = null;

      if (riskPerShare != null) {
        riskEgp = riskPerShare * effectiveQty;
        if (!riskEgp.isFinite) {
          riskEgp = null;
        } else {
          riskPct = safeDiv(riskEgp, capital);
        }
      }
    }

    return SizingResult._(
      maxLoss: maxLoss,
      riskPerShare: riskPerShare,
      suggestedQty: suggestedQty,
      effectiveQty: effectiveQty,
      positionValue: positionValue,
      riskEgp: riskEgp,
      riskPct: riskPct,
      overRisk: riskPct != null && exceedsRiskLimit(riskPct, maxRiskPercent),
      // Only a risk-budget shortfall counts: a budget too small for one share
      // is the trader's own cap, not an "account too small" problem.
      capitalTooSmall: riskQty == 0,
      limitedByBudget: limitedByBudget,
      budget: validBudget,
    );
  }
}
