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
import 'package:egx_trade_journal/trades/trade_status.dart';
import 'package:egx_trade_journal/trades/trades_providers.dart';
import 'package:egx_trade_journal/today/today_providers.dart';
import 'package:egx_trade_journal/watchlist/watchlist_item.dart';
import 'package:egx_trade_journal/watchlist/watchlist_item_adapter.dart';
import 'package:egx_trade_journal/watchlist/watchlist_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_ce/hive.dart';

/// "Today" is pinned so the day-threshold sections are deterministic.
final fixedToday = DateTime(2026, 6, 1);

void main() {
  late Directory tempDir;
  late Box settingsBox;
  late Box<Trade> tradesBox;
  late Box<WatchlistItem> watchlistBox;
  late Box authBox;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('egx_today');
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
    // Past the intro. Every test in this file exercises the app a returning
    // user sees, and OnboardingGate sits in front of AuthGate — without this
    // flag `pumpApp` lands on slide one and every finder below misses.
    await settingsBox.put(kOnboardingSeenKey, true);
    tradesBox = await Hive.openBox<Trade>(kTradesBox);
    watchlistBox = await Hive.openBox<WatchlistItem>(kWatchlistBox);
    authBox = await Hive.openBox(kAuthBox);
    // See acceptance_test: start past the first-run auth screen as a guest.
    // A signed-in session. The gate is mandatory now, so without one every
    // test here would render the auth screen instead of the journal it is
    // about. Sign-in itself is covered by auth_gate_test and
    // auth_repository_test.
    await authBox.put('current_user', {
      'id': 'uid-test',
      'name': 'أحمد',
      'email': 'a@b.com',
      'isLoggedIn': true,
    });
  });

  tearDown(() async {
    await Hive.close();
    if (tempDir.existsSync()) tempDir.deleteSync(recursive: true);
  });

  /// Hive writes must escape the fake-async zone or they never complete.
  Future<void> seed(WidgetTester tester, Future<void> Function() write) =>
      tester.runAsync(write);

  Future<void> pumpApp(WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          settingsBoxProvider.overrideWithValue(settingsBox),
          tradesBoxProvider.overrideWithValue(tradesBox),
          watchlistBoxProvider.overrideWithValue(watchlistBox),
          todayProvider.overrideWithValue(fixedToday),
          // See acceptance_test: both auth providers throw until overridden.
          authBoxProvider.overrideWithValue(authBox),
          authProvider.overrideWith(() => AuthRepository(authBox)),
          // Open-trade cards now show a live P&L that would otherwise hit the
          // network and spin forever under pumpAndSettle. Pin it to "no price"
          // so the tests stay offline and deterministic.
          livePriceProvider.overrideWith((ref, symbol) async => null),
        ],
        child: const EgxJournalApp(),
      ),
    );
    await tester.pumpAndSettle();
  }

  Trade makeTrade({
    required String id,
    String ticker = 'COMI',
    TradeStatus? status,
    int qty = 680,
    double? exit,
    DateTime? entryDate,
    DateTime? exitDate,
    String? notes,
  }) => Trade(
    id: id,
    entryDate: entryDate ?? fixedToday.subtract(const Duration(days: 1)),
    ticker: ticker,
    reason: 'سبب',
    entryPrice: 10.00,
    stopPrice: 9.50,
    quantity: qty,
    exitPrice: exit,
    exitDate: exit == null ? null : (exitDate ?? fixedToday),
    notes: notes,
    status: status,
  );

  testWidgets('the daily decisions are the first thing shown on launch', (
    tester,
  ) async {
    await pumpApp(tester);

    // «اليوم» is the leading tab of «صفقاتي», which is the leading destination,
    // so the daily view is still what a launch lands on — it is just no longer
    // a top-level destination of its own.
    expect(find.widgetWithText(Tab, 'اليوم'), findsOneWidget);
    expect(find.text('ابدأ أول صفقة'), findsOneWidget);
    // The spec asks for a ✅; the screen renders the Material equivalent so it
    // themes and scales with the rest of the UI.
    expect(find.byIcon(Icons.task_alt_rounded), findsOneWidget);
  });

  testWidgets('every bottom destination is a distinct job', (tester) async {
    await pumpApp(tester);

    final labels = tester
        .widgetList<NavigationDestination>(find.byType(NavigationDestination))
        .map((d) => d.label)
        .toList();

    // THE RULE IS "ONE JOB EACH", NOT A HEADCOUNT.
    //
    // The bar was five, of which «قرار اليوم», «سجل الصفقات» and «لوحة التحكم»
    // were the same trades shown three ways — indistinguishable as siblings in
    // a bar. Those collapsed into tabs inside «صفقاتي», which left three.
    //
    // «المستجدات» held the fourth slot until its feed was removed — both
    // collections behind it are denied by firestore.rules now — and «السوق»
    // took it. That passes the same rule: reading what the exchange published
    // about who was buying is not journaling a trade, not sizing one, and not
    // changing a setting. What this test defends is that no destination is
    // another destination wearing a different label, so before adding a fifth,
    // answer which of these jobs it is not.
    expect(labels, ['صفقاتي', 'السوق', 'حاسبة الصفقة', 'الإعدادات']);

    // «التحليلات» was reachable only from the hub's overflow menu and «الهدف»
    // did not exist. Both are tabs now, because the web carries them as
    // top-level tabs and the two surfaces are meant to be the same product.
    expect(
      tester
          .widgetList<Tab>(find.byType(Tab))
          .map((t) => t.text)
          .toList(),
      ['اليوم', 'كل الصفقات', 'الأداء', 'التحليلات', 'الهدف'],
    );
  });

  testWidgets('an over-risk trade is pinned above the open section', (
    tester,
  ) async {
    await seed(tester, () async {
      await tradesBox.put('safe', makeTrade(id: 'safe', ticker: 'HRHO'));
      await tradesBox.put(
        'risky',
        makeTrade(id: 'risky', ticker: 'SWDY', qty: 900),
      );
    });
    await pumpApp(tester);

    expect(find.text('تجاوز حد المخاطرة'), findsOneWidget);
    expect(find.text('تحذير: المخاطرة أعلى من الحد المسموح'), findsOneWidget);

    // The breach section must render above the plain open section.
    final riskY = tester.getTopLeft(find.text('تجاوز حد المخاطرة')).dy;
    final openY = tester.getTopLeft(find.text('الصفقات المفتوحة')).dy;
    expect(riskY, lessThan(openY));
  });

  testWidgets('sections with no items are not rendered at all', (tester) async {
    await seed(tester, () async {
      await tradesBox.put('a', makeTrade(id: 'a'));
    });
    await pumpApp(tester);

    expect(find.text('الصفقات المفتوحة'), findsOneWidget);
    expect(find.text('تجاوز حد المخاطرة'), findsNothing);
    expect(find.text('الصفقات المخططة'), findsNothing);
    expect(find.text('قائمة المتابعة'), findsNothing);
    expect(find.text('أُقفلت مؤخرًا'), findsNothing);
  });

  testWidgets('a stale open trade asks for a note', (tester) async {
    await seed(tester, () async {
      await tradesBox.put(
        'stale',
        makeTrade(
          id: 'stale',
          entryDate: fixedToday.subtract(const Duration(days: 10)),
        ),
      );
    });
    await pumpApp(tester);

    // «محتاجة مراجعة» is gone: an open position untouched for a week is not a
    // decision, it is a nag to journal, and it filled the daily screen with
    // cards that asked for nothing in particular. The trade still appears —
    // under the section that names a real action.
    expect(find.text('محتاجة مراجعة'), findsNothing);
    expect(find.text('راجع الصفقة وأضف ملاحظاتك.'), findsNothing);
    expect(find.text('COMI'), findsWidgets, reason: 'still on the screen');
  });

  testWidgets('an old open trade is flagged as waiting too long', (
    tester,
  ) async {
    await seed(tester, () async {
      await tradesBox.put(
        'old',
        makeTrade(
          id: 'old',
          entryDate: fixedToday.subtract(const Duration(days: 45)),
        ),
      );
    });
    await pumpApp(tester);

    expect(find.text('منتظرة من زمان'), findsOneWidget);
    expect(find.textContaining('مفتوحة من 45 يوم'), findsOneWidget);
  });

  testWidgets('planned ideas get their own section with actions', (
    tester,
  ) async {
    await seed(tester, () async {
      await tradesBox.put(
        'p1',
        makeTrade(id: 'p1', status: TradeStatus.planned, qty: 0),
      );
    });
    await pumpApp(tester);

    expect(find.text('الصفقات المخططة'), findsOneWidget);
    expect(find.text('افتحها'), findsOneWidget);
    expect(find.text('إلغاء'), findsOneWidget);
    expect(find.text('تعديل'), findsWidgets);
  });

  testWidgets('a documented closed trade shows but creates no task', (
    tester,
  ) async {
    await seed(tester, () async {
      await tradesBox.put(
        'c',
        makeTrade(id: 'c', exit: 11.20, exitDate: fixedToday, notes: 'الدرس'),
      );
    });
    await pumpApp(tester);

    // No action is required, but the closed trade is still worth seeing — so
    // the compact banner shows instead of the full-screen empty state. This
    // matches the BANNER's own wording, which is not the empty state's:
    // "nothing to do today" is the right message when there are trades but no
    // pending decisions, while the empty state is for a journal with nothing
    // in it at all. Asserted before scrolling, since the lazy list disposes it
    // once it leaves the viewport.
    expect(find.textContaining('لا توجد مهام اليوم'), findsOneWidget);
    expect(find.text('ابدأ أول صفقة'), findsNothing);

    // The closed section is the last one, below the fold in a lazy list.
    await tester.scrollUntilVisible(
      find.text('أُقفلت مؤخرًا'),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();

    expect(find.text('أُقفلت مؤخرًا'), findsOneWidget);
    expect(find.text('راجع الصفقة وأضف ملاحظاتك.'), findsNothing);
    // The card renders P&L and R in one line, so match on a substring.
    expect(find.textContaining('+816.00 ج.م'), findsWidgets);
    expect(find.textContaining('2.4R'), findsWidgets);
  });

  testWidgets('a closed trade with no lesson asks for one', (tester) async {
    await seed(tester, () async {
      await tradesBox.put(
        'c',
        makeTrade(id: 'c', exit: 11.20, exitDate: fixedToday),
      );
    });
    await pumpApp(tester);

    // No review nag; the trade shows under «أُقفلت مؤخرًا», where the lesson
    // button lives.
    expect(find.text('محتاجة مراجعة'), findsNothing);
    expect(find.text('أُقفلت مؤخرًا'), findsOneWidget);
    expect(find.text('أضف الدرس'), findsOneWidget);
  });

  testWidgets('the summary card counts every bucket', (tester) async {
    await seed(tester, () async {
      await tradesBox.put('o1', makeTrade(id: 'o1'));
      await tradesBox.put('o2', makeTrade(id: 'o2', qty: 900));
      await tradesBox.put(
        'p1',
        makeTrade(id: 'p1', status: TradeStatus.planned, qty: 0),
      );
      await tradesBox.put(
        'c1',
        makeTrade(id: 'c1', exit: 11.20, exitDate: fixedToday, notes: 'x'),
      );
    });
    await pumpApp(tester);

    expect(find.text('ملخص النهاردة'), findsOneWidget);
    expect(find.text('مفتوحة'), findsWidgets);
    expect(find.text('تجاوزت الحد'), findsOneWidget);
    expect(find.text('مخططة'), findsWidgets);
    expect(find.text('أُقفلت الأسبوع ده'), findsOneWidget);
  });

  testWidgets('watchlist items appear sorted by priority', (tester) async {
    await seed(tester, () async {
      await watchlistBox.put(
        'low',
        WatchlistItem(
          id: 'low',
          ticker: 'LOWP',
          targetBuyPrice: 5.0,
          stopPrice: 4.5,
          reason: 'متابعة',
          priority: WatchPriority.low,
          dateAdded: fixedToday,
        ),
      );
      await watchlistBox.put(
        'high',
        WatchlistItem(
          id: 'high',
          ticker: 'HIGHP',
          targetBuyPrice: 12.0,
          stopPrice: 11.0,
          reason: 'قرب الاختراق',
          priority: WatchPriority.high,
          dateAdded: fixedToday,
        ),
      );
    });
    await pumpApp(tester);

    expect(find.text('قائمة المتابعة'), findsOneWidget);
    expect(find.text('حوّلها لصفقة'), findsNWidgets(2));

    final highY = tester.getTopLeft(find.text('HIGHP')).dy;
    final lowY = tester.getTopLeft(find.text('LOWP')).dy;
    expect(highY, lessThan(lowY), reason: 'high priority comes first');
  });

  testWidgets('a watchlist item alone is enough to show the screen', (
    tester,
  ) async {
    await seed(tester, () async {
      await watchlistBox.put(
        'w',
        WatchlistItem(
          id: 'w',
          ticker: 'COMI',
          targetBuyPrice: 10.0,
          stopPrice: 9.5,
          reason: 'متابعة',
          priority: WatchPriority.high,
          dateAdded: fixedToday,
        ),
      );
    });
    await pumpApp(tester);

    expect(find.text('ابدأ أول صفقة'), findsNothing);
    expect(find.text('قائمة المتابعة'), findsOneWidget);
  });

  testWidgets('cancelled ideas produce no tasks at all', (tester) async {
    await seed(tester, () async {
      await tradesBox.put(
        'x',
        makeTrade(id: 'x', status: TradeStatus.cancelled, qty: 0),
      );
    });
    await pumpApp(tester);

    expect(find.text('ابدأ أول صفقة'), findsOneWidget);
  });

  testWidgets('the waiting threshold is read from settings', (tester) async {
    await seed(tester, () async {
      await settingsBox.put(kWaitingThresholdKey, 5);
      await tradesBox.put(
        'a',
        makeTrade(
          id: 'a',
          entryDate: fixedToday.subtract(const Duration(days: 6)),
        ),
      );
    });
    await pumpApp(tester);

    // Six days would be well inside the default 30-day threshold.
    expect(find.text('منتظرة من زمان'), findsOneWidget);
    expect(find.textContaining('الحد 5 يوم'), findsOneWidget);
  });

  testWidgets('every number on the screen uses Western digits', (tester) async {
    await seed(tester, () async {
      await tradesBox.put('o', makeTrade(id: 'o', qty: 900));
      await tradesBox.put(
        'c',
        makeTrade(id: 'c', exit: 11.20, exitDate: fixedToday, notes: 'x'),
      );
    });
    await pumpApp(tester);

    for (final widget in tester.widgetList<Text>(find.byType(Text))) {
      final data = widget.data;
      if (data == null) continue;
      expect(
        data.runes.any((r) => r >= 0x0660 && r <= 0x0669),
        isFalse,
        reason: 'Arabic-Indic digits leaked into "$data"',
      );
    }
  });
}
