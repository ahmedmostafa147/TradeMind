/// «هدف ادخاري»: كام أحطّ شهريًا عشان أوصل لمبلغ، أو المبلغ ده هيوصل لكام.
///
/// MIRROR OF site/lib/goal-plan.ts. Same formulas, same clamps, same branches —
/// CLAUDE.md §5 requires the two to change in the same commit.
///
/// THIS IS NOT [GoalProjection], AND THE DIFFERENCE MATTERS.
/// `goal_projection.dart` answers «بأداء دفترك، توصل إمتى» — it reads the edge
/// off the closed trades and refuses to invent a return rate. This file answers
/// the savings question: «لو المفروض العائد كذا، أحطّ كام في الشهر». The rate
/// here is an ASSUMPTION THE USER TYPES, and every surface that renders it has
/// to say so — a planner that presents an assumed 20% as a forecast is exactly
/// the "flatter the guess" tool the projection was written to avoid being.
///
///   monthly rate = (1 + annual)^(1/12) − 1     ← effective, not annual ÷ 12
///   FV of a lump = P × (1 + r)^n
///   FV of a series = D × ((1 + r)^n − 1) ÷ r
///
/// Pure Dart, zero Flutter imports, like everything else in core/calc.
library;

import 'dart:math' as math;

enum GoalPlanMode {
  /// «عندي مبلغ مستهدف — أحطّ كام في الشهر؟»
  targetToMonthly,

  /// «هحطّ كذا في الشهر — هوصل لكام؟»
  monthlyToTarget,
}

/// A horizon shorter than a year is not a savings plan, and one longer than
/// fifty says more about the arithmetic than about the saver.
const int kMinGoalYears = 1;
const int kMaxGoalYears = 50;

/// The rate is an assumption, and an unbounded one turns the planner into a
/// fantasy generator: 200% for 18 years multiplies a deposit by nine million.
const double kMaxAnnualReturn = 100;

class GoalPlan {
  final GoalPlanMode mode;

  /// What to put in every month. Zero when [coveredByInitial].
  final double monthlyDeposit;

  /// Where the plan lands.
  final double futureValue;

  /// Everything the saver actually puts in: the starting amount plus every
  /// deposit. The honest denominator for "how much of this is growth".
  final double totalDeposited;

  /// [futureValue] − [totalDeposited]. Never negative while the rate is.
  final double growth;

  final int months;

  /// The effective monthly rate the plan ran on, so callers can show it.
  final double monthlyRate;

  /// The starting amount alone already compounds past the target, so nothing
  /// needs to be added monthly. Distinct from "put in 0" so the UI can say why
  /// instead of printing a bare zero.
  final bool coveredByInitial;

  const GoalPlan._({
    required this.mode,
    required this.monthlyDeposit,
    required this.futureValue,
    required this.totalDeposited,
    required this.growth,
    required this.months,
    required this.monthlyRate,
    required this.coveredByInitial,
  });

  /// Share of the end result that came from compounding rather than from the
  /// saver's pocket. Null when there is no result to take a share of.
  double? get growthShare =>
      futureValue > 0 ? growth / futureValue : null;
}

/// Tolerant of half-typed input like every other calculator here: nothing
/// throws, and an unusable field falls back to a stated default rather than to
/// NaN.
GoalPlan computeGoalPlan({
  required GoalPlanMode mode,
  double? targetAmount,
  double? monthlyDeposit,
  double? years,
  double? annualReturnPercent,
  double? initialAmount,
}) {
  final n = (_clampYears(years) * 12).round();

  // A negative expected return is not a savings assumption, it is a different
  // question — and it breaks the annuity formula's sign, producing a NEGATIVE
  // required deposit that reads as "the plan pays you".
  final annual = _finiteOrZero(annualReturnPercent).clamp(0.0, kMaxAnnualReturn);
  final monthlyRate =
      annual == 0 ? 0.0 : math.pow(1 + annual / 100, 1 / 12).toDouble() - 1.0;

  final initial = math.max(0.0, _finiteOrZero(initialAmount));
  final growthFactor = math.pow(1 + monthlyRate, n).toDouble();
  final initialFv = initial * growthFactor;

  if (mode == GoalPlanMode.monthlyToTarget) {
    final deposit = math.max(0.0, _finiteOrZero(monthlyDeposit));
    final depositsFv = monthlyRate == 0
        ? deposit * n
        : deposit * ((growthFactor - 1) / monthlyRate);

    final futureValue = initialFv + depositsFv;
    final totalDeposited = initial + deposit * n;

    return GoalPlan._(
      mode: mode,
      monthlyDeposit: deposit,
      futureValue: futureValue,
      totalDeposited: totalDeposited,
      growth: math.max(0.0, futureValue - totalDeposited),
      months: n,
      monthlyRate: monthlyRate,
      coveredByInitial: false,
    );
  }

  final target = math.max(0.0, _finiteOrZero(targetAmount));

  // The starting amount already gets there on its own. Reporting the target as
  // the future value would hide that the plan overshoots, so the real landing
  // figure is reported instead.
  if (initialFv >= target) {
    return GoalPlan._(
      mode: mode,
      monthlyDeposit: 0,
      futureValue: initialFv,
      totalDeposited: initial,
      growth: math.max(0.0, initialFv - initial),
      months: n,
      monthlyRate: monthlyRate,
      coveredByInitial: target > 0,
    );
  }

  final shortfall = target - initialFv;
  final required = monthlyRate == 0
      ? shortfall / n
      : shortfall * monthlyRate / (growthFactor - 1);

  final totalDeposited = initial + required * n;

  return GoalPlan._(
    mode: mode,
    monthlyDeposit: required,
    futureValue: target,
    totalDeposited: totalDeposited,
    growth: math.max(0.0, target - totalDeposited),
    months: n,
    monthlyRate: monthlyRate,
    coveredByInitial: false,
  );
}

/// The annual rate a journal is actually running at, for pre-filling the
/// assumption instead of guessing it.
///
/// Takes the monthly rate `goal_projection.dart` already derived from closed
/// trades and compounds it to a year. Null when there is no usable edge — the
/// caller must NOT substitute a house number, because a default that looks
/// measured but is not is worse than an obviously arbitrary one.
double? annualReturnFromMonthlyRate(double? monthlyRate) {
  if (monthlyRate == null || !monthlyRate.isFinite || monthlyRate <= 0) {
    return null;
  }
  final annual = (math.pow(1 + monthlyRate, 12) - 1) * 100;
  if (!annual.isFinite || annual <= 0) return null;
  return annual > kMaxAnnualReturn ? kMaxAnnualReturn : annual.toDouble();
}

double _clampYears(double? years) {
  final value = _finiteOrZero(years);
  if (value < kMinGoalYears) return kMinGoalYears.toDouble();
  if (value > kMaxGoalYears) return kMaxGoalYears.toDouble();
  return value;
}

double _finiteOrZero(double? value) =>
    (value == null || !value.isFinite) ? 0 : value;
