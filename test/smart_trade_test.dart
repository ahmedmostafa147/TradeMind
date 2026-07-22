import 'package:egx_trade_journal/core/calc/risk_math.dart';
import 'package:egx_trade_journal/core/calc/smart_trade.dart';
import 'package:flutter_test/flutter_test.dart';

SmartTradePlan plan({
  double? entry,
  double tp = 0.05,
  double sl = 0.02,
  double capital = 17000,
  double maxRisk = 0.02,
  int? userQty,
}) => SmartTradePlan.compute(
  capital: capital,
  maxRiskPercent: maxRisk,
  takeProfitPercent: tp,
  stopLossPercent: sl,
  entryPrice: entry,
  userQty: userQty,
);

void main() {
  group('rounding to the piastre', () {
    test('rounds to two decimals', () {
      expect(roundToPiastre(39.592), 39.59);
      expect(roundToPiastre(42.419999999999995), 42.42);
      expect(roundToPiastre(10.005), 10.01);
    });

    test('returns null for unusable input rather than NaN', () {
      expect(roundToPiastre(double.nan), isNull);
      expect(roundToPiastre(double.infinity), isNull);
    });
  });

  group("the spec's worked example", () {
    // Entry 40.40, TP 5% -> 42.42, SL 2% -> 39.59
    final p = plan(entry: 40.40, tp: 0.05, sl: 0.02);

    test('derives both prices exactly as specified', () {
      expect(p.takeProfitPrice, 42.42);
      expect(p.stopLossPrice, 39.59);
    });

    test('per-share reward and risk come from the rounded prices', () {
      // What is displayed is what is computed — no hidden extra precision.
      expect(p.rewardPerShare, closeTo(2.02, 1e-9));
      expect(p.riskPerShare, closeTo(0.81, 1e-9));
    });

    test('reward/risk and quality follow', () {
      expect(p.rewardRiskRatio, closeTo(2.02 / 0.81, 1e-9));
      expect(p.quality, TradeQuality.good);
      expect(p.rewardBeatsRisk, isTrue);
    });

    test('sizing comes from the shared risk rule', () {
      // maxLoss 340 / risk-per-share 0.81 -> 419 shares.
      expect(p.sizing.suggestedQty, 419);
      expect(p.sizing.overRisk, isFalse);
      expect(p.expectedProfit, closeTo(2.02 * 419, 1e-9));
      expect(p.expectedLoss, closeTo(-0.81 * 419, 1e-9));
      expect(p.expectedLoss, isNegative);
    });
  });

  group('quality bands', () {
    test('reward at twice the risk is good', () {
      // 4% target against a 2% stop.
      final p = plan(entry: 100.00, tp: 0.04, sl: 0.02);
      expect(p.takeProfitPrice, 104.00);
      expect(p.stopLossPrice, 98.00);
      expect(p.rewardRiskRatio, closeTo(2.0, 1e-12));
      expect(p.quality, TradeQuality.good);
    });

    // The float trap: a ratio meant to be exactly 2.0 can land a hair under it
    // once the prices are rounded, and a bare `>=` would flip the badge.
    test('a ratio that lands a hair under 2 is still good', () {
      const justUnder = 2 - 1e-12;
      expect(meetsRatio(justUnder, 2), isTrue);
    });

    test('between one and two warns', () {
      final p = plan(entry: 100.00, tp: 0.03, sl: 0.02);
      expect(p.rewardRiskRatio, closeTo(1.5, 1e-12));
      expect(p.quality, TradeQuality.warning);
    });

    test('exactly one warns rather than reading as good', () {
      final p = plan(entry: 100.00, tp: 0.02, sl: 0.02);
      expect(p.rewardRiskRatio, closeTo(1.0, 1e-12));
      expect(p.quality, TradeQuality.warning);
      expect(
        p.rewardBeatsRisk,
        isFalse,
        reason: 'the card is green only when reward STRICTLY exceeds risk',
      );
    });

    test('below one is bad', () {
      final p = plan(entry: 100.00, tp: 0.01, sl: 0.03);
      expect(p.rewardRiskRatio, closeTo(1 / 3, 1e-12));
      expect(p.quality, TradeQuality.bad);
      expect(p.rewardBeatsRisk, isFalse);
    });
  });

  group('partial and invalid input never throws', () {
    test('no entry price yet', () {
      final p = plan();
      expect(p.takeProfitPrice, isNull);
      expect(p.stopLossPrice, isNull);
      expect(p.rewardRiskRatio, isNull);
      expect(p.quality, isNull);
      expect(p.expectedProfit, isNull);
      expect(p.rewardBeatsRisk, isFalse);
    });

    test('a zero or negative entry is treated as not entered', () {
      expect(plan(entry: 0).takeProfitPrice, isNull);
      expect(plan(entry: -5).stopLossPrice, isNull);
    });

    test('zero percentages produce no levels', () {
      final p = plan(entry: 40.40, tp: 0, sl: 0);
      expect(p.takeProfitPrice, isNull);
      expect(p.stopLossPrice, isNull);
      expect(p.quality, isNull);
    });

    test('a stop of 100% or more is rejected', () {
      final p = plan(entry: 40.40, sl: 1.0);
      expect(p.stopLossPrice, isNull, reason: 'would price the stop at zero');
    });

    // Rounding can collapse a tiny percentage back onto the entry price, which
    // would otherwise yield a zero-risk trade and an infinite ratio.
    test('a percentage too small to move the price is discarded', () {
      final p = plan(entry: 2.00, tp: 0.001, sl: 0.001);
      expect(p.takeProfitPrice, isNull);
      expect(p.stopLossPrice, isNull);
      expect(p.rewardRiskRatio, isNull);
      expect(p.quality, isNull);
    });

    test('every returned double is finite or null', () {
      for (final p in [
        plan(),
        plan(entry: 0),
        plan(entry: 40.40, tp: 0, sl: 0),
        plan(entry: 40.40, capital: 0),
        plan(entry: double.nan),
      ]) {
        for (final value in [
          p.takeProfitPrice,
          p.stopLossPrice,
          p.rewardPerShare,
          p.riskPerShare,
          p.rewardRiskRatio,
          p.expectedProfit,
          p.expectedLoss,
        ]) {
          expect(value == null || value.isFinite, isTrue);
        }
      }
    });

    test('zero capital still derives the prices but sizes nothing', () {
      final p = plan(entry: 40.40, capital: 0);
      expect(p.takeProfitPrice, 42.42);
      expect(p.stopLossPrice, 39.59);
      expect(p.sizing.suggestedQty, isNull);
      expect(p.expectedProfit, isNull);
      expect(p.sizing.overRisk, isFalse);
    });
  });

  group('a user-supplied quantity overrides the suggestion', () {
    test('expected profit and loss follow the chosen size', () {
      final p = plan(entry: 40.40, userQty: 100);
      expect(p.sizing.effectiveQty, 100);
      expect(p.expectedProfit, closeTo(202.0, 1e-9));
      expect(p.expectedLoss, closeTo(-81.0, 1e-9));
    });

    test('an oversized quantity is flagged by the existing risk rule', () {
      // 419 is the limit; 500 breaches it.
      final p = plan(entry: 40.40, userQty: 500);
      expect(p.sizing.overRisk, isTrue);
    });
  });

  test('quality labels match the specified strings', () {
    expect(TradeQuality.good.label, '✅ صفقة جيدة');
    expect(TradeQuality.warning.label, '⚠️ المخاطرة مرتفعة');
    expect(TradeQuality.bad.label, '❌ العائد لا يبرر المخاطرة');
  });
}
