import 'package:egx_trade_journal/core/calc/journal_stats.dart';
import 'package:egx_trade_journal/trades/trade.dart';
import 'package:flutter_test/flutter_test.dart';

Trade makeTrade({
  required String id,
  double entry = 10.00,
  double stop = 9.50,
  int qty = 680,
  double? exit,
  DateTime? exitDate,
}) {
  return Trade(
    id: id,
    entryDate: DateTime(2026, 3, 1),
    ticker: 'COMI',
    reason: 'سبب',
    entryPrice: entry,
    stopPrice: stop,
    quantity: qty,
    exitPrice: exit,
    exitDate: exit == null ? null : (exitDate ?? DateTime(2026, 3, 10)),
  );
}

JournalStats statsOf(List<Trade> trades, {double capital = 17000}) =>
    JournalStats.from(trades, capital: capital, maxRiskPercent: 0.02);

void main() {
  group('zero trades', () {
    final s = statsOf([]);

    test('every average is null, never zero or NaN', () {
      expect(s.winRate, isNull);
      expect(s.averageR, isNull);
      expect(s.avgWinEgp, isNull);
      expect(s.avgLossEgp, isNull);
    });

    test('totals fall back to the untouched capital', () {
      expect(s.closedCount, 0);
      expect(s.openCount, 0);
      expect(s.totalPnl, 0.0);
      expect(s.currentCapital, 17000.0);
      expect(s.totalReturnPct, 0.0);
      expect(s.equityCurve, isEmpty);
    });

    test('zero capital does not divide by zero', () {
      final z = statsOf([], capital: 0);
      expect(z.totalReturnPct, isNull);
      expect(z.currentCapital, 0.0);
    });
  });

  group('open trades only', () {
    final s = statsOf([makeTrade(id: 'a'), makeTrade(id: 'b')]);

    test('counted as open and excluded from every aggregate', () {
      expect(s.openCount, 2);
      expect(s.closedCount, 0);
      expect(s.winRate, isNull);
      expect(s.averageR, isNull);
      expect(s.totalPnl, 0.0);
      expect(s.currentCapital, 17000.0);
      expect(s.equityCurve, isEmpty);
    });
  });

  group('mixed journal: 2 wins, 1 loss, 1 open', () {
    final trades = [
      makeTrade(id: 'w1', exit: 11.20, exitDate: DateTime(2026, 3, 5)),
      makeTrade(id: 'w2', exit: 10.50, exitDate: DateTime(2026, 3, 6)),
      makeTrade(id: 'l1', exit: 9.60, exitDate: DateTime(2026, 3, 7)),
      makeTrade(id: 'o1'),
    ];
    final s = statsOf(trades);

    test('counts split correctly', () {
      expect(s.closedCount, 3);
      expect(s.winCount, 2);
      expect(s.lossCount, 1);
      expect(s.breakevenCount, 0);
      expect(s.openCount, 1);
    });

    test('win rate is wins over closed', () {
      expect(s.winRate, closeTo(2 / 3, 1e-12));
    });

    test('P&L totals and averages', () {
      // +816 (1.20 x 680), +340 (0.50 x 680), -272 (-0.40 x 680)
      expect(s.totalPnl, closeTo(884.0, 1e-9));
      expect(s.avgWinEgp, closeTo(578.0, 1e-9));
      expect(s.avgLossEgp, closeTo(-272.0, 1e-9));
      expect(s.avgLossEgp, isNegative, reason: 'signed, to read as a loss');
    });

    test('average R over the three closed trades', () {
      // R values: 2.4, 1.0, -0.8
      expect(s.averageR, closeTo((2.4 + 1.0 - 0.8) / 3, 1e-9));
    });

    test('current capital and total return', () {
      expect(s.currentCapital, closeTo(17884.0, 1e-9));
      expect(s.totalReturnPct, closeTo(884.0 / 17000.0, 1e-12));
    });

    test('appending an open trade changes no aggregate', () {
      final withExtra = statsOf([...trades, makeTrade(id: 'o2')]);
      expect(withExtra.totalPnl, closeTo(s.totalPnl, 1e-12));
      expect(withExtra.closedCount, s.closedCount);
      expect(withExtra.openCount, s.openCount + 1);
    });
  });

  test('breakeven counts as closed but is neither a win nor a loss', () {
    final s = statsOf([
      makeTrade(id: 'b1', exit: 10.00, exitDate: DateTime(2026, 3, 5)),
      makeTrade(id: 'w1', exit: 11.20, exitDate: DateTime(2026, 3, 6)),
    ]);
    expect(s.closedCount, 2);
    expect(s.breakevenCount, 1);
    expect(s.winCount, 1);
    expect(s.lossCount, 0);
    expect(s.winRate, closeTo(0.5, 1e-12));
    // The scratch trade must not drag the average-win figure down.
    expect(s.avgWinEgp, closeTo(816.0, 1e-9));
    expect(s.avgLossEgp, isNull);
  });

  test('a zero-risk trade does not poison averageR for the whole journal', () {
    final s = statsOf([
      makeTrade(id: 'z', qty: 0, exit: 11.20, exitDate: DateTime(2026, 3, 5)),
      makeTrade(id: 'w', exit: 11.20, exitDate: DateTime(2026, 3, 6)),
    ]);
    expect(s.closedCount, 2);
    expect(s.averageR, isNotNull);
    expect(s.averageR, closeTo(2.4, 1e-9), reason: 'the null-R trade is skipped');
  });

  test('averageR is null when no closed trade has a defined R', () {
    final s = statsOf([
      makeTrade(id: 'z', qty: 0, exit: 11.20, exitDate: DateTime(2026, 3, 5)),
    ]);
    expect(s.averageR, isNull);
  });

  group('equity curve', () {
    final s = statsOf([
      makeTrade(id: 'c', exit: 9.60, exitDate: DateTime(2026, 3, 7)),
      makeTrade(id: 'a', exit: 11.20, exitDate: DateTime(2026, 3, 5)),
      makeTrade(id: 'b', exit: 10.50, exitDate: DateTime(2026, 3, 6)),
    ]);

    test('sorted by exit date regardless of input order', () {
      final dates = s.equityCurve.map((p) => p.date).toList();
      final sorted = [...dates]..sort();
      expect(dates, sorted);
    });

    test('starts at capital and ends at current capital', () {
      expect(s.equityCurve.first.equity, 17000.0);
      expect(s.equityCurve.last.equity, closeTo(s.currentCapital, 1e-9));
      expect(s.equityCurve.length, s.closedCount + 1);
    });

    test('same-day exits are ordered deterministically by id', () {
      final sameDay = DateTime(2026, 3, 5);
      List<double> run(List<Trade> input) => statsOf(
        input,
      ).equityCurve.map((p) => p.equity).toList();

      final forward = [
        makeTrade(id: 'a', exit: 11.20, exitDate: sameDay),
        makeTrade(id: 'b', exit: 9.60, exitDate: sameDay),
      ];
      expect(run(forward), run(forward.reversed.toList()));
    });
  });
}
