import 'risk_math.dart';
import 'sizing_result.dart';

/// How well the reward compensates the risk.
enum TradeQuality {
  good,
  warning,
  bad;

  String get label => switch (this) {
    TradeQuality.good => '✅ صفقة جيدة',
    TradeQuality.warning => '⚠️ المخاطرة مرتفعة',
    TradeQuality.bad => '❌ العائد لا يبرر المخاطرة',
  };
}

/// Turns "entry price + target % + stop %" into a complete, sized trade.
///
/// The point is that the trader never opens a calculator: the percentages are
/// picked, and every number below falls out of them.
///
/// Pure Dart, and it does not re-derive any position sizing — that is delegated
/// to [SizingResult] so there is exactly one implementation of the risk rule.
class SmartTradePlan {
  final double? entryPrice;

  /// Fractions, not percents: 0.05 is 5%.
  final double takeProfitPercent;
  final double stopLossPercent;

  /// Rounded to the piastre. These exact values feed everything below, so what
  /// is displayed is what was computed.
  final double? takeProfitPrice;
  final double? stopLossPrice;

  final double? rewardPerShare;
  final double? riskPerShare;

  /// Reward ÷ risk. Null until both prices are known.
  final double? rewardRiskRatio;

  final TradeQuality? quality;

  /// Position sizing under the user's risk rule, computed from the derived
  /// stop price.
  final SizingResult sizing;

  final double? expectedProfit;

  /// Negative, so it reads as a loss and sums correctly with profits.
  final double? expectedLoss;

  const SmartTradePlan._({
    required this.entryPrice,
    required this.takeProfitPercent,
    required this.stopLossPercent,
    required this.takeProfitPrice,
    required this.stopLossPrice,
    required this.rewardPerShare,
    required this.riskPerShare,
    required this.rewardRiskRatio,
    required this.quality,
    required this.sizing,
    required this.expectedProfit,
    required this.expectedLoss,
  });

  /// True when the plan is worth acting on: reward at least twice the risk.
  bool get isGood => quality == TradeQuality.good;

  /// Whether the summary card reads as positive: reward STRICTLY greater than
  /// risk, per the spec. Same guarded shape as [exceedsRiskLimit] — a ratio of
  /// exactly 1 is not a win, and rounding noise must not make it look like one.
  bool get rewardBeatsRisk {
    final ratio = rewardRiskRatio;
    if (ratio == null || !ratio.isFinite) return false;
    return ratio - 1 > kRatioEpsilon;
  }

  factory SmartTradePlan.compute({
    required double capital,
    required double maxRiskPercent,
    required double takeProfitPercent,
    required double stopLossPercent,
    double? entryPrice,
    int? userQty,
    // An absolute stop, for the "stop by price" input mode. When given and
    // valid it takes precedence over [stopLossPercent]; the percentage is then
    // derived from it for display, so the two modes stay consistent and the
    // price the trader typed is used exactly rather than round-tripped through
    // a percentage. Null keeps the original percentage-driven behaviour.
    double? stopPrice,
    /// Cash committed to this position. Forwarded to [SizingResult]; see the
    /// note there on how it interacts with the risk limit.
    double? budget,
  }) {
    final entry =
        (entryPrice != null && entryPrice.isFinite && entryPrice > 0)
        ? entryPrice
        : null;

    final validTp = takeProfitPercent.isFinite && takeProfitPercent > 0
        ? takeProfitPercent
        : 0.0;

    final overrideStop =
        (stopPrice != null &&
            stopPrice.isFinite &&
            stopPrice > 0 &&
            entry != null &&
            stopPrice < entry)
        ? roundToPiastre(stopPrice)
        : null;

    // With an explicit stop price the percentage is whatever that price
    // implies; otherwise it is the value picked directly.
    final validSl = overrideStop != null
        ? (entry! - overrideStop) / entry
        : (stopLossPercent.isFinite &&
                  stopLossPercent > 0 &&
                  // A stop at or beyond 100% below entry is meaningless.
                  stopLossPercent < 1
              ? stopLossPercent
              : 0.0);

    double? takeProfitPrice;
    double? stopLossPrice = overrideStop;
    if (entry != null) {
      if (validTp > 0) takeProfitPrice = roundToPiastre(entry * (1 + validTp));
      if (overrideStop == null && validSl > 0) {
        stopLossPrice = roundToPiastre(entry * (1 - validSl));
      }
    }

    // Rounding can collapse a tiny percentage onto the entry price itself —
    // 0.1% of 2.00 rounds straight back to 2.00. That is not a usable level,
    // so it is discarded rather than producing a zero-risk trade.
    if (takeProfitPrice != null && entry != null && takeProfitPrice <= entry) {
      takeProfitPrice = null;
    }
    if (stopLossPrice != null && entry != null && stopLossPrice >= entry) {
      stopLossPrice = null;
    }

    final rewardPerShare = (entry != null && takeProfitPrice != null)
        ? takeProfitPrice - entry
        : null;
    final riskPerShare = (entry != null && stopLossPrice != null)
        ? entry - stopLossPrice
        : null;

    final ratio = (rewardPerShare != null && riskPerShare != null)
        ? safeDiv(rewardPerShare, riskPerShare)
        : null;

    final TradeQuality? quality;
    if (ratio == null) {
      quality = null;
    } else if (meetsRatio(ratio, 2)) {
      quality = TradeQuality.good;
    } else if (meetsRatio(ratio, 1)) {
      quality = TradeQuality.warning;
    } else {
      quality = TradeQuality.bad;
    }

    // Sizing comes from the shared implementation; the derived stop is simply
    // fed in as the stop price.
    final sizing = SizingResult.compute(
      capital: capital,
      maxRiskPercent: maxRiskPercent,
      entry: entry,
      stop: stopLossPrice,
      userQty: userQty,
      budget: budget,
    );

    final qty = sizing.effectiveQty;
    double? expectedProfit;
    double? expectedLoss;
    if (qty != null && qty > 0) {
      if (rewardPerShare != null) {
        final value = rewardPerShare * qty;
        expectedProfit = value.isFinite ? value : null;
      }
      if (riskPerShare != null) {
        final value = -riskPerShare * qty;
        expectedLoss = value.isFinite ? value : null;
      }
    }

    return SmartTradePlan._(
      entryPrice: entry,
      takeProfitPercent: validTp,
      stopLossPercent: validSl,
      takeProfitPrice: takeProfitPrice,
      stopLossPrice: stopLossPrice,
      rewardPerShare: rewardPerShare,
      riskPerShare: riskPerShare,
      rewardRiskRatio: ratio,
      quality: quality,
      sizing: sizing,
      expectedProfit: expectedProfit,
      expectedLoss: expectedLoss,
    );
  }
}
