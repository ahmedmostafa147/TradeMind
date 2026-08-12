import 'dart:io';

import 'package:egx_trade_journal/app.dart';
import 'package:egx_trade_journal/core/hive_keys.dart';
import 'package:egx_trade_journal/features/auth/providers/auth_providers.dart';
import 'package:egx_trade_journal/features/auth/repositories/auth_repository.dart';
import 'package:egx_trade_journal/features/market/market_providers.dart';
import 'package:egx_trade_journal/settings/settings_providers.dart';
import 'package:egx_trade_journal/trades/timeline_entry_adapter.dart';
import 'package:egx_trade_journal/trades/trade.dart';
import 'package:egx_trade_journal/trades/trade_adapter.dart';
import 'package:egx_trade_journal/trades/trades_providers.dart';
import 'package:egx_trade_journal/trades/widgets/quick_add_trade_sheet.dart';
import 'package:egx_trade_journal/watchlist/watchlist_item.dart';
import 'package:egx_trade_journal/watchlist/watchlist_item_adapter.dart';
import 'package:egx_trade_journal/watchlist/watchlist_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_ce/hive.dart';

/// EVERY ROUTE TO A PAID SURFACE IS GATED, INCLUDING THE SECOND ONE.
///
/// This file exists because of a bug, not for symmetry. «التحليلات» was gated in
/// the hub's tab strip and NOT gated in an `AnalyticsScreen` that the hub's
/// overflow menu pushed — the same widget, the same data, one lock. A free
/// account reached the paid analytics in two taps.
///
/// It also went unnoticed for a reason worth writing down: `acceptance_test.dart`
/// grants full access to every test in it (deliberately — those tests are about
/// the journal, not billing), so the one suite that drove that menu could never
/// have seen the hole. Nothing anywhere pumped the shell as a FREE account. That
/// is what this file does, and it is the only thing it does.
///
/// `entitlements_test.dart` covers the arithmetic of who is entitled to what.
/// This covers whether the widget tree actually asks.
void main() {
  late Directory tempDir;
  late Box settingsBox;
  late Box<Trade> tradesBox;
  late Box<WatchlistItem> watchlistBox;
  late Box authBox;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('egx_paywall');
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
    await settingsBox.put(kOnboardingSeenKey, true);
    tradesBox = await Hive.openBox<Trade>(kTradesBox);
    watchlistBox = await Hive.openBox<WatchlistItem>(kWatchlistBox);
    authBox = await Hive.openBox(kAuthBox);
    await authBox.put('current_user', {
      'id': 'uid-free',
      'name': 'أحمد',
      'email': 'a@b.com',
      'isLoggedIn': true,
    });
  });

  tearDown(() async {
    await Hive.close();
    if (tempDir.existsSync()) tempDir.deleteSync(recursive: true);
  });

  /// The shell as a FREE account sees it.
  ///
  /// `billingProvider` is NOT overridden, and that omission is the whole point:
  /// with no Firebase app the real controller resolves to [Entitlement.free],
  /// which is exactly the state a lapsed user is in.
  Future<void> pumpFreeApp(WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          settingsBoxProvider.overrideWithValue(settingsBox),
          tradesBoxProvider.overrideWithValue(tradesBox),
          watchlistBoxProvider.overrideWithValue(watchlistBox),
          authBoxProvider.overrideWithValue(authBox),
          authProvider.overrideWith(() => AuthRepository(authBox)),
          livePriceProvider.overrideWith((ref, symbol) async => null),
        ],
        child: const EgxJournalApp(),
      ),
    );
    await tester.pumpAndSettle();
  }

  Future<void> openHubMenu(WidgetTester tester) async {
    await tester.tap(
      find.descendant(
        of: find.byType(NavigationBar),
        matching: find.text('صفقاتي'),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('المزيد'));
    await tester.pumpAndSettle();
  }

  testWidgets('the «التحليلات» tab shows the paywall, not the figures', (
    tester,
  ) async {
    await pumpFreeApp(tester);
    await tester.tap(
      find.descendant(
        of: find.byType(NavigationBar),
        matching: find.text('صفقاتي'),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(Tab, 'التحليلات'));
    await tester.pumpAndSettle();

    expect(find.text('جودة الأداء'), findsNothing);
    expect(find.textContaining('معامل الربح ومتوسط R'), findsOneWidget);
  });

  testWidgets(
    'the overflow «الإحصائيات التفصيلية» lands on the same paywall',
    (tester) async {
      await pumpFreeApp(tester);
      await openHubMenu(tester);
      await tester.tap(find.text('الإحصائيات التفصيلية').last);
      await tester.pumpAndSettle();

      // THE REGRESSION. Before the fix this pushed an ungated route and
      // «جودة الأداء» — the analytics view's first heading — was on screen.
      expect(find.text('جودة الأداء'), findsNothing);
      expect(find.textContaining('معامل الربح ومتوسط R'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('«الأداء» is gated too', (tester) async {
    await pumpFreeApp(tester);
    await tester.tap(
      find.descendant(
        of: find.byType(NavigationBar),
        matching: find.text('صفقاتي'),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(Tab, 'الأداء'));
    await tester.pumpAndSettle();

    expect(find.textContaining('صافي الربح ونسبة النجاح'), findsOneWidget);
  });

  testWidgets('«السوق» is gated, and the journal never is', (tester) async {
    await pumpFreeApp(tester);

    await tester.tap(
      find.descendant(
        of: find.byType(NavigationBar),
        matching: find.text('السوق'),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.textContaining('مين اشترى ومين باع'), findsOneWidget);

    // AND THE PART THAT MUST NEVER LOCK. A journal that stops letting you write
    // in it is not a limited plan, and `Feature` has no entry for recording a
    // trade precisely so this cannot drift.
    await tester.tap(
      find.descendant(
        of: find.byType(NavigationBar),
        matching: find.text('صفقاتي'),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text(kAddTradeLabel), findsWidgets);
    await tester.tap(find.widgetWithText(Tab, 'تخطيط'));
    await tester.pumpAndSettle();
    expect(find.byType(FloatingActionButton), findsWidgets);
  });
}
