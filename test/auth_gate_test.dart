import 'dart:io';

import 'package:egx_trade_journal/app.dart';
import 'package:egx_trade_journal/core/hive_keys.dart';
import 'package:egx_trade_journal/features/auth/providers/auth_providers.dart';
import 'package:egx_trade_journal/features/auth/repositories/auth_repository.dart';
import 'package:egx_trade_journal/features/auth/screens/auth_screen.dart';
import 'package:egx_trade_journal/settings/settings_providers.dart';
import 'package:egx_trade_journal/shell/home_shell.dart';
import 'package:egx_trade_journal/trades/timeline_entry_adapter.dart';
import 'package:egx_trade_journal/trades/trade.dart';
import 'package:egx_trade_journal/trades/trade_adapter.dart';
import 'package:egx_trade_journal/trades/trades_providers.dart';
import 'package:egx_trade_journal/watchlist/watchlist_item.dart';
import 'package:egx_trade_journal/watchlist/watchlist_item_adapter.dart';
import 'package:egx_trade_journal/watchlist/watchlist_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_ce/hive.dart';

/// Which screen the app opens on, and how the guest opt-out is remembered.
///
/// The state transitions are exercised as plain provider tests rather than by
/// tapping through the widget: `skip()` writes to Hive, and a testWidgets body
/// runs in a fake-async zone where real file I/O never completes — tapping the
/// button mid-test hangs the isolate outright. The widget tests below therefore
/// seed the boxes first (through `runAsync`, which escapes that zone) and
/// assert only on what gets rendered.
void main() {
  late Directory tempDir;
  late Box settingsBox;
  late Box<Trade> tradesBox;
  late Box<WatchlistItem> watchlistBox;
  late Box authBox;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('egx_gate');
    Hive.init(tempDir.path);
    if (!Hive.isAdapterRegistered(kTimelineEntryTypeId)) {
      Hive.registerAdapter(TimelineEntryAdapter());
    }
    if (!Hive.isAdapterRegistered(kTradeTypeId)) {
      Hive.registerAdapter(TradeAdapter());
    }
    if (!Hive.isAdapterRegistered(kWatchlistItemTypeId)) {
      Hive.registerAdapter(WatchlistItemAdapter());
    }
    settingsBox = await Hive.openBox(kSettingsBox);
    tradesBox = await Hive.openBox<Trade>(kTradesBox);
    watchlistBox = await Hive.openBox<WatchlistItem>(kWatchlistBox);
    authBox = await Hive.openBox(kAuthBox);
  });

  tearDown(() async {
    await Hive.close();
    if (tempDir.existsSync()) tempDir.deleteSync(recursive: true);
  });

  /// Single source of the overrides. The widget tests drive the same container
  /// through UncontrolledProviderScope, so provider wiring cannot drift between
  /// the two styles of test. (`Override` itself is not a public type in
  /// Riverpod 3, hence a container factory rather than a list.)
  ProviderContainer makeContainer() => ProviderContainer(
    overrides: [
      settingsBoxProvider.overrideWithValue(settingsBox),
      tradesBoxProvider.overrideWithValue(tradesBox),
      watchlistBoxProvider.overrideWithValue(watchlistBox),
      authBoxProvider.overrideWithValue(authBox),
      authProvider.overrideWith(() => AuthRepository(authBox)),
    ],
  );

  Future<void> pumpApp(WidgetTester tester) async {
    // The auth screen is taller than the 800x600 default, which would leave
    // the lower half off-screen.
    tester.view.physicalSize = const Size(1000, 2000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final container = makeContainer();
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const EgxJournalApp(),
      ),
    );
    await tester.pumpAndSettle();
  }

  group('gate state', () {
    test('a fresh install has not passed the gate', () {
      final container = makeContainer();
      addTearDown(container.dispose);

      expect(container.read(authGatePassedProvider), isFalse);
    });

    test('skipping opens the gate and is written to disk', () async {
      final container = makeContainer();
      addTearDown(container.dispose);

      await container.read(authGateSkipProvider.notifier).skip();

      expect(container.read(authGatePassedProvider), isTrue);
      expect(
        authBox.get('skipped_auth'),
        isTrue,
        reason: 'The choice must survive a cold start.',
      );
    });

    test('a new container reads the persisted choice back', () async {
      final first = makeContainer();
      await first.read(authGateSkipProvider.notifier).skip();
      first.dispose();

      // A cold start: fresh container, same boxes.
      final second = makeContainer();
      addTearDown(second.dispose);

      expect(second.read(authGatePassedProvider), isTrue);
    });

    test('a signed-in user passes the gate without skipping', () async {
      await authBox.put('current_user', {
        'id': 'uid-123',
        'name': 'أحمد',
        'email': 'a@b.com',
        'isLoggedIn': true,
      });

      final container = makeContainer();
      addTearDown(container.dispose);

      expect(container.read(authGatePassedProvider), isTrue);
      expect(container.read(authGateSkipProvider), isFalse);
    });

    test('resetting closes the gate again', () async {
      final container = makeContainer();
      addTearDown(container.dispose);

      await container.read(authGateSkipProvider.notifier).skip();
      await container.read(authGateSkipProvider.notifier).reset();

      expect(container.read(authGatePassedProvider), isFalse);
      expect(authBox.get('skipped_auth'), isNull);
    });
  });

  group('what gets rendered', () {
    testWidgets('a fresh install lands on the auth screen', (tester) async {
      await pumpApp(tester);

      expect(find.byType(AuthScreen), findsOneWidget);
      expect(find.byType(HomeShell), findsNothing);
    });

    testWidgets('the auth screen offers a way in without an account', (
      tester,
    ) async {
      await pumpApp(tester);

      expect(
        find.text('متابعة بدون حساب'),
        findsOneWidget,
        reason: 'The journal is local-first; it must stay reachable without '
            'an account, and without Firebase configured.',
      );
    });

    testWidgets('a guest who already opted out goes to the journal', (
      tester,
    ) async {
      await tester.runAsync(() => authBox.put('skipped_auth', true));
      await pumpApp(tester);

      expect(find.byType(HomeShell), findsOneWidget);
      expect(find.byType(AuthScreen), findsNothing);
    });

    testWidgets('a stored session goes straight to the journal', (
      tester,
    ) async {
      await tester.runAsync(
        () => authBox.put('current_user', {
          'id': 'uid-123',
          'name': 'أحمد',
          'email': 'a@b.com',
          'isLoggedIn': true,
          'lastLogin': DateTime(2026, 7, 1).toIso8601String(),
        }),
      );

      await pumpApp(tester);

      expect(find.byType(HomeShell), findsOneWidget);
      expect(find.byType(AuthScreen), findsNothing);
    });
  });
}
