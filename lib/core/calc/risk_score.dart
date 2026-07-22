import '../../trades/checklist.dart';
import '../../trades/trade.dart';
import 'risk_math.dart';

enum RiskGrade {
  excellent,
  good,
  average,
  poor;

  String get label => switch (this) {
    RiskGrade.excellent => 'ممتاز',
    RiskGrade.good => 'جيد',
    RiskGrade.average => 'متوسط',
    RiskGrade.poor => 'ضعيف',
  };
}

/// How well a trade was prepared, 0–100 in five 20-point components.
///
/// This is discipline, not outcome: a losing trade that followed every rule
/// scores 100, and a winning trade taken on a whim scores 20. That is the point
/// — it measures the process the journal exists to enforce.
class RiskScore {
  final bool checklistComplete;
  final bool riskWithinLimit;
  final bool hasStop;
  final bool hasDetailedReason;
  final bool hasScreenshots;

  const RiskScore._({
    required this.checklistComplete,
    required this.riskWithinLimit,
    required this.hasStop,
    required this.hasDetailedReason,
    required this.hasScreenshots,
  });

  /// Minimum characters of reasoning for the component to count. The spec says
  /// "> 20 chars" — strictly greater, measured after trimming so trailing
  /// whitespace cannot buy a point.
  static const int minReasonLength = 20;

  int get value =>
      (checklistComplete ? 20 : 0) +
      (riskWithinLimit ? 20 : 0) +
      (hasStop ? 20 : 0) +
      (hasDetailedReason ? 20 : 0) +
      (hasScreenshots ? 20 : 0);

  /// Thresholds land on the 20-point grid the formula actually produces:
  /// 100 ممتاز, 80 جيد, 60 متوسط, 40 and below ضعيف.
  RiskGrade get grade => switch (value) {
    >= 100 => RiskGrade.excellent,
    >= 80 => RiskGrade.good,
    >= 60 => RiskGrade.average,
    _ => RiskGrade.poor,
  };

  factory RiskScore.of(
    Trade trade, {
    required double capital,
    required double maxRiskPercent,
  }) {
    final riskEgp = (trade.entryPrice - trade.stopPrice) * trade.quantity;
    final riskPct = safeDiv(riskEgp, capital);

    return RiskScore._(
      checklistComplete: isChecklistComplete(trade.completedChecklistItems),

      // NOT `riskPct <= maxRiskPercent`. Writing the spec's "risk <= limit"
      // literally reintroduces the exact float bug fixed in phase 1: a position
      // sized at precisely the limit by our own calculator computes a ratio a
      // few ulps above it, and would silently lose 20 points. exceedsRiskLimit
      // is the single guarded comparison, so this is its negation.
      // A null ratio means capital is unusable — unverifiable, so no credit.
      riskWithinLimit:
          riskPct != null && !exceedsRiskLimit(riskPct, maxRiskPercent),

      hasStop: trade.stopPrice > 0 && trade.stopPrice < trade.entryPrice,
      hasDetailedReason: trade.reason.trim().length > minReasonLength,
      hasScreenshots: trade.screenshotPaths.isNotEmpty,
    );
  }
}
