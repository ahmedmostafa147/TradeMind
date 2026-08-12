import 'package:egx_trade_journal/core/calc/goal_plan.dart';
import 'package:flutter_test/flutter_test.dart';

/// The savings planner behind «الهدف» — the landing page's calculator, now
/// shared by the site and the app.
///
/// It is deliberately NOT `goal_projection.dart`: that one reads the edge off
/// the journal and refuses to invent a rate. This one takes the rate as an
/// assumption, which is exactly why its edges need pinning down — an assumed
/// rate is the one input a user can push somewhere absurd.
void main() {
  GoalPlan monthlyFor({
    double target = 2000000,
    double years = 18,
    double annual = 20,
    double initial = 50000,
  }) => computeGoalPlan(
    mode: GoalPlanMode.targetToMonthly,
    targetAmount: target,
    years: years,
    annualReturnPercent: annual,
    initialAmount: initial,
  );

  GoalPlan valueFor({
    double monthly = 3000,
    double years = 18,
    double annual = 20,
    double initial = 50000,
  }) => computeGoalPlan(
    mode: GoalPlanMode.monthlyToTarget,
    monthlyDeposit: monthly,
    years: years,
    annualReturnPercent: annual,
    initialAmount: initial,
  );

  group('the monthly rate is effective, not annual ÷ 12', () {
    test('12 monthly steps compound to exactly the annual rate', () {
      final plan = valueFor(monthly: 0, initial: 1000, years: 1, annual: 20);
      // 1,000 at 20% for one year is 1,200 — not 1,000 × (1 + 0.20/12)^12,
      // which would be 1,219.39 and quietly overstate every horizon.
      expect(plan.futureValue, closeTo(1200, 0.01));
    });

    test('a zero rate is plain addition, not a division by zero', () {
      final plan = valueFor(monthly: 1000, initial: 0, years: 2, annual: 0);
      expect(plan.futureValue, closeTo(24000, 0.01));
      expect(plan.growth, 0);
    });
  });

  group('target → monthly', () {
    test('the required deposit actually reaches the target', () {
      final plan = monthlyFor();

      // Feed the answer back through the other direction: the two formulas are
      // inverses, so this is the only check that matters.
      final back = valueFor(monthly: plan.monthlyDeposit);
      expect(back.futureValue, closeTo(2000000, 1));
    });

    test('total deposited counts the starting amount, not only the monthlies',
        () {
      final plan = monthlyFor();
      expect(
        plan.totalDeposited,
        closeTo(50000 + plan.monthlyDeposit * 216, 0.01),
      );
      expect(plan.growth, closeTo(2000000 - plan.totalDeposited, 0.01));
    });

    test('with no return at all it is the target split over the months', () {
      final plan = monthlyFor(annual: 0, initial: 0, target: 240000, years: 10);
      expect(plan.monthlyDeposit, closeTo(2000, 0.01));
      expect(plan.growth, 0);
    });

    test('a starting amount that already gets there asks for nothing', () {
      // 500,000 at 20% for 18 years passes 2,000,000 on its own.
      final plan = monthlyFor(initial: 500000);

      expect(plan.monthlyDeposit, 0);
      expect(plan.coveredByInitial, isTrue);
      // AND IT REPORTS WHERE IT ACTUALLY LANDS, not the target. Printing the
      // target here would hide that the plan overshoots by millions.
      expect(plan.futureValue, greaterThan(2000000));
      expect(plan.totalDeposited, 500000);
    });

    test('an empty target is not "already covered"', () {
      // Nothing typed yet is a blank form, not an achievement.
      final plan = monthlyFor(target: 0, initial: 0);
      expect(plan.coveredByInitial, isFalse);
      expect(plan.monthlyDeposit, 0);
    });
  });

  group('monthly → target', () {
    test('deposits and the starting amount both compound', () {
      final plan = valueFor(monthly: 1000, initial: 10000, years: 5, annual: 12);

      expect(plan.totalDeposited, closeTo(10000 + 60000, 0.01));
      expect(plan.futureValue, greaterThan(plan.totalDeposited));
      expect(
        plan.growth,
        closeTo(plan.futureValue - plan.totalDeposited, 0.01),
      );
    });

    test('the growth share is of the end result, not of the deposits', () {
      final plan = valueFor();
      expect(
        plan.growthShare,
        closeTo(plan.growth / plan.futureValue, 1e-9),
      );
      expect(plan.growthShare, lessThan(1));
    });
  });

  group('the assumption cannot be pushed somewhere absurd', () {
    test('a negative return is treated as zero, never as a negative deposit',
        () {
      // Left signed, the annuity formula returns a NEGATIVE required deposit —
      // a plan that appears to pay the saver.
      final plan = monthlyFor(annual: -30, initial: 0, target: 120000, years: 10);
      expect(plan.monthlyDeposit, greaterThan(0));
      expect(plan.monthlyDeposit, closeTo(1000, 0.01));
    });

    test('the return is capped', () {
      final wild = valueFor(annual: 5000);
      final capped = valueFor(annual: kMaxAnnualReturn);
      expect(wild.futureValue, capped.futureValue);
    });

    test('the horizon is clamped at both ends', () {
      expect(valueFor(years: 0).months, kMinGoalYears * 12);
      expect(valueFor(years: 900).months, kMaxGoalYears * 12);
    });

    test('missing input yields zeros, never NaN', () {
      final plan = computeGoalPlan(mode: GoalPlanMode.monthlyToTarget);
      expect(plan.futureValue, 0);
      expect(plan.growth, 0);
      expect(plan.growthShare, isNull);
    });
  });

  group('annualReturnFromMonthlyRate', () {
    test('compounds a monthly rate into its annual equivalent', () {
      // 1% a month is 12.68% a year, not 12%.
      expect(annualReturnFromMonthlyRate(0.01), closeTo(12.6825, 0.001));
    });

    test('a losing or absent journal yields no default at all', () {
      // Substituting a house number here would present a guess as a
      // measurement, which is the one thing this feature must not do.
      expect(annualReturnFromMonthlyRate(null), isNull);
      expect(annualReturnFromMonthlyRate(0), isNull);
      expect(annualReturnFromMonthlyRate(-0.02), isNull);
      expect(annualReturnFromMonthlyRate(double.nan), isNull);
    });

    test('an extraordinary month is capped like a typed rate', () {
      expect(annualReturnFromMonthlyRate(0.5), kMaxAnnualReturn);
    });
  });
}
