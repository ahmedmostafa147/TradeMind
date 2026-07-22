import '../../trades/trade.dart';
import 'risk_math.dart';

enum TradeResult {
  open,
  win,
  loss,

  /// Exit exactly at entry. The spec's literal `pnl > 0 ? ربح : خسارة` would
  /// count a scratch trade as a loss, dragging down the win rate and polluting
  /// the average-loss figure with a 0. Split out on purpose.
  breakeven;

  String get label => switch (this) {
    TradeResult.open => 'مفتوحة',
    TradeResult.win => 'ربح',
    TradeResult.loss => 'خسارة',
    TradeResult.breakeven => 'تعادل',
  };
}

/// Everything the trade list, tile, and form need for one trade.
///
/// Takes capital and the risk limit as explicit parameters rather than reading
/// them from storage, which is what keeps this layer pure and makes a settings
/// change invalidate every derived provider automatically.
class TradeMetrics {
  final double positionValue;
  final double riskEgp;

  /// null when capital is unusable.
  final double? riskPct;

  /// null while the position is open.
  final double? pnl;
  final double? returnPct;

  /// P&L divided by the amount risked. The headline metric, and the only one
  /// that is capital-free — so it stays meaningful even after the user edits
  /// their capital in Settings.
  final double? rMultiple;

  final bool isOpen;
  final bool overRisk;
  final TradeResult result;

  const TradeMetrics._({
    required this.positionValue,
    required this.riskEgp,
    required this.riskPct,
    required this.pnl,
    required this.returnPct,
    required this.rMultiple,
    required this.isOpen,
    required this.overRisk,
    required this.result,
  });

  factory TradeMetrics.of(
    Trade trade, {
    required double capital,
    required double maxRiskPercent,
  }) {
    final qty = trade.quantity;
    final entry = trade.entryPrice;
    final stop = trade.stopPrice;

    var positionValue = entry * qty;
    if (!positionValue.isFinite) positionValue = 0;

    var riskEgp = (entry - stop) * qty;
    if (!riskEgp.isFinite) riskEgp = 0;

    final riskPct = safeDiv(riskEgp, capital);

    final exit = trade.exitPrice;
    double? pnl;
    if (exit != null) {
      final value = (exit - entry) * qty;
      pnl = value.isFinite ? value : null;
    }

    final TradeResult result;
    if (exit == null) {
      result = TradeResult.open;
    } else if (pnl == null) {
      result = TradeResult.open;
    } else if (pnl > 0) {
      result = TradeResult.win;
    } else if (pnl < 0) {
      result = TradeResult.loss;
    } else {
      result = TradeResult.breakeven;
    }

    return TradeMetrics._(
      positionValue: positionValue,
      riskEgp: riskEgp,
      riskPct: riskPct,
      pnl: pnl,
      // Both null while open, and null rather than NaN when the denominator
      // is zero (a qty-0 or zero-distance-stop trade).
      returnPct: pnl == null ? null : safeDiv(pnl, positionValue),
      rMultiple: pnl == null ? null : safeDiv(pnl, riskEgp),
      isOpen: trade.isOpen,
      overRisk: riskPct != null && exceedsRiskLimit(riskPct, maxRiskPercent),
      result: result,
    );
  }
}
