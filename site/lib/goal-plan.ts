/**
 * «هدف ادخاري»: كام أحطّ شهريًا عشان أوصل لمبلغ، أو المبلغ ده هيوصل لكام.
 *
 * MIRROR OF lib/core/calc/goal_plan.dart. Same formulas, same clamps, same
 * branches — CLAUDE.md §5 requires the two to change in the same commit.
 *
 * THIS IS NOT `projection.ts`, AND THE DIFFERENCE MATTERS.
 * `projection.ts` answers «بأداء دفترك، توصل إمتى» — it reads the edge off the
 * closed trades and refuses to invent a return rate. This file answers the
 * savings question: «لو المفروض العائد كذا، أحطّ كام في الشهر». The rate here
 * is AN ASSUMPTION THE USER TYPES, and every surface that renders it has to say
 * so — a planner that presents an assumed 20% as a forecast is exactly the
 * "flatter the guess" tool the projection was written to avoid being.
 *
 *   monthly rate   = (1 + annual)^(1/12) − 1     ← effective, not annual ÷ 12
 *   FV of a lump   = P × (1 + r)^n
 *   FV of a series = D × ((1 + r)^n − 1) ÷ r
 */

export type GoalPlanMode =
  /** «عندي مبلغ مستهدف — أحطّ كام في الشهر؟» */
  | 'targetToMonthly'
  /** «هحطّ كذا في الشهر — هوصل لكام؟» */
  | 'monthlyToTarget';

/**
 * A horizon shorter than a year is not a savings plan, and one longer than
 * fifty says more about the arithmetic than about the saver.
 */
export const MIN_GOAL_YEARS = 1;
export const MAX_GOAL_YEARS = 50;

/**
 * The rate is an assumption, and an unbounded one turns the planner into a
 * fantasy generator: 200% for 18 years multiplies a deposit by nine million.
 */
export const MAX_ANNUAL_RETURN = 100;

export type GoalPlan = {
  mode: GoalPlanMode;
  /** What to put in every month. Zero when `coveredByInitial`. */
  monthlyDeposit: number;
  /** Where the plan lands. */
  futureValue: number;
  /**
   * Everything the saver actually puts in: the starting amount plus every
   * deposit. The honest denominator for "how much of this is growth".
   */
  totalDeposited: number;
  /** `futureValue − totalDeposited`. Never negative while the rate is. */
  growth: number;
  months: number;
  /** The effective monthly rate the plan ran on, so callers can show it. */
  monthlyRate: number;
  /**
   * The starting amount alone already compounds past the target, so nothing
   * needs to be added monthly. Distinct from "put in 0" so the UI can say why
   * instead of printing a bare zero.
   */
  coveredByInitial: boolean;
  /**
   * Share of the end result that came from compounding rather than from the
   * saver's pocket. Null when there is no result to take a share of.
   */
  growthShare: number | null;
};

/**
 * Tolerant of half-typed input like every other calculator here: nothing
 * throws, and an unusable field falls back to a stated default rather than to
 * NaN.
 */
export function computeGoalPlan({
  mode,
  targetAmount,
  monthlyDeposit,
  years,
  annualReturnPercent,
  initialAmount,
}: {
  mode: GoalPlanMode;
  targetAmount?: number | null;
  monthlyDeposit?: number | null;
  years?: number | null;
  annualReturnPercent?: number | null;
  initialAmount?: number | null;
}): GoalPlan {
  const n = Math.round(clampYears(years) * 12);

  // A negative expected return is not a savings assumption, it is a different
  // question — and it breaks the annuity formula's sign, producing a NEGATIVE
  // required deposit that reads as "the plan pays you".
  const annual = Math.min(
    MAX_ANNUAL_RETURN,
    Math.max(0, finiteOrZero(annualReturnPercent))
  );
  const monthlyRate = annual === 0 ? 0 : (1 + annual / 100) ** (1 / 12) - 1;

  const initial = Math.max(0, finiteOrZero(initialAmount));
  const growthFactor = (1 + monthlyRate) ** n;
  const initialFv = initial * growthFactor;

  if (mode === 'monthlyToTarget') {
    const deposit = Math.max(0, finiteOrZero(monthlyDeposit));
    const depositsFv =
      monthlyRate === 0
        ? deposit * n
        : deposit * ((growthFactor - 1) / monthlyRate);

    const futureValue = initialFv + depositsFv;
    const totalDeposited = initial + deposit * n;

    return finish({
      mode,
      monthlyDeposit: deposit,
      futureValue,
      totalDeposited,
      months: n,
      monthlyRate,
      coveredByInitial: false,
    });
  }

  const target = Math.max(0, finiteOrZero(targetAmount));

  // The starting amount already gets there on its own. Reporting the target as
  // the future value would hide that the plan overshoots, so the real landing
  // figure is reported instead.
  if (initialFv >= target) {
    return finish({
      mode,
      monthlyDeposit: 0,
      futureValue: initialFv,
      totalDeposited: initial,
      months: n,
      monthlyRate,
      coveredByInitial: target > 0,
    });
  }

  const shortfall = target - initialFv;
  const required =
    monthlyRate === 0
      ? shortfall / n
      : (shortfall * monthlyRate) / (growthFactor - 1);

  return finish({
    mode,
    monthlyDeposit: required,
    futureValue: target,
    totalDeposited: initial + required * n,
    months: n,
    monthlyRate,
    coveredByInitial: false,
  });
}

/**
 * The annual rate a journal is actually running at, for pre-filling the
 * assumption instead of guessing it.
 *
 * Takes the monthly rate `projection.ts` already derived from closed trades and
 * compounds it to a year. Null when there is no usable edge — the caller must
 * NOT substitute a house number, because a default that looks measured but is
 * not is worse than an obviously arbitrary one.
 */
export function annualReturnFromMonthlyRate(
  monthlyRate: number | null | undefined
): number | null {
  if (
    monthlyRate == null ||
    !Number.isFinite(monthlyRate) ||
    monthlyRate <= 0
  ) {
    return null;
  }
  const annual = ((1 + monthlyRate) ** 12 - 1) * 100;
  if (!Number.isFinite(annual) || annual <= 0) return null;
  return Math.min(annual, MAX_ANNUAL_RETURN);
}

function finish(
  plan: Omit<GoalPlan, 'growth' | 'growthShare'>
): GoalPlan {
  const growth = Math.max(0, plan.futureValue - plan.totalDeposited);
  return {
    ...plan,
    growth,
    growthShare: plan.futureValue > 0 ? growth / plan.futureValue : null,
  };
}

function clampYears(years: number | null | undefined): number {
  const value = finiteOrZero(years);
  if (value < MIN_GOAL_YEARS) return MIN_GOAL_YEARS;
  if (value > MAX_GOAL_YEARS) return MAX_GOAL_YEARS;
  return value;
}

function finiteOrZero(value: number | null | undefined): number {
  return value == null || !Number.isFinite(value) ? 0 : value;
}
