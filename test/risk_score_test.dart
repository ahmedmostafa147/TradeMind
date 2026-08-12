import 'package:egx_trade_journal/core/calc/risk_math.dart';
import 'package:egx_trade_journal/core/calc/risk_score.dart';
import 'package:egx_trade_journal/trades/checklist.dart';
import 'package:egx_trade_journal/trades/trade.dart';
import 'package:flutter_test/flutter_test.dart';

const _fullChecklist = [
  'trend',
  'levels',
  'volume',
  'risk',
  'size',
  'news',
];

/// 21 characters — one past the "> 20" threshold.
const _longReason = 'اختراق مقاومة قوي جدا';

Trade makeTrade({
  double entry = 10.00,
  double stop = 9.50,
  int qty = 680,
  String reason = _longReason,
  List<String> checklist = _fullChecklist,
  List<String> screenshots = const ['/tmp/a.png'],
}) => Trade(
  id: 't1',
  entryDate: DateTime(2026, 3, 1),
  ticker: 'COMI',
  reason: reason,
  entryPrice: entry,
  stopPrice: stop,
  quantity: qty,
  completedChecklistItems: checklist,
  screenshotPaths: screenshots,
);

RiskScore scoreOf(Trade t, {double capital = 17000, double maxRisk = 0.02}) =>
    RiskScore.of(t, capital: capital, maxRiskPercent: maxRisk);

void main() {
  test('a fully prepared trade scores 100 and grades ممتاز', () {
    final score = scoreOf(makeTrade());
    expect(score.value, 100);
    expect(score.grade, RiskGrade.excellent);
    expect(score.grade.label, 'ممتاز');
  });

  test('a trade with nothing prepared scores 0 and grades ضعيف', () {
    final score = scoreOf(
      makeTrade(
        stop: 0, // no stop
        reason: 'حدس',
        checklist: const [],
        screenshots: const [],
      ),
    );
    expect(score.value, 0);
    expect(score.grade, RiskGrade.poor);
  });

  group('the risk component uses the guarded comparison', () {
    test('exactly at the limit still earns its 20 points', () {
      // 680 shares at 0.50 risk on 17,000 capital is precisely 2.0%.
      final score = scoreOf(makeTrade());
      expect(score.riskWithinLimit, isTrue);
    });

    // The phase-1 float trap, re-entered through section 10's wording. A bare
    // `riskPct <= maxRiskPercent` returns false here and silently costs the
    // trade 20 points.
    test('a position sized by our own calculator earns its 20 points', () {
      const capital = 10000.0;
      const maxRisk = 0.01;
      final qty = suggestedQuantity(
        maxLoss: maxLossPerTrade(capital: capital, maxRiskPercent: maxRisk),
        entry: 1.10,
        stop: 1.00,
      );
      expect(qty, 1000);

      final score = scoreOf(
        makeTrade(entry: 1.10, stop: 1.00, qty: qty!),
        capital: capital,
        maxRisk: maxRisk,
      );
      expect(
        score.riskWithinLimit,
        isTrue,
        reason: 'float noise must not cost the trade 20 points',
      );
      expect(score.value, 100);
    });

    test('a genuine breach loses the 25 points', () {
      final score = scoreOf(makeTrade(qty: 700));
      expect(score.riskWithinLimit, isFalse);
      expect(score.value, 75);
      expect(score.grade, RiskGrade.good);
    });

    test('unusable capital earns no credit rather than free points', () {
      final score = scoreOf(makeTrade(), capital: 0);
      expect(score.riskWithinLimit, isFalse);
    });
  });

  group('individual components', () {
    test('an incomplete checklist loses its 25 points', () {
      final score = scoreOf(makeTrade(checklist: const ['trend', 'volume']));
      expect(score.checklistComplete, isFalse);
      expect(score.value, 75);
    });

    test('a stop above entry does not count as a stop', () {
      final score = scoreOf(makeTrade(entry: 9.0, stop: 10.0));
      expect(score.hasStop, isFalse);
    });

    test('reason length is strictly greater than 20, measured trimmed', () {
      expect(scoreOf(makeTrade(reason: 'ا' * 21)).hasDetailedReason, isTrue);
      expect(scoreOf(makeTrade(reason: 'ا' * 20)).hasDetailedReason, isFalse);
      expect(
        scoreOf(makeTrade(reason: '${'ا' * 20}          ')).hasDetailedReason,
        isFalse,
        reason: 'padding with spaces must not buy a point',
      );
    });

    // «صورة من الشارت مرفقة» WAS A FIFTH COMPONENT AND IS NOT ANY MORE.
    //
    // It could only be earned on the phone — chart images are files in device
    // storage and only their paths sync — so every trade logged from the website
    // was capped at 80 with no action available to raise it. See the note on
    // RiskScore for the full reasoning. This test guards that it does not creep
    // back in without both surfaces being able to earn it.
    test('attached screenshots do not change the score', () {
      final withImages = scoreOf(makeTrade(screenshots: const ['/tmp/a.png']));
      final without = scoreOf(makeTrade(screenshots: const []));
      expect(withImages.value, without.value);
      expect(withImages.value, 100);
    });
  });

  group('grade thresholds land on the 25-point grid', () {
    // A valid stop at exactly the risk limit is held constant, so two
    // components (hasStop, riskWithinLimit) always score. That fixes the floor
    // at 50 and lets the remaining two be toggled one at a time for a clean
    // 50 → 75 → 100 ladder.
    RiskScore withExtras(int extras) => scoreOf(
      makeTrade(
        checklist: extras >= 1 ? _fullChecklist : const [],
        reason: extras >= 2 ? _longReason : 'قصير',
      ),
    );

    test('the two constant components put the floor at 50', () {
      expect(withExtras(0).value, 50);
      expect(withExtras(0).grade, RiskGrade.average);
    });

    test('each further component adds exactly 25', () {
      expect(withExtras(1).value, 75);
      expect(withExtras(2).value, 100);
    });

    test('grades map to the grid', () {
      expect(withExtras(1).grade, RiskGrade.good);
      expect(withExtras(2).grade, RiskGrade.excellent);
    });

    test('a single earned component is still ضعيف', () {
      // 25 is the lowest non-zero score the formula can produce, and the poor
      // band has to reach it — the old thresholds bottomed out at 40.
      final score = scoreOf(
        makeTrade(stop: 0, reason: 'حدس', checklist: _fullChecklist),
      );
      expect(score.value, 25);
      expect(score.grade, RiskGrade.poor);
    });
  });

  group('checklist completion', () {
    test('is a fraction of all defined items', () {
      expect(checklistCompletion(const []), 0.0);
      expect(checklistCompletion(_fullChecklist), 1.0);
      expect(
        checklistCompletion(const ['trend', 'volume', 'news']),
        closeTo(0.5, 1e-12),
      );
    });

    test('ignores unknown ids so a stale record cannot exceed 100%', () {
      expect(
        checklistCompletion([..._fullChecklist, 'removed_in_a_later_build']),
        1.0,
      );
      expect(checklistCompletion(const ['nonsense']), 0.0);
    });

    test('ignores duplicates', () {
      expect(
        checklistCompletion(const ['trend', 'trend', 'trend']),
        closeTo(1 / 6, 1e-12),
      );
    });

    test('isChecklistComplete only at every item', () {
      expect(isChecklistComplete(_fullChecklist), isTrue);
      expect(isChecklistComplete(_fullChecklist.sublist(0, 5)), isFalse);
    });
  });
}
