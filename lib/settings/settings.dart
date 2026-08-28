/// The user's risk rule.
///
/// Five of the seven fields live in the ACCOUNT (`users/{uid}/settings/risk` —
/// see SettingsRepository); `enableChecklist` and `enableConfirmations` stay on
/// the device, because they are habits and syncing a habit pushes one device's
/// preference onto another.
class Settings {
  /// UNSET, not a number. Zero is how «لسه ماحددش رأس ماله» is spelled, and
  /// every screen that divides by capital already answers null for it — see
  /// [safeDiv] and [maxLossPerTrade], which return null and 0 rather than
  /// Infinity.
  ///
  /// It used to be 17,000: a number nobody chose, driving every position size,
  /// every over-risk verdict and the whole discipline score for anyone who
  /// never opened Settings. A missing answer the interface can name is honest;
  /// a confident wrong one is not.
  ///
  /// It is never written to Firestore — firestore.rules requires
  /// `capital > 0`, and [SyncCodec.riskSettingsToMap] leaves the field out
  /// while it is unset rather than sending a value the rules would reject.
  static const double defaultCapital = 0;
  static const double defaultMaxRiskPercent = 0.02;

  /// Trading capital in EGP. 0 means the user has not set one yet — ask
  /// [hasCapital] rather than comparing against the default.
  final double capital;

  /// Maximum fraction of capital riskable on one trade. A FRACTION (0.02),
  /// never a percent (2.0). The Settings screen is the only place that
  /// converts, so nothing downstream has to guess the unit.
  final double maxRiskPercent;

  /// Show the pre-trade checklist before saving a planned or open trade.
  final bool enableChecklist;

  /// Ask before destructive actions. Defaults on — deleting a trade is not
  /// recoverable, and this journal is the only copy of the data.
  final bool enableConfirmations;

  /// Days an open position may sit before «قرار اليوم» flags it as waiting.
  final int waitingThresholdDays;

  /// Percentages the smart builder starts from. Fractions, like
  /// [maxRiskPercent] — 0.05 is 5%.
  final double defaultTakeProfitPercent;
  final double defaultStopLossPercent;

  static const int defaultWaitingThresholdDays = 30;
  static const double fallbackTakeProfitPercent = 0.05;
  static const double fallbackStopLossPercent = 0.02;

  /// Whether there is a capital to compute against at all. Everything that
  /// divides by capital is meaningless until this is true.
  bool get hasCapital => capital.isFinite && capital > 0;

  const Settings({
    this.capital = defaultCapital,
    this.maxRiskPercent = defaultMaxRiskPercent,
    this.enableChecklist = true,
    this.enableConfirmations = true,
    this.waitingThresholdDays = defaultWaitingThresholdDays,
    this.defaultTakeProfitPercent = fallbackTakeProfitPercent,
    this.defaultStopLossPercent = fallbackStopLossPercent,
  });

  Settings copyWith({
    double? capital,
    double? maxRiskPercent,
    bool? enableChecklist,
    bool? enableConfirmations,
    int? waitingThresholdDays,
    double? defaultTakeProfitPercent,
    double? defaultStopLossPercent,
  }) => Settings(
    capital: capital ?? this.capital,
    maxRiskPercent: maxRiskPercent ?? this.maxRiskPercent,
    enableChecklist: enableChecklist ?? this.enableChecklist,
    enableConfirmations: enableConfirmations ?? this.enableConfirmations,
    waitingThresholdDays: waitingThresholdDays ?? this.waitingThresholdDays,
    defaultTakeProfitPercent:
        defaultTakeProfitPercent ?? this.defaultTakeProfitPercent,
    defaultStopLossPercent:
        defaultStopLossPercent ?? this.defaultStopLossPercent,
  );
}
