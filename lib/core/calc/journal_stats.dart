import '../../trades/checklist.dart';
import '../../trades/trade.dart';
import '../../trades/trade_status.dart';
import 'risk_math.dart';
import 'trade_metrics.dart';

/// One point on the equity curve.
class EquityPoint {
  final DateTime date;
  final double equity;

  const EquityPoint(this.date, this.equity);
}

/// Journal-wide aggregates over closed trades.
///
/// Every "not available" case is null — never 0, never NaN. The dashboard
/// renders null as "—", so the zero-trades requirement falls out of the types
/// instead of needing a special branch on every stat.
class JournalStats {
  final int closedCount;
  final int winCount;
  final int lossCount;
  final int breakevenCount;
  final int openCount;

  /// Ideas that were never executed. Tracked separately from [openCount] so
  /// they cannot inflate it — they never risked money.
  final int plannedCount;
  final int cancelledCount;

  final int favoriteCount;

  /// Mean checklist completion across trades that have a checklist recorded,
  /// 0.0–1.0. Null when no trade has one, so the dashboard shows "—".
  final double? averageChecklistCompletion;

  /// wins / closed. Breakeven trades stay in the denominator — a scratch trade
  /// is a real closed trade that was not a win.
  final double? winRate;

  final double totalPnl;

  /// Mean R across closed trades that have a defined R. Trades with zero risk
  /// (qty 0, or a stop equal to entry) are excluded from BOTH the numerator and
  /// the denominator — otherwise one bad record turns the whole journal's
  /// average into NaN.
  final double? averageR;

  final double? avgWinEgp;

  /// Signed, so it reads negative. Keeps it consistent with totalPnl and stops
  /// a bare "272.00 ج.م" from being misread as a gain.
  final double? avgLossEgp;

  /// capital + realised P&L. Closed trades only — an open position sitting at
  /// +5,000 is deliberately not counted.
  final double currentCapital;

  final double? totalReturnPct;

  /// Starts at capital, then one point per closed trade at running equity.
  /// Empty when nothing is closed.
  final List<EquityPoint> equityCurve;

  const JournalStats._({
    required this.closedCount,
    required this.winCount,
    required this.lossCount,
    required this.breakevenCount,
    required this.openCount,
    required this.plannedCount,
    required this.cancelledCount,
    required this.favoriteCount,
    required this.averageChecklistCompletion,
    required this.winRate,
    required this.totalPnl,
    required this.averageR,
    required this.avgWinEgp,
    required this.avgLossEgp,
    required this.currentCapital,
    required this.totalReturnPct,
    required this.equityCurve,
  });

  factory JournalStats.from(
    List<Trade> trades, {
    required double capital,
    required double maxRiskPercent,
  }) {
    final closed = <Trade>[];
    var openCount = 0;
    var plannedCount = 0;
    var cancelledCount = 0;
    var favoriteCount = 0;
    var checklistSum = 0.0;
    var checklistCount = 0;

    for (final trade in trades) {
      if (trade.isFavorite) favoriteCount++;
      if (trade.completedChecklistItems.isNotEmpty) {
        checklistSum += checklistCompletion(trade.completedChecklistItems);
        checklistCount++;
      }

      switch (trade.status) {
        case TradeStatus.planned:
          plannedCount++;
        case TradeStatus.cancelled:
          cancelledCount++;
        case TradeStatus.open:
          openCount++;
        case TradeStatus.closed:
          // A trade marked closed but missing its exit cannot contribute a P&L
          // or an equity-curve point, so it is counted as still open rather
          // than silently dropped from every total.
          if (trade.isOpen || trade.exitDate == null) {
            openCount++;
          } else {
            closed.add(trade);
          }
      }
    }

    // Date pickers yield date-only values, so exitDate ties are constant — and
    // List.sort is not stable, so without the id tie-break the equity curve
    // would visually reshuffle between rebuilds.
    closed.sort((a, b) {
      final byDate = a.exitDate!.compareTo(b.exitDate!);
      return byDate != 0 ? byDate : a.id.compareTo(b.id);
    });

    var totalPnl = 0.0;
    var winCount = 0;
    var lossCount = 0;
    var breakevenCount = 0;
    var winSum = 0.0;
    var lossSum = 0.0;
    var rSum = 0.0;
    var rCount = 0;

    final curve = <EquityPoint>[];
    if (closed.isNotEmpty) {
      curve.add(EquityPoint(closed.first.exitDate!, capital));
    }

    for (final trade in closed) {
      final metrics = TradeMetrics.of(
        trade,
        capital: capital,
        maxRiskPercent: maxRiskPercent,
      );
      final pnl = metrics.pnl ?? 0;
      totalPnl += pnl;

      switch (metrics.result) {
        case TradeResult.win:
          winCount++;
          winSum += pnl;
        case TradeResult.loss:
          lossCount++;
          lossSum += pnl;
        case TradeResult.breakeven:
          breakevenCount++;
        case TradeResult.open:
          break;
      }

      final r = metrics.rMultiple;
      if (r != null) {
        rSum += r;
        rCount++;
      }

      curve.add(EquityPoint(trade.exitDate!, capital + totalPnl));
    }

    final closedCount = closed.length;

    return JournalStats._(
      closedCount: closedCount,
      winCount: winCount,
      lossCount: lossCount,
      breakevenCount: breakevenCount,
      openCount: openCount,
      plannedCount: plannedCount,
      cancelledCount: cancelledCount,
      favoriteCount: favoriteCount,
      averageChecklistCompletion: checklistCount == 0
          ? null
          : checklistSum / checklistCount,
      winRate: closedCount == 0 ? null : winCount / closedCount,
      totalPnl: totalPnl,
      averageR: rCount == 0 ? null : rSum / rCount,
      avgWinEgp: winCount == 0 ? null : winSum / winCount,
      avgLossEgp: lossCount == 0 ? null : lossSum / lossCount,
      currentCapital: capital + totalPnl,
      totalReturnPct: safeDiv(totalPnl, capital),
      equityCurve: List.unmodifiable(curve),
    );
  }
}
