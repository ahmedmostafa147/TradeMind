import 'package:egx_trade_journal/core/calc/compound.dart';
import 'package:flutter_test/flutter_test.dart';

/// The compound calculator is the one screen that prints a number about the
/// user's future rather than their past, so a wrong figure here is not a
/// cosmetic bug — it is a promise the arithmetic did not keep.
void main() {
  group('project', () {
    test('a lump sum with no deposits matches the closed form', () {
      // 100 at 10% compounded monthly for 40 years:
      //   100 * (1 + 0.10/12)^480 = 5370.0663
      // This is the headline example — a hundred pounds and forty years — so
      // the expected figure is pinned tight rather than approximated.
      final r = project(
        initial: 100,
        monthly: 0,
        annualRate: 0.10,
        years: 40,
      );

      expect(r.futureValue, closeTo(5370.07, 0.05));
      expect(r.totalContributed, 100);
      expect(r.totalGrowth, closeTo(r.futureValue - 100, 1e-9));
    });

    test('monthly compounding, not annual', () {
      // The distinction is worth an explicit test: annual compounding of the
      // same inputs gives 100 * 1.1^40 = 4525.93, which is ~15% lower. A
      // regression to annual would look plausible and be wrong by hundreds.
      final monthly = project(initial: 100, monthly: 0, annualRate: 0.10, years: 40);
      expect(monthly.futureValue, greaterThan(5000));
      expect(monthly.futureValue, isNot(closeTo(4525.93, 50)));
    });

    test('a zero rate is money piling up, not a division by zero', () {
      final r = project(initial: 1000, monthly: 500, annualRate: 0, years: 3);

      expect(r.futureValue, closeTo(1000 + 500 * 36, 1e-9));
      expect(r.totalGrowth, closeTo(0, 1e-9));
      expect(r.futureValue.isFinite, isTrue);
    });

    test('deposits land at the END of the month', () {
      // One year, one deposit of 100 a month, 12% a year = 1% a month.
      // Ordinary annuity: 100 * ((1.01^12 - 1)/0.01) = 1268.25
      // Annuity due (start of month) would be 1% more, 1280.93 — close enough
      // to look right and wrong by a year's growth over a long horizon.
      final r = project(initial: 0, monthly: 100, annualRate: 0.12, years: 1);

      expect(r.futureValue, closeTo(1268.25, 0.05));
      expect(r.futureValue, isNot(closeTo(1280.93, 1)));
    });

    test('the real value strips inflation out of the nominal one', () {
      // The number that stops this feature from being a lie in an economy with
      // 25% inflation.
      final r = project(
        initial: 10000,
        monthly: 0,
        annualRate: 0.20,
        years: 10,
        annualInflation: 0.20,
      );

      // nominal  = 10000 * (1 + 0.20/12)^120 = 72,682.55
      // deflator = 1.20^10                   =      6.1917
      // real     =                             11,738.64
      expect(r.futureValue, closeTo(72682.55, 0.5));
      expect(r.realValue, closeTo(11738.64, 0.5));

      // ABOVE the opening 10,000, and the reason is the whole point of the
      // monthly-compounding test above: a 20% headline rate compounded monthly
      // is an effective 21.94% a year, so it does beat 20% annual inflation —
      // by 17% over a decade. "Same rate as inflation" is not the same as
      // "standing still" once the compounding periods differ, and a reader who
      // expects 10,000 here has found the wrong intuition, not a bug.
      expect(r.realValue, greaterThan(10000));
      expect(r.realValue, lessThan(r.futureValue));
    });

    test('no inflation leaves the real value equal to the nominal', () {
      final r = project(initial: 5000, monthly: 100, annualRate: 0.08, years: 5);
      expect(r.realValue, closeTo(r.futureValue, 1e-9));
    });

    test('the series has one row per year plus the opening balance', () {
      final r = project(initial: 1000, monthly: 50, annualRate: 0.05, years: 10);

      expect(r.byYear.length, 11);
      expect(r.byYear.first.year, 0);
      expect(r.byYear.first.balance, 1000);
      expect(r.byYear.last.year, 10);
      expect(r.byYear.last.balance, closeTo(r.futureValue, 1e-9));

      // Contributed must never fall, and must never include growth.
      for (var i = 1; i < r.byYear.length; i++) {
        expect(
          r.byYear[i].contributed,
          greaterThanOrEqualTo(r.byYear[i - 1].contributed),
        );
        expect(r.byYear[i].growth, closeTo(
          r.byYear[i].balance - r.byYear[i].contributed, 1e-9));
      }
    });

    test('garbage input returns zero instead of throwing', () {
      for (final bad in <double>[double.nan, double.infinity, -5]) {
        final r = project(initial: bad, monthly: bad, annualRate: 0.1, years: 5);
        expect(r.futureValue.isFinite, isTrue, reason: 'initial/monthly = $bad');
        expect(r.futureValue, 0);
      }

      final noTime = project(initial: 100, monthly: 10, annualRate: 0.1, years: 0);
      expect(noTime.futureValue, 100);
      expect(noTime.byYear.length, 1);
    });

    test('growthMultiple is null rather than zero on an empty plan', () {
      expect(project(initial: 0, monthly: 0, annualRate: 0.1, years: 5)
          .growthMultiple, isNull);
      expect(project(initial: 100, monthly: 0, annualRate: 0.1, years: 10)
          .growthMultiple, greaterThan(1));
    });
  });

  group('monthlyNeededFor', () {
    test('round-trips against project', () {
      // The property that matters: whatever this says to deposit, depositing it
      // must actually land on the target.
      const target = 1500000.0;
      final monthly = monthlyNeededFor(
        target: target,
        initial: 50000,
        annualRate: 0.12,
        years: 18,
      );

      expect(monthly, isNotNull);
      final back = project(
        initial: 50000,
        monthly: monthly!,
        annualRate: 0.12,
        years: 18,
      );
      expect(back.futureValue, closeTo(target, 1));
    });

    test('round-trips at a zero rate too', () {
      final monthly = monthlyNeededFor(
        target: 36000,
        initial: 0,
        annualRate: 0,
        years: 3,
      );
      expect(monthly, closeTo(1000, 1e-9));

      final back = project(initial: 0, monthly: monthly!, annualRate: 0, years: 3);
      expect(back.futureValue, closeTo(36000, 1e-6));
    });

    test('returns zero, never a negative deposit, when the start already gets there', () {
      final monthly = monthlyNeededFor(
        target: 1000,
        initial: 100000,
        annualRate: 0.10,
        years: 5,
      );
      expect(monthly, 0);
    });

    test('returns null only for input with no answer', () {
      expect(monthlyNeededFor(target: 1000, initial: 0, annualRate: 0.1, years: 0), isNull);
      expect(monthlyNeededFor(target: 0, initial: 0, annualRate: 0.1, years: 5), isNull);
      expect(monthlyNeededFor(target: double.nan, initial: 0, annualRate: 0.1, years: 5), isNull);
    });
  });

  group('scenarios', () {
    test('ids are unique and every field is filled', () {
      final ids = kSavingScenarios.map((s) => s.id).toSet();
      expect(ids.length, kSavingScenarios.length);

      for (final s in kSavingScenarios) {
        expect(s.label.trim(), isNotEmpty, reason: s.id);
        expect(s.description.trim(), isNotEmpty, reason: s.id);
        expect(s.target, greaterThan(0), reason: s.id);
        expect(s.years, greaterThan(0), reason: s.id);
      }
    });

    test('no scenario suggests a rate of return', () {
      // The guard for the promise in compound.dart's header and in the
      // published terms: the app supplies the SHAPE of a goal, never the
      // return. If a `rate` field is ever added to SavingScenario, this test
      // is where that decision has to be argued.
      for (final s in kSavingScenarios) {
        expect(
          s.toString().toLowerCase(),
          isNot(contains('rate')),
          reason: '${s.id} must not carry a suggested rate of return',
        );
      }
    });
  });
}
