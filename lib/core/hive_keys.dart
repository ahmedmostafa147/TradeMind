/// Hive box names, key names, and typeId allocation, in one place so the
/// on-disk contract is reviewable at a glance.
library;

/// Untyped box holding the single Settings object as primitive keys.
///
/// Stored as loose keys rather than a serialised blob on purpose: adding a
/// field becomes a one-line `box.get(key, defaultValue:)` with no adapter and
/// no migration.
const String kSettingsBox = 'settings';

const String kCapitalKey = 'capital'; // double, EGP
const String kMaxRiskKey = 'maxRiskPercent'; // double, FRACTION (0.02 not 2.0)
const String kThemeModeKey = 'themeMode'; // int, ThemeMode index
const String kEnableChecklistKey = 'enableChecklist'; // bool
const String kEnableConfirmationsKey = 'enableConfirmations'; // bool
const String kWaitingThresholdKey = 'waitingThresholdDays'; // int
const String kDefaultTakeProfitKey = 'defaultTakeProfitPercent'; // double
const String kDefaultStopLossKey = 'defaultStopLossPercent'; // double

/// Gemini API key entered in Settings. Kept out of the compile-time
/// `--dart-define` so the key can be set without rebuilding the app.
const String kGeminiKeyKey = 'geminiApiKey'; // String

/// Whether the intro has been seen. Absent means "never ran", which is what
/// makes the tour show exactly once — on a fresh install and never again, not
/// even after a sign-out. It lives in SETTINGS and not in the auth box on
/// purpose: signing out is not a reason to be taught the app a second time.
const String kOnboardingSeenKey = 'onboardingSeen'; // bool

/// Box of trades, keyed by Trade.id (the uuid) so update and delete are O(1)
/// and idempotent.
const String kTradesBox = 'trades';

/// typeId allocation. These are the migration contract — never reuse or
/// renumber one that has shipped.
///   0 — reserved, deliberately unused
///   1 — Trade
///   2 — TimelineEntry
///   3 — WatchlistItem
///   4+ — free
const int kTradeTypeId = 1;
const int kTimelineEntryTypeId = 2;
const int kWatchlistItemTypeId = 3;

/// Watchlist entries, keyed by their own uuid. Not trades — a separate box so
/// nothing in the journal's statistics can ever see them.
const String kWatchlistBox = 'watchlist';

/// User authentication and session box.
const String kAuthBox = 'auth';
