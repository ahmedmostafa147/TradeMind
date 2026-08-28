import 'package:egx_trade_journal/core/calc/goal_projection.dart';
import 'package:egx_trade_journal/trades/trade.dart';
import 'package:egx_trade_journal/trades/trade_status.dart';
import 'package:flutter_test/flutter_test.dart';

/// Mirrors the assertions run against site/lib/projection.ts, so the phone and
/// the browser can be shown to agree rather than assumed to.
Trade _closed(DateTime exit) => Trade(
  id: 'id-${exit.millisecondsSinceEpoch}',
  ticker: 'COMI',
  entryDate: exit.subtract(const Duration(days: 5)),
  reason: 'اختبار',
  entryPrice: 10,
  stopPrice: 9,
  quantity: 100,
  exitPrice: 11,
  exitDate: exit,
  status: TradeStatus.closed,
);

void main() {
  // Twelve exits on the 15th of each month of 2025. Twelve points span ELEVEN
  // months, not twelve — the same off-by-one that made the first pass at the
  // web test wrong.
  final monthly = [
    for (var m = 1; m <= 12; m++) _closed(DateTime(2025, m, 15)),
  ];

  group('tradesPerMonth', () {
    test('measures first-to-last exit, not calendar months', () {
      final rate = tradesPerMonth([for (final t in monthly) t.exitDate!])!;
      expect(rate, closeTo(1.09, 0.01));
    });

    test('floors the span at one month so a single week is not 80 a month', () {
      final burst = [
        for (var d = 1; d <= 5; d++) DateTime(2025, 3, d),
      ];
      expect(tradesPerMonth(burst), 5.0);
    });

    test('is null with nothing closed', () {
      expect(tradesPerMonth(const []), isNull);
    });
  });

  group('projectGoal', () {
    test('doubling at ~5% a month lands at 14 months', () {
      final p = projectGoal(
        trades: monthly,
        capital: 100000,
        target: 200000,
        expectancy: 5000,
      );
      expect(p.kind, ProjectionKind.reachable);
      expect(p.months, 14);
      expect(p.beyondHorizon, isFalse);
    });

    test('an unset capital is named, not divided by', () {
      // 0 is Settings.defaultCapital and it means «لسه محددش». The
      // arithmetic divides by capital twice: the monthly rate would be
      // Infinity and `ln(target / 0) / ln(1 + Infinity)` is NaN — and
      // `NaN.ceil()` THROWS, so this branch is what stands between an unset
      // capital and a crashed «الهدف» tab.
      final p = projectGoal(
        trades: monthly,
        capital: 0,
        target: 200000,
        expectancy: 5000,
      );
      expect(p.kind, ProjectionKind.noCapital);
    });

    test('an unset capital wins over every other branch', () {
      // Including the ones that are cheaper to reach: `already-there` would
      // fire for a target of 0, and `not-enough-history` for an empty journal.
      // Neither is the useful thing to say to someone whose capital is blank.
      expect(
        projectGoal(trades: const [], capital: 0, target: 1, expectancy: null)
            .kind,
        ProjectionKind.noCapital,
      );
      expect(
        projectGoal(
          trades: monthly,
          capital: double.nan,
          target: 200000,
          expectancy: 5000,
        ).kind,
        ProjectionKind.noCapital,
      );
    });

    test('a negative edge is never a big number of months', () {
      final p = projectGoal(
        trades: monthly,
        capital: 100000,
        target: 200000,
        expectancy: -300,
      );
      expect(p.kind, ProjectionKind.noEdge);
    });

    test('zero expectancy is no edge — ln(1+0) would divide by zero', () {
      final p = projectGoal(
        trades: monthly,
        capital: 100000,
        target: 200000,
        expectancy: 0,
      );
      expect(p.kind, ProjectionKind.noEdge);
    });

    test('refuses to project on too little history', () {
      final p = projectGoal(
        trades: monthly.take(4).toList(),
        capital: 100000,
        target: 200000,
        expectancy: 5000,
      );
      expect(p.kind, ProjectionKind.notEnoughHistory);
      expect(p.closedCount, 4);
    });

    test('a target already met says so', () {
      final p = projectGoal(
        trades: monthly,
        capital: 200000,
        target: 100000,
        expectancy: 5000,
      );
      expect(p.kind, ProjectionKind.alreadyThere);
    });

    test('a tiny edge clamps instead of printing centuries', () {
      final p = projectGoal(
        trades: monthly,
        capital: 100000,
        target: 1000000,
        expectancy: 1,
      );
      expect(p.kind, ProjectionKind.reachable);
      expect(p.beyondHorizon, isTrue);
      expect(p.months, kMaxProjectionMonths);
    });

    test('open and planned trades never feed the projection', () {
      final noisy = [
        ...monthly,
        Trade(
          id: 'open',
          ticker: 'SWDY',
          entryDate: DateTime(2025, 6, 1),
          reason: 'اختبار',
          entryPrice: 10,
          stopPrice: 9,
          quantity: 100,
          status: TradeStatus.open,
        ),
        Trade(
          id: 'planned',
          ticker: 'ETEL',
          entryDate: DateTime(2025, 6, 1),
          reason: 'اختبار',
          entryPrice: 10,
          stopPrice: 9,
          quantity: 0,
          status: TradeStatus.planned,
        ),
      ];
      final a = projectGoal(
        trades: noisy,
        capital: 100000,
        target: 200000,
        expectancy: 5000,
      );
      final b = projectGoal(
        trades: monthly,
        capital: 100000,
        target: 200000,
        expectancy: 5000,
      );
      expect(a.months, b.months);
      expect(a.closedCount, 12);
    });

    test('no branch ever leaks NaN or infinity', () {
      for (final expectancy in <double>[-1000, 0, 0.0001, 5000]) {
        final p = projectGoal(
          trades: monthly,
          capital: 100000,
          target: 500000,
          expectancy: expectancy,
        );
        for (final v in [p.monthlyProfit, p.monthlyRate, p.tradesPerMonth]) {
          if (v != null) expect(v.isFinite, isTrue, reason: '$expectancy');
        }
        expect(p.months.isFinite, isTrue);
      }
    });
  });
}
