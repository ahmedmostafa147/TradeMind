/// Compound growth arithmetic. Pure Dart — no Flutter, no Hive, no intl.
///
/// WHAT THIS IS, AND WHAT IT IS NOT
/// It answers one question: if a sum grows at a fixed rate for N years, what is
/// the number at the end? That is arithmetic, not a forecast. Nothing here
/// suggests a rate, recommends an instrument, or claims a return is achievable
/// — the caller supplies the rate and the UI is required to say, in the user's
/// own language, that a real market does not deliver a constant one.
///
/// That line matters beyond good taste. RELEASE.md keeps this app out of Play's
/// restricted financial categories by stating outright that it gives no
/// investment advice, and the published terms say the same. A calculator that
/// printed "invest here and you will have X" would make both false.
///
/// Every function is *total*: nonsensical input yields a safe result rather than
/// a throw, because these run on every keystroke against half-typed fields.
library;

/// Compounding periods per year.
///
/// Monthly, not annual, and the difference is not cosmetic: at 10% over 40
/// years, monthly compounding produces roughly 15% more than annual. It also
/// matches how a person actually experiences this — salary arrives monthly, so
/// the contribution does too, and mixing a monthly deposit with annual
/// compounding would silently credit a year of growth to money not yet paid in.
const int kPeriodsPerYear = 12;

/// Below this the rate is treated as exactly zero.
///
/// Not paranoia about typing 0: the annuity formula divides by the periodic
/// rate, so a rate of 1e-18 — reachable by dividing a tiny percentage by 12 —
/// produces an infinity rather than the "money just piles up" answer that is
/// obviously correct. The straight-line branch is exact at r = 0 and accurate
/// well past this threshold, so the seam is invisible.
const double kRateEpsilon = 1e-12;

/// A single year's row in the projection.
class CompoundYear {
  /// Years elapsed. Year 0 is the opening balance, before any growth.
  final int year;

  /// Balance at the end of this year.
  final double balance;

  /// Everything paid in up to this point — the opening sum plus deposits.
  /// Never includes growth, so `balance - contributed` is the growth alone.
  final double contributed;

  const CompoundYear({
    required this.year,
    required this.balance,
    required this.contributed,
  });

  double get growth => balance - contributed;
}

class CompoundResult {
  /// Nominal balance at the end — pounds, unadjusted.
  final double futureValue;

  /// Opening sum plus every deposit. What the person actually parted with.
  final double totalContributed;

  /// [futureValue] minus [totalContributed].
  final double totalGrowth;

  /// [futureValue] expressed in today's pounds.
  ///
  /// The single most important number here and the one a compound calculator
  /// usually hides. At 25% inflation — not a hypothetical in Egypt — a pound in
  /// forty years buys a rounding error of what it buys now, and a projection
  /// that reports only the nominal figure is telling someone they will be rich
  /// when it has only counted the currency getting smaller.
  final double realValue;

  /// One row per year, index 0 being the opening balance.
  final List<CompoundYear> byYear;

  const CompoundResult({
    required this.futureValue,
    required this.totalContributed,
    required this.totalGrowth,
    required this.realValue,
    required this.byYear,
  });

  /// Growth as a share of what was paid in. Null when nothing was paid in —
  /// zero would read as "you gained nothing" rather than "there is nothing to
  /// divide by".
  double? get growthMultiple =>
      totalContributed <= 0 ? null : futureValue / totalContributed;
}

/// Projects [initial] plus [monthly] deposits forward at [annualRate].
///
/// [annualRate] and [annualInflation] are FRACTIONS (0.10 for 10%), matching
/// `maxRiskPercent` in Settings. The UI owns the /100 conversion so nothing
/// below this line has to guess the unit.
///
/// Deposits land at the END of each month (an ordinary annuity). The
/// alternative — start of month — is one extra period of growth on every
/// deposit and would overstate a forty-year projection by several percent. End
/// of month is both the conservative choice and the one that matches a salary
/// arriving and being put aside afterwards.
CompoundResult project({
  required double initial,
  required double monthly,
  required double annualRate,
  required int years,
  double annualInflation = 0,
}) {
  // Clamped rather than rejected: a form mid-edit legitimately holds a blank or
  // a minus sign, and the answer for "nothing, for no time" is zero, not a
  // crash.
  final start = initial.isFinite && initial > 0 ? initial : 0.0;
  final deposit = monthly.isFinite && monthly > 0 ? monthly : 0.0;
  final rate = annualRate.isFinite ? annualRate : 0.0;
  final span = years > 0 ? years : 0;
  final inflation = annualInflation.isFinite && annualInflation > -1
      ? annualInflation
      : 0.0;

  final periodic = rate / kPeriodsPerYear;
  final rows = <CompoundYear>[
    CompoundYear(year: 0, balance: start, contributed: start),
  ];

  var balance = start;
  var contributed = start;

  // Iterated month by month rather than evaluated closed-form per year. The
  // closed form is exact, but the loop is what produces the year-by-year series
  // the chart needs, and 480 multiplications for the longest realistic
  // projection is not a cost worth optimising against clarity.
  for (var year = 1; year <= span; year++) {
    for (var month = 0; month < kPeriodsPerYear; month++) {
      balance += balance * periodic;
      balance += deposit;
      contributed += deposit;
    }
    rows.add(
      CompoundYear(year: year, balance: balance, contributed: contributed),
    );
  }

  // (1 + i)^years, by repeated multiplication so a zero or tiny inflation costs
  // nothing and no pow() edge case can surface.
  var deflator = 1.0;
  for (var year = 0; year < span; year++) {
    deflator *= 1 + inflation;
  }

  return CompoundResult(
    futureValue: balance,
    totalContributed: contributed,
    totalGrowth: balance - contributed,
    realValue: deflator > 0 ? balance / deflator : balance,
    byYear: rows,
  );
}

/// The monthly deposit needed to reach [target] in [years].
///
/// The inverse of [project], and the direction most goals are actually stated
/// in: a person does not ask "what will 500 a month become", they ask "my son
/// starts university in fifteen years, what do I put aside".
///
/// Returns 0 when [initial] alone already gets there — the honest answer is
/// "nothing further", not a negative deposit. Returns null when the goal is not
/// reachable by depositing, which is only the degenerate case of no time at all.
double? monthlyNeededFor({
  required double target,
  required double initial,
  required double annualRate,
  required int years,
}) {
  if (years <= 0 || !target.isFinite || target <= 0) return null;

  final start = initial.isFinite && initial > 0 ? initial : 0.0;
  final rate = annualRate.isFinite ? annualRate : 0.0;
  final periodic = rate / kPeriodsPerYear;
  final periods = years * kPeriodsPerYear;

  // What the opening sum becomes on its own.
  var grown = start;
  for (var i = 0; i < periods; i++) {
    grown += grown * periodic;
  }
  final shortfall = target - grown;
  if (shortfall <= 0) return 0;

  // Future value of a 1-per-period ordinary annuity. The straight-line branch is
  // not an optimisation — the general form divides by `periodic`, which is zero
  // here.
  double annuityFactor;
  if (periodic.abs() < kRateEpsilon) {
    annuityFactor = periods.toDouble();
  } else {
    var compounded = 1.0;
    for (var i = 0; i < periods; i++) {
      compounded *= 1 + periodic;
    }
    annuityFactor = (compounded - 1) / periodic;
  }

  if (annuityFactor <= 0) return null;
  return shortfall / annuityFactor;
}

/// A worked example the user can start from instead of an empty form.
///
/// Goals, not products. Each one names a thing a person in Egypt actually saves
/// for and fills the form with its shape — the amount and the horizon — leaving
/// the RATE blank-by-default for the caller to set, because suggesting a return
/// is the one thing this feature must not do.
class SavingScenario {
  final String id;
  final String label;

  /// What it is for, in one line.
  final String description;

  /// A starting point for the target, in EGP. The user is expected to change
  /// it; it exists so the form is never empty and the numbers are never
  /// abstract.
  final double target;

  /// Years to the goal.
  final int years;

  const SavingScenario({
    required this.id,
    required this.label,
    required this.description,
    required this.target,
    required this.years,
  });
}

/// The presets, ordered by how far away the goal usually is.
const List<SavingScenario> kSavingScenarios = [
  SavingScenario(
    id: 'emergency',
    label: 'صندوق الطوارئ',
    description: 'مصاريف ٦ شهور متحوّشة على جنب، عشان أي مفاجأة متجبركش تبيع صفقة بخسارة.',
    target: 60000,
    years: 2,
  ),
  SavingScenario(
    id: 'car',
    label: 'شراء عربية',
    description: 'مبلغ العربية كامل، أو المقدّم، في المدة اللي مديها لنفسك.',
    target: 800000,
    years: 5,
  ),
  SavingScenario(
    id: 'apartment',
    label: 'مقدّم شقة',
    description: 'المقدّم هو أكبر حاجز، وهو اللي بيتحوّش قبل الأقساط ما تبتدي.',
    target: 1000000,
    years: 7,
  ),
  SavingScenario(
    id: 'education',
    label: 'تعليم ابنك',
    description: 'من يوم ما يتولد لحد الجامعة — أطول مدة، وأكتر واحدة الفايدة المركّبة بتشتغل فيها.',
    target: 1500000,
    years: 18,
  ),
  SavingScenario(
    id: 'retirement',
    label: 'معاش إضافي',
    description: 'مبلغ يقعد معاك بعد ما الدخل الشهري يقف.',
    target: 5000000,
    years: 30,
  ),
];
