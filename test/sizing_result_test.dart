import 'package:egx_trade_journal/core/calc/sizing_result.dart';
import 'package:flutter_test/flutter_test.dart';

SizingResult compute({
  double capital = 17000,
  double maxRisk = 0.02,
  double? entry,
  double? stop,
  int? userQty,
}) => SizingResult.compute(
  capital: capital,
  maxRiskPercent: maxRisk,
  entry: entry,
  stop: stop,
  userQty: userQty,
);

void main() {
  group('spec acceptance fixture on the calculator', () {
    final r = compute(entry: 10.00, stop: 9.50);

    test('shows the loss budget and per-share risk', () {
      expect(r.maxLoss, 340.0);
      expect(r.riskPerShare, 0.5);
    });

    test('suggests 680 shares', () {
      expect(r.suggestedQty, 680);
      expect(r.effectiveQty, 680);
    });

    test('position value, risk and risk % match the spec', () {
      expect(r.positionValue, 6800.0);
      expect(r.riskEgp, 340.0);
      expect(r.riskPct, closeTo(0.02, 1e-12));
    });

    test('exactly at the limit is not flagged', () {
      expect(r.overRisk, isFalse);
      expect(r.capitalTooSmall, isFalse);
    });
  });

  test('the suggestion it renders is never itself over the limit', () {
    // Same coupled-epsilon guarantee as trade_metrics_test, but through the
    // path the calculator screen actually uses.
    final r = compute(capital: 10000, maxRisk: 0.01, entry: 1.10, stop: 1.00);
    expect(r.suggestedQty, 1000);
    expect(r.overRisk, isFalse);
  });

  group('partial and invalid input never throws', () {
    test('nothing typed yet', () {
      final r = compute();
      expect(r.suggestedQty, isNull);
      expect(r.riskPerShare, isNull);
      expect(r.positionValue, isNull);
      expect(r.riskPct, isNull);
      expect(r.overRisk, isFalse);
      expect(r.maxLoss, 340.0);
    });

    test('only entry typed', () {
      final r = compute(entry: 10.0);
      expect(r.suggestedQty, isNull);
      expect(r.riskPerShare, isNull);
    });

    test('entry equal to stop', () {
      final r = compute(entry: 10.0, stop: 10.0);
      expect(r.riskPerShare, isNull);
      expect(r.suggestedQty, isNull);
      expect(r.overRisk, isFalse);
    });

    test('stop above entry', () {
      final r = compute(entry: 9.0, stop: 10.0);
      expect(r.suggestedQty, isNull);
      expect(r.riskPct, isNull);
    });

    test('zero prices are treated as not yet entered', () {
      expect(compute(entry: 0, stop: 0).suggestedQty, isNull);
      expect(compute(entry: 10, stop: 0).suggestedQty, isNull);
    });

    test('zero capital yields no budget and no flag', () {
      final r = compute(capital: 0, entry: 10.0, stop: 9.5);
      expect(r.maxLoss, 0);
      expect(r.suggestedQty, isNull);
      expect(r.riskPct, isNull);
      expect(r.overRisk, isFalse);
    });
  });

  test('a budget too small for one share is reported, not silently zero', () {
    final r = compute(capital: 100, maxRisk: 0.01, entry: 10.0, stop: 5.0);
    expect(r.suggestedQty, 0);
    expect(r.capitalTooSmall, isTrue);
    // With no shares there is no position to value.
    expect(r.positionValue, isNull);
    expect(r.riskPct, isNull);
  });

  group('a user-supplied quantity overrides the suggestion', () {
    test('oversized quantity is flagged', () {
      final r = compute(entry: 10.00, stop: 9.50, userQty: 700);
      expect(r.effectiveQty, 700);
      expect(r.suggestedQty, 680, reason: 'the suggestion is still shown');
      expect(r.riskEgp, 350.0);
      expect(r.riskPct, closeTo(350 / 17000, 1e-12));
      expect(r.overRisk, isTrue);
    });

    test('undersized quantity is fine', () {
      final r = compute(entry: 10.00, stop: 9.50, userQty: 100);
      expect(r.effectiveQty, 100);
      expect(r.positionValue, 1000.0);
      expect(r.overRisk, isFalse);
    });

    test('zero or negative quantity falls back to the suggestion', () {
      expect(compute(entry: 10.0, stop: 9.5, userQty: 0).effectiveQty, 680);
      expect(compute(entry: 10.0, stop: 9.5, userQty: -5).effectiveQty, 680);
    });
  });

  test('SizingResult.empty is inert', () {
    expect(SizingResult.empty.suggestedQty, isNull);
    expect(SizingResult.empty.overRisk, isFalse);
    expect(SizingResult.empty.maxLoss, 0);
  });
}
