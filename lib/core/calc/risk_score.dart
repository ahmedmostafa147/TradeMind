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

/// How well a trade was prepared, 0–100 in four 25-point components.
///
/// This is discipline, not outcome: a losing trade that followed every rule
/// scores 100, and a winning trade taken on a whim scores 25. That is the point
/// — it measures the process the journal exists to enforce.
///
/// ── IT WAS FIVE COMPONENTS OF 20, AND THE FIFTH WAS UNREACHABLE ────────────
///
/// «صورة من الشارت مرفقة» was worth 20 points and could only ever be earned on
/// the phone: chart images are files in the device's own storage and only their
/// PATHS sync, so a trade logged from the browser — where most of this product's
/// users are — was capped at 80 forever with no action available to raise it.
///
/// Both surfaces had grown apologies for that. The web trade form carried a
/// paragraph explaining the missing button, and the discipline badge appended a
/// line to its own tooltip saying the component was unearnable there. A score
/// that needs an explanation for why its maximum is out of reach has stopped
/// measuring discipline and started measuring which device you happened to use.
///
/// The honest fix is to stop scoring what the user cannot do. Attaching a
/// screenshot is still worth doing and the app still stores them; it is simply
/// not a component of a number that claims to grade preparation.
///
/// If Firebase Storage and real uploads ever land, this can come back as a fifth
/// component — but only once BOTH surfaces can earn it.
class RiskScore {
  final bool checklistComplete;
  final bool riskWithinLimit;
  final bool hasStop;
  final bool hasDetailedReason;

  const RiskScore._({
    required this.checklistComplete,
    required this.riskWithinLimit,
    required this.hasStop,
    required this.hasDetailedReason,
  });

  /// Minimum characters of reasoning for the component to count. The spec says
  /// "> 20 chars" — strictly greater, measured after trimming so trailing
  /// whitespace cannot buy a point.
  ///
  /// UNRELATED to the points per component below, which happen to have been the
  /// same number until this became 25.
  static const int minReasonLength = 20;

  /// Points per earned component. Four of them, so a full score is 100.
  static const int pointsEach = 25;

  int get value =>
      (checklistComplete ? pointsEach : 0) +
      (riskWithinLimit ? pointsEach : 0) +
      (hasStop ? pointsEach : 0) +
      (hasDetailedReason ? pointsEach : 0);

  /// Thresholds land on the 25-point grid the formula actually produces:
  /// 100 ممتاز, 75 جيد, 50 متوسط, 25 and below ضعيف.
  RiskGrade get grade => switch (value) {
    >= 100 => RiskGrade.excellent,
    >= 75 => RiskGrade.good,
    >= 50 => RiskGrade.average,
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
    );
  }
}
