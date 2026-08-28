import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:egx_trade_journal/app.dart';
import 'package:egx_trade_journal/billing/cubit/billing_cubit.dart';
import 'package:egx_trade_journal/billing/entitlements.dart';
import 'package:egx_trade_journal/core/preferences/device_preferences.dart';
import 'package:egx_trade_journal/core/preferences/device_prefs_cubit.dart';
import 'package:egx_trade_journal/core/state/state_views.dart';
import 'package:egx_trade_journal/core/theme.dart';
import 'package:egx_trade_journal/features/auth/cubit/auth_cubit.dart';
import 'package:egx_trade_journal/features/auth/models/user_account.dart';
import 'package:egx_trade_journal/features/market/cubit/market_cubit.dart';
import 'package:egx_trade_journal/features/market/models/egx_stock_info.dart';
import 'package:egx_trade_journal/settings/cubit/settings_cubit.dart';
import 'package:egx_trade_journal/settings/data/settings_repository.dart';
import 'package:egx_trade_journal/settings/settings.dart';
import 'package:egx_trade_journal/shell/shell_cubit.dart';
import 'package:egx_trade_journal/trades/cubit/trades_cubit.dart';
import 'package:egx_trade_journal/trades/data/trade_repository.dart';
import 'package:egx_trade_journal/trades/trade.dart';
import 'package:egx_trade_journal/watchlist/cubit/watchlist_cubit.dart';
import 'package:egx_trade_journal/watchlist/data/watchlist_repository.dart';
import 'package:egx_trade_journal/watchlist/watchlist_item.dart';

/// The app, wired to an in-memory Firestore, for widget tests.
///
/// ── WHY THIS REPLACED FOUR HIVE BOXES AND A ProviderScope ──────────────────
///
/// Every widget test used to open a real Hive directory in `setUp`, register
/// three adapters, seed four boxes and hand them to `ProviderScope.overrides` —
/// and because a `testWidgets` body runs in a fake-async zone where real file
/// I/O never completes, each seed had to be smuggled out through `runAsync` or
/// the test would simply hang for ten minutes with no message.
///
/// [FakeFirebaseFirestore] runs the real query and snapshot semantics in
/// memory, so seeding is a plain await and there is no clock to escape.
class AppHarness {
  final FakeFirebaseFirestore db;
  final DevicePreferences device;

  final TradeRepository tradeRepository;
  final WatchlistRepository watchlistRepository;
  final SettingsRepository settingsRepository;

  final TradesCubit trades;
  final WatchlistCubit watchlist;
  final SettingsCubit settings;
  final BillingCubit billing;
  final MarketCubit market;
  final AuthCubit auth;
  final DevicePrefsCubit devicePrefs;
  final ShellCubit shell;

  final String userId;

  AppHarness._({
    required this.db,
    required this.device,
    required this.tradeRepository,
    required this.watchlistRepository,
    required this.settingsRepository,
    required this.trades,
    required this.watchlist,
    required this.settings,
    required this.billing,
    required this.market,
    required this.auth,
    required this.devicePrefs,
    required this.shell,
    required this.userId,
  });

  /// Builds the whole graph against an empty in-memory account.
  ///
  /// [entitlement] defaults to a live trial: without a Firebase app the real
  /// [BillingCubit] resolves to free — correctly — and «الأداء» and «التحليلات»
  /// would then render the paywall over tests that are about the journal.
  /// Gating itself is covered by `entitlements_test.dart` and
  /// `paywall_gate_test.dart`, the latter by passing `entitlement: null` to get
  /// the real fallback back.
  static Future<AppHarness> create({
    String userId = 'uid-test',
    String name = 'أحمد',
    String email = 'a@b.com',
    Entitlement? entitlement = const Entitlement(plan: Plan.trial),
    bool onboardingSeen = true,
    Map<String, Object> preferences = const {},
    Future<EgxStockInfo?> Function(String symbol)? fetchQuote,
    Future<List<EgxStockInfo>> Function()? fetchBoard,
  }) async {
    SharedPreferences.setMockInitialValues({
      'onboardingSeen': onboardingSeen,
      ...preferences,
    });

    final db = FakeFirebaseFirestore();
    final device = await DevicePreferences.open();

    final tradeRepository = TradeRepository(db);
    final watchlistRepository = WatchlistRepository(db);
    final settingsRepository = SettingsRepository(db);

    final trades = TradesCubit(tradeRepository);
    final watchlist = WatchlistCubit(watchlistRepository, trades);
    final settings = SettingsCubit(settingsRepository, device);

    return AppHarness._(
      db: db,
      device: device,
      tradeRepository: tradeRepository,
      watchlistRepository: watchlistRepository,
      settingsRepository: settingsRepository,
      trades: trades,
      watchlist: watchlist,
      settings: settings,
      billing: BillingCubit(
        initial: entitlement == null ? null : BillingLoaded(entitlement, true),
      ),
      // Offline and instant, so no test reaches the network or spins on a
      // loading indicator that never resolves.
      market: MarketCubit(
        fetchQuote: fetchQuote ?? (_) async => null,
        fetchBoard: fetchBoard ?? () async => const [],
      ),
      auth: AuthCubit.stub(
        AuthSignedIn(
          UserAccount(id: userId, name: name, email: email, isLoggedIn: true),
        ),
      ),
      devicePrefs: DevicePrefsCubit(device),
      shell: ShellCubit(),
      userId: userId,
    );
  }

  // ── seeding ───────────────────────────────────────────────────────────────

  Future<void> seedTrades(List<Trade> seed) async {
    for (final trade in seed) {
      await tradeRepository.save(userId, trade);
    }
  }

  Future<void> seedWatchlist(List<WatchlistItem> items) async {
    for (final item in items) {
      await watchlistRepository.save(userId, item);
    }
  }

  Future<void> seedSettings(Settings value) =>
      settingsRepository.save(userId, value);

  /// Writes a document straight into the account, for the fields no repository
  /// owns.
  Future<void> seedRaw(String collection, String id, Map<String, Object?> data) =>
      db
          .collection('users')
          .doc(userId)
          .collection(collection)
          .doc(id)
          .set(data);

  /// Points every account-scoped cubit at the seeded account. Called by
  /// [pumpApp]; call it directly when pumping a bare widget.
  Future<void> follow() async {
    await trades.followAccount(userId);
    await watchlist.followAccount(userId);
    await settings.followAccount(userId);
  }

  // ── pumping ───────────────────────────────────────────────────────────────

  /// The cubits, above whatever is being pumped.
  Widget provide(Widget child) => MultiBlocProvider(
    providers: [
      BlocProvider.value(value: auth),
      BlocProvider.value(value: trades),
      BlocProvider.value(value: watchlist),
      BlocProvider.value(value: settings),
      BlocProvider.value(value: billing),
      BlocProvider.value(value: market),
      BlocProvider.value(value: devicePrefs),
      BlocProvider.value(value: shell),
    ],
    child: child,
  );

  /// The real app, from the top.
  Future<void> pumpApp(WidgetTester tester) async {
    await follow();
    await tester.pumpWidget(provide(const EgxJournalApp()));
    await tester.pumpAndSettle();
  }

  /// One widget, inside the same locale and theme the app uses.
  ///
  /// `SettingsGate` is included because `context.settings` throws above it —
  /// deliberately, so a screen cannot size a position against a capital that
  /// belongs to nobody.
  Future<void> pump(WidgetTester tester, Widget child) async {
    await follow();
    await tester.pumpWidget(
      provide(
        MaterialApp(
          theme: AppTheme.light(),
          darkTheme: AppTheme.dark(),
          locale: const Locale('ar'),
          supportedLocales: const [Locale('ar')],
          localizationsDelegates: const [
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: SettingsGate(child: child),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  /// Everything currently stored for the account, read back from Firestore.
  Future<List<Trade>> storedTrades() => tradeRepository.fetch(userId);

  Future<List<WatchlistItem>> storedWatchlist() =>
      watchlistRepository.fetch(userId);

  Future<Settings> storedSettings() => settingsRepository.fetch(userId);

  Future<void> dispose() async {
    await trades.close();
    await watchlist.close();
    await settings.close();
    await billing.close();
    await market.close();
    await auth.close();
    await devicePrefs.close();
    await shell.close();
  }
}
