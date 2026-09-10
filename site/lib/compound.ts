/**
 * A faithful port of lib/core/calc/compound.dart.
 *
 * WHAT THIS IS, AND WHAT IT IS NOT
 * It answers one question: if a sum grows at a fixed rate for N years, what is
 * the number at the end? That is arithmetic, not a forecast. Nothing here
 * suggests a rate, recommends an instrument, or claims a return is achievable —
 * the caller supplies the rate and the UI is required to say, plainly, that a
 * real market does not deliver a constant one.
 *
 * That line matters beyond good taste. The published terms and RELEASE.md both
 * keep this product out of Play's restricted financial categories by stating
 * outright that it gives no investment advice. A calculator that printed
 * "invest here and you will have X" would make both false.
 *
 * THERE ARE NO TESTS ON THIS FILE. The whole `site/` tree has none — the only
 * guard is test/compound_test.dart against the Dart original. Change one, change
 * both, in the same commit.
 */

/** Compounding periods per year. Monthly, not annual: at 10% over 40 years the
 *  difference is roughly 15% of the answer. */
export const PERIODS_PER_YEAR = 12;

/** Below this a rate is treated as exactly zero — the annuity formula divides
 *  by it, so a 1e-18 rate would return Infinity instead of "money piles up". */
export const RATE_EPSILON = 1e-12;

export type CompoundYear = {
  /** Years elapsed. Year 0 is the opening balance, before any growth. */
  year: number;
  balance: number;
  /** Opening sum plus deposits, never growth. */
  contributed: number;
  growth: number;
};

export type CompoundResult = {
  futureValue: number;
  totalContributed: number;
  totalGrowth: number;
  /**
   * The nominal figure expressed in today's pounds — the number a compound
   * calculator usually hides. At 25% inflation a pound in forty years buys a
   * rounding error of what it buys now, and reporting only the nominal figure
   * tells someone they will be rich when it has only counted the currency
   * getting smaller.
   */
  realValue: number;
  byYear: CompoundYear[];
  /** Null on an empty plan — 0 would read as "you gained nothing". */
  growthMultiple: number | null;
};

const usable = (value: number, fallback = 0): number =>
  Number.isFinite(value) && value > 0 ? value : fallback;

/**
 * Projects `initial` plus `monthly` deposits forward at `annualRate`.
 *
 * Rates are FRACTIONS (0.10 for 10%), matching maxRiskPercent. The UI owns the
 * /100 conversion so nothing below this line has to guess the unit.
 *
 * Deposits land at the END of each month (an ordinary annuity). Start-of-month
 * would add a period of growth to every deposit and overstate a forty-year
 * projection by several percent.
 */
export function project({
  initial,
  monthly,
  annualRate,
  years,
  annualInflation = 0,
}: {
  initial: number;
  monthly: number;
  annualRate: number;
  years: number;
  annualInflation?: number;
}): CompoundResult {
  // Clamped rather than rejected: a form mid-edit legitimately holds a blank or
  // a lone minus sign, and the answer for "nothing, for no time" is zero.
  const start = usable(initial);
  const deposit = usable(monthly);
  const rate = Number.isFinite(annualRate) ? annualRate : 0;
  const span = years > 0 ? Math.floor(years) : 0;
  const inflation =
    Number.isFinite(annualInflation) && annualInflation > -1 ? annualInflation : 0;

  const periodic = rate / PERIODS_PER_YEAR;
  const byYear: CompoundYear[] = [
    { year: 0, balance: start, contributed: start, growth: 0 },
  ];

  let balance = start;
  let contributed = start;

  // Month by month rather than closed-form per year: the loop is what produces
  // the series the chart draws, and 480 multiplications is not worth optimising
  // against clarity.
  for (let year = 1; year <= span; year++) {
    for (let month = 0; month < PERIODS_PER_YEAR; month++) {
      balance += balance * periodic;
      balance += deposit;
      contributed += deposit;
    }
    byYear.push({
      year,
      balance,
      contributed,
      growth: balance - contributed,
    });
  }

  let deflator = 1;
  for (let year = 0; year < span; year++) deflator *= 1 + inflation;

  return {
    futureValue: balance,
    totalContributed: contributed,
    totalGrowth: balance - contributed,
    realValue: deflator > 0 ? balance / deflator : balance,
    byYear,
    growthMultiple: contributed <= 0 ? null : balance / contributed,
  };
}

/**
 * The monthly deposit needed to reach `target` in `years` — the inverse of
 * {@link project}, and the direction goals are actually stated in.
 *
 * Returns 0 when `initial` alone already gets there (the honest answer is
 * "nothing further", not a negative deposit), and null only when the input has
 * no answer at all.
 */
export function monthlyNeededFor({
  target,
  initial,
  annualRate,
  years,
}: {
  target: number;
  initial: number;
  annualRate: number;
  years: number;
}): number | null {
  if (years <= 0 || !Number.isFinite(target) || target <= 0) return null;

  const start = usable(initial);
  const rate = Number.isFinite(annualRate) ? annualRate : 0;
  const periodic = rate / PERIODS_PER_YEAR;
  const periods = Math.floor(years) * PERIODS_PER_YEAR;

  let grown = start;
  for (let i = 0; i < periods; i++) grown += grown * periodic;

  const shortfall = target - grown;
  if (shortfall <= 0) return 0;

  // Future value of a 1-per-period ordinary annuity. The straight-line branch
  // is not an optimisation — the general form divides by `periodic`.
  let annuityFactor: number;
  if (Math.abs(periodic) < RATE_EPSILON) {
    annuityFactor = periods;
  } else {
    let compounded = 1;
    for (let i = 0; i < periods; i++) compounded *= 1 + periodic;
    annuityFactor = (compounded - 1) / periodic;
  }

  if (annuityFactor <= 0) return null;
  return shortfall / annuityFactor;
}

export type SavingScenario = {
  id: string;
  label: string;
  description: string;
  /** A starting point in EGP. The user is expected to change it; it exists so
   *  the form is never empty and the numbers are never abstract. */
  target: number;
  years: number;
};

/**
 * Goals, not products — and deliberately carrying no rate of return.
 *
 * The app supplies the SHAPE of a goal (how much, by when). Suggesting what it
 * will earn is the one thing this feature must not do, and the Dart side has a
 * test asserting no scenario grows a rate field.
 */
export const SAVING_SCENARIOS: SavingScenario[] = [
  {
    id: 'emergency',
    label: 'صندوق الطوارئ',
    description:
      'مصاريف ٦ شهور متحوّشة على جنب، عشان أي مفاجأة متجبركش تبيع صفقة بخسارة.',
    target: 60000,
    years: 2,
  },
  {
    id: 'car',
    label: 'شراء عربية',
    description: 'مبلغ العربية كامل، أو المقدّم، في المدة اللي مديها لنفسك.',
    target: 800000,
    years: 5,
  },
  {
    id: 'apartment',
    label: 'مقدّم شقة',
    description: 'المقدّم هو أكبر حاجز، وهو اللي بيتحوّش قبل الأقساط ما تبتدي.',
    target: 1000000,
    years: 7,
  },
  {
    id: 'education',
    label: 'تعليم ابنك',
    description:
      'من يوم ما يتولد لحد الجامعة — أطول مدة، وأكتر واحدة الفايدة المركّبة بتشتغل فيها.',
    target: 1500000,
    years: 18,
  },
  {
    id: 'retirement',
    label: 'معاش إضافي',
    description: 'مبلغ يقعد معاك بعد ما الدخل الشهري يقف.',
    target: 5000000,
    years: 30,
  },
];
