import 'package:egx_trade_journal/core/calc/risk_math.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('maxLossPerTrade', () {
    test('spec fixture: 17000 @ 2% is exactly 340.00', () {
      expect(maxLossPerTrade(capital: 17000, maxRiskPercent: 0.02), 340.0);
    });

    test('returns 0 for unusable input rather than a bogus budget', () {
      expect(maxLossPerTrade(capital: 0, maxRiskPercent: 0.02), 0);
      expect(maxLossPerTrade(capital: -100, maxRiskPercent: 0.02), 0);
      expect(maxLossPerTrade(capital: 17000, maxRiskPercent: 0), 0);
      expect(maxLossPerTrade(capital: double.nan, maxRiskPercent: 0.02), 0);
      expect(maxLossPerTrade(capital: double.infinity, maxRiskPercent: 0.02), 0);
    });
  });

  group('suggestedQuantity', () {
    test('spec fixture: 340 budget, 10.00/9.50 gives 680', () {
      expect(suggestedQuantity(maxLoss: 340, entry: 10.00, stop: 9.50), 680);
    });

    // The regression the whole kQtyEpsilon constant exists for. 1.10-1.00 is
    // 0.10000000000000009, so the bare floor yields 999.
    test('non-dyadic price gap does not lose a share to rounding', () {
      expect(suggestedQuantity(maxLoss: 100, entry: 1.10, stop: 1.00), 1000);
    });

    test('table of non-dyadic gaps all round to the true answer', () {
      // Each case is a price pair whose difference is not exactly representable.
      expect(suggestedQuantity(maxLoss: 100, entry: 2.30, stop: 2.20), 1000);
      expect(suggestedQuantity(maxLoss: 120, entry: 0.87, stop: 0.83), 3000);
      expect(suggestedQuantity(maxLoss: 340, entry: 20.30, stop: 20.13), 2000);
    });

    test('epsilon does not round a genuine fraction up', () {
      // 340 / 0.7 = 485.714..., must stay 485.
      expect(suggestedQuantity(maxLoss: 340, entry: 10.00, stop: 9.30), 485);
      // 100 / 0.3 = 333.33..., must stay 333.
      expect(suggestedQuantity(maxLoss: 100, entry: 1.30, stop: 1.00), 333);
    });

    test('entry <= stop has no answer', () {
      expect(suggestedQuantity(maxLoss: 340, entry: 9.0, stop: 9.0), isNull);
      expect(suggestedQuantity(maxLoss: 340, entry: 9.0, stop: 10.0), isNull);
    });

    test('no loss budget has no answer', () {
      expect(suggestedQuantity(maxLoss: 0, entry: 10.0, stop: 9.5), isNull);
      expect(suggestedQuantity(maxLoss: -5, entry: 10.0, stop: 9.5), isNull);
    });

    test('budget too small for one share returns 0, not null', () {
      // A real answer the UI must explain, not an error.
      expect(suggestedQuantity(maxLoss: 0.2, entry: 10.0, stop: 9.5), 0);
    });

    test('non-finite input has no answer', () {
      expect(
        suggestedQuantity(maxLoss: 340, entry: double.nan, stop: 9.5),
        isNull,
      );
      expect(
        suggestedQuantity(maxLoss: 340, entry: double.infinity, stop: 9.5),
        isNull,
      );
    });
  });

  group('exceedsRiskLimit', () {
    test('exactly at the limit does NOT flag', () {
      expect(exceedsRiskLimit(0.02, 0.02), isFalse);
    });

    test('the spec fixture ratio does not flag', () {
      expect(exceedsRiskLimit(340.0 / 17000.0, 0.02), isFalse);
    });

    // The other half of the coupled epsilon pair: this is the exact value
    // produced by a correctly-sized 1000-share position at entry 1.10/stop 1.00
    // on 10,000 capital. A bare `>` flags it red.
    test('float noise a few ulps over the limit does not flag', () {
      expect(exceedsRiskLimit(0.010000000000000009, 0.01), isFalse);
    });

    test('a genuine breach still flags', () {
      expect(exceedsRiskLimit(0.0201, 0.02), isTrue);
      expect(exceedsRiskLimit(0.025, 0.02), isTrue);
    });

    test('under the limit does not flag', () {
      expect(exceedsRiskLimit(0.01, 0.02), isFalse);
    });

    test('non-finite risk does not flag', () {
      expect(exceedsRiskLimit(double.nan, 0.02), isFalse);
      expect(exceedsRiskLimit(double.infinity, 0.02), isFalse);
    });
  });

  group('safeDiv', () {
    test('divides normally', () {
      expect(safeDiv(340, 17000), 0.02);
    });

    test('never returns Infinity or NaN', () {
      expect(safeDiv(1, 0), isNull);
      expect(safeDiv(0, 0), isNull);
      expect(safeDiv(-1, 0), isNull);
      expect(safeDiv(double.nan, 2), isNull);
      expect(safeDiv(2, double.nan), isNull);
      expect(safeDiv(double.infinity, 2), isNull);
    });
  });
}
