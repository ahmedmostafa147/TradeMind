import 'package:egx_trade_journal/core/calc/risk_math.dart';
import 'package:egx_trade_journal/core/calc/trade_metrics.dart';
import 'package:egx_trade_journal/trades/trade.dart';
import 'package:flutter_test/flutter_test.dart';

Trade makeTrade({
  String id = 't1',
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
    reason: 'اختراق مقاومة',
    entryPrice: entry,
    stopPrice: stop,
    quantity: qty,
    exitPrice: exit,
    exitDate: exit == null ? null : (exitDate ?? DateTime(2026, 3, 10)),
  );
}

TradeMetrics metricsOf(Trade t, {double capital = 17000, double maxRisk = 0.02}) =>
    TradeMetrics.of(t, capital: capital, maxRiskPercent: maxRisk);

void main() {
  group('spec acceptance fixture', () {
    // entry 10.00, stop 9.50, exit 11.20, qty 680, capital 17000 @ 2%.
    // Note the raw doubles are not exact: pnl computes to 815.9999999999995 and
    // R to 2.3999999999999986. The spec's "816.00" and "2.4R" are true after
    // display rounding, which is the formatters' job — see formatters_test.
    final m = metricsOf(makeTrade(exit: 11.20));

    test('position value is exactly 6800.00', () {
      expect(m.positionValue, 6800.0);
    });

    test('risk is exactly 340.00 EGP and 2.0%', () {
      expect(m.riskEgp, 340.0);
      expect(m.riskPct, closeTo(0.02, 1e-12));
    });

    test('exactly at the risk limit is NOT flagged', () {
      expect(m.overRisk, isFalse);
    });

    test('P&L, return and R match the spec', () {
      expect(m.pnl, closeTo(816.0, 1e-9));
      expect(m.returnPct, closeTo(0.12, 1e-12));
      expect(m.rMultiple, closeTo(2.4, 1e-12));
    });

    test('result is a win', () {
      expect(m.result, TradeResult.win);
      expect(m.result.label, 'ربح');
      expect(m.isOpen, isFalse);
    });
  });

  // The single most valuable test here: it proves the two epsilons agree.
  // Without kRiskEpsilon, the position the app itself suggested gets flagged red.
  test('a position sized by our own suggestion is never flagged over-limit', () {
    const capital = 10000.0;
    const maxRisk = 0.01;
    final qty = suggestedQuantity(
      maxLoss: maxLossPerTrade(capital: capital, maxRiskPercent: maxRisk),
      entry: 1.10,
      stop: 1.00,
    );

    expect(qty, 1000, reason: 'floor epsilon must not lose a share');

    final m = metricsOf(
      makeTrade(entry: 1.10, stop: 1.00, qty: qty!),
      capital: capital,
      maxRisk: maxRisk,
    );
    expect(
      m.overRisk,
      isFalse,
      reason: 'the app must not flag the quantity it just recommended',
    );
  });

  group('open trades', () {
    final m = metricsOf(makeTrade());

    test('P&L, return and R are all null while open', () {
      expect(m.pnl, isNull);
      expect(m.returnPct, isNull);
      expect(m.rMultiple, isNull);
    });

    test('position value and risk are still computed', () {
      expect(m.positionValue, 6800.0);
      expect(m.riskEgp, 340.0);
    });

    test('result is open', () {
      expect(m.result, TradeResult.open);
      expect(m.result.label, 'مفتوحة');
      expect(m.isOpen, isTrue);
    });
  });

  group('result classification', () {
    test('exit below entry is a loss with negative R', () {
      final m = metricsOf(makeTrade(exit: 9.60));
      expect(m.pnl, closeTo(-272.0, 1e-9));
      expect(m.rMultiple, closeTo(-0.8, 1e-12));
      expect(m.result, TradeResult.loss);
      expect(m.result.label, 'خسارة');
    });

    test('exit exactly at entry is breakeven, not a loss', () {
      final m = metricsOf(makeTrade(exit: 10.00));
      expect(m.pnl, 0.0);
      expect(m.result, TradeResult.breakeven);
      expect(m.result.label, 'تعادل');
    });
  });

  group('degenerate input never produces NaN or Infinity', () {
    test('zero quantity', () {
      final m = metricsOf(makeTrade(qty: 0, exit: 11.20));
      expect(m.positionValue, 0.0);
      expect(m.riskEgp, 0.0);
      expect(m.pnl, 0.0);
      expect(m.returnPct, isNull, reason: 'would be 0/0');
      expect(m.rMultiple, isNull, reason: 'would be 0/0');
      for (final v in [m.riskPct, m.pnl, m.returnPct, m.rMultiple]) {
        expect(v == null || v.isFinite, isTrue);
      }
    });

    test('stop equal to entry gives zero risk and no R', () {
      final m = metricsOf(makeTrade(stop: 10.00, exit: 11.20));
      expect(m.riskEgp, 0.0);
      expect(m.rMultiple, isNull);
      expect(m.overRisk, isFalse);
    });

    test('zero capital yields unknown risk, and unknown never flags', () {
      final m = metricsOf(makeTrade(exit: 11.20), capital: 0);
      expect(m.riskPct, isNull);
      expect(m.overRisk, isFalse);
    });
  });

  test('a genuinely oversized position is flagged', () {
    final m = metricsOf(makeTrade(qty: 700, exit: 11.20));
    expect(m.riskPct, closeTo(350 / 17000, 1e-12));
    expect(m.overRisk, isTrue);
  });
}
