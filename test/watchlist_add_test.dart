import 'dart:io';

import 'package:egx_trade_journal/core/hive_keys.dart';
import 'package:egx_trade_journal/shell/trades_hub_screen.dart';
import 'package:egx_trade_journal/features/auth/providers/auth_providers.dart';
import 'package:egx_trade_journal/features/auth/repositories/auth_repository.dart';
import 'package:egx_trade_journal/features/market/market_providers.dart';
import 'package:egx_trade_journal/settings/settings_providers.dart';
import 'package:egx_trade_journal/trades/timeline_entry_adapter.dart';
import 'package:egx_trade_journal/trades/trade.dart';
import 'package:egx_trade_journal/trades/trade_adapter.dart';
import 'package:egx_trade_journal/trades/trades_providers.dart';
import 'package:egx_trade_journal/watchlist/watchlist_item.dart';
import 'package:egx_trade_journal/watchlist/watchlist_item_adapter.dart';
import 'package:egx_trade_journal/watchlist/watchlist_providers.dart';
import 'package:egx_trade_journal/watchlist/widgets/watchlist_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_ce/hive.dart';

/// A watch can be CREATED on the phone.
///
/// `WatchlistFormScreen` has always had an add mode. Nothing ever opened it in
/// that mode: the hub's overflow menu — the documented route — was removed, and
/// the only remaining caller was the «تعديل» button on an existing card. So the
/// feature could be used on the phone by everyone except someone who had not
/// already used it on the web.
///
/// This is a REACHABILITY test, not a form test. It asserts that a person
/// starting from the hub with an empty watchlist can get to a blank form.
void main() {
  late Directory tempDir;
  late Box settingsBox;
  late Box<Trade> tradesBox;
  late Box<WatchlistItem> watchlistBox;
  late Box authBox;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('egx_watch');
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
    // Both auth providers throw until overridden — see acceptance_test.
    await authBox.put('current_user', {
      'id': 'uid-test',
      'name': 'أحمد',
      'email': 'a@b.com',
      'isLoggedIn': true,
    });
  });

  tearDown(() async {
    await Hive.deleteFromDisk();
    await tempDir.delete(recursive: true);
  });

  Future<void> pumpHub(WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          settingsBoxProvider.overrideWithValue(settingsBox),
          tradesBoxProvider.overrideWithValue(tradesBox),
          watchlistBoxProvider.overrideWithValue(watchlistBox),
          // Offline and deterministic: open-position cards and the ticker badge
          // would otherwise reach for the network and never settle.
          // `billingProvider` needs nothing: with no Firebase app — always,
          // here — BillingController.build returns Entitlement.free outright.
          livePriceProvider.overrideWith((ref, symbol) async => null),
          tradingViewBoardProvider.overrideWith((ref) async => []),
          authBoxProvider.overrideWithValue(authBox),
          authProvider.overrideWith(() => AuthRepository(authBox)),
        ],
        child: const MaterialApp(
          home: Directionality(
            textDirection: TextDirection.rtl,
            child: TradesHubScreen(),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('an empty watchlist offers a way to fill it', (tester) async {
    await pumpHub(tester);

    await tester.tap(find.text('قائمة المراقبة'));
    await tester.pumpAndSettle();

    expect(
      find.text(WatchlistView.addLabel),
      findsOneWidget,
      reason: 'the empty state must say what to do, not just that it is empty',
    );
  });

  testWidgets('that way lands on a BLANK form, not an edit', (tester) async {
    await pumpHub(tester);

    await tester.tap(find.text('قائمة المراقبة'));
    await tester.pumpAndSettle();
    await tester.tap(find.text(WatchlistView.addLabel));
    await tester.pumpAndSettle();

    // The form titles itself by mode. «تعديل المتابعة» here would mean it was
    // handed an `existing`, which is the bug this exists to catch.
    expect(find.text('إضافة للمتابعة'), findsOneWidget);
    expect(find.text('تعديل المتابعة'), findsNothing);
  });
}
