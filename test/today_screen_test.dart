import 'package:egx_trade_journal/core/app_clock.dart';
import 'package:egx_trade_journal/settings/settings.dart';
import 'package:egx_trade_journal/shell/home_shell.dart';
import 'package:egx_trade_journal/trades/trade.dart';
import 'package:egx_trade_journal/trades/trade_status.dart';
import 'package:egx_trade_journal/watchlist/watchlist_item.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/app_harness.dart';

/// "Today" is pinned so the day-threshold sections are deterministic.
final fixedToday = DateTime(2026, 6, 1);

void main() {
  late AppHarness app;

  setUp(() async {
    // Past the intro: every test here exercises the app a returning user sees,
    // and OnboardingGate sits in front of AuthGate.
    app = await AppHarness.create();
    AppClock.nowOverride = () => fixedToday;
  });

  tearDown(() async {
    AppClock.nowOverride = null;
    await app.dispose();
  });

  /// THE runAsync WRAPPER IS GONE.
  ///
  /// Hive writes were real file I/O, which never completes inside a
  /// testWidgets fake-async zone, so every seed had to escape to the real
  /// clock. The in-memory Firestore completes on a microtask. The helper is
  /// kept so the tests below read the same, and because the seeds still have to
  /// land BEFORE the app is pumped.
  Future<void> seed(WidgetTester tester, Future<void> Function() write) =>
      write();

  /// Signatures match the Hive box calls these replaced, so the seeds below
  /// read unchanged. The key is ignored: Firestore keys the document by the
  /// record's own id, which is what the box key always was.
  Future<void> putTrade(String _, Trade trade) => app.seedTrades([trade]);

  Future<void> putWatch(String _, WatchlistItem item) =>
      app.seedWatchlist([item]);

  Future<void> pumpApp(WidgetTester tester) => app.pumpApp(tester);

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

    // «قرار اليوم» is the leading tab of «صفقاتي», which is the leading
    // destination, so the daily view is still what a launch lands on — it is
    // just no longer a top-level destination of its own. The label matches the
    // web dashboard's, because the two surfaces are one product.
    expect(find.widgetWithText(Tab, 'قرار اليوم'), findsOneWidget);
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
    // another destination wearing a different label.
    //
    // «الأسهم» IS THE FIFTH, AND HERE IS WHICH OF THE OTHERS IT IS NOT.
    // The comment above demanded that answer before a fifth was added, so:
    //   - not «السوق» — that is who was buying, by nationality and by class,
    //     for the market as a whole. This is one price per company.
    //   - not «صفقاتي» — nothing on it is a record of anything the user did.
    //   - not «حاسبة الصفقة» — it computes nothing; it looks things up.
    // It answers «السهم ده بكام؟», which nothing else here answered at all.
    //
    // The ORDER is load-bearing too: SECTIONS in customer-dashboard.tsx carries
    // the same five in the same order, so the same slot holds the same
    // destination on both surfaces.
    // «الهدف» IS THE FIFTH, AND WHICH OF THE OTHERS IT IS NOT:
    //   - not «صفقاتي» — that is what you DID; this is what you are aiming at.
    //   - not «حاسبة الصفقة» — that sizes one trade; this plans years of them.
    // It answers «أوصل إمتى؟», which nothing else here answered.
    //
    // AND «الإعدادات» IS NOT ONE OF THE FIVE. Six destinations on a 360px phone
    // truncate their labels, and a truncated label in a nav bar is a
    // destination people stop recognising. Settings is the one that leaves: it
    // is opened rarely, it is conventionally a gear in a header anyway, and it
    // is the only one outside the daily loop. It moved to `SettingsAction` in
    // each screen's AppBar, and the web does the same below `sm`.
    expect(labels, ['صفقاتي', 'السوق', 'الأسهم', 'حاسبة الصفقة', 'الهدف']);
    expect(find.byKey(settingsActionKey).hitTestable(), findsWidgets);

    // «التحليلات» was reachable only from the hub's overflow menu and «الهدف»
    // did not exist. Both are tabs now, because the web carries them as
    // top-level tabs and the two surfaces are meant to be the same product.
    //
    // «قائمة المراقبة» is the same story with a sharper edge: the app's overflow
    // menu is gone, and it took the ONLY route to `WatchlistFormScreen`'s add
    // mode with it — an item could be edited on the phone but never created
    // there. Word for word and slot for slot, this is the site's tab strip.
    expect(
      tester
          .widgetList<Tab>(find.byType(Tab))
          .map((t) => t.text)
          .toList(),
      [
        'قرار اليوم',
        'صفقاتي',
        'تخطيط',
        'الأداء',
        'التحليلات',
        'قائمة المراقبة',
        'تصدير CSV',
      ],
    );
  });

  testWidgets('an over-risk trade is pinned above the open section', (
    tester,
  ) async {
    await seed(tester, () async {
      await putTrade('safe', makeTrade(id: 'safe', ticker: 'HRHO'));
      await putTrade(
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
      await putTrade('a', makeTrade(id: 'a'));
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
      await putTrade(
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
      await putTrade(
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
      await putTrade(
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
      await putTrade(
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
      await putTrade(
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
      await putTrade('o1', makeTrade(id: 'o1'));
      await putTrade('o2', makeTrade(id: 'o2', qty: 900));
      await putTrade(
        'p1',
        makeTrade(id: 'p1', status: TradeStatus.planned, qty: 0),
      );
      await putTrade(
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
      await putWatch(
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
      await putWatch(
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
      await putWatch(
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
      await putTrade(
        'x',
        makeTrade(id: 'x', status: TradeStatus.cancelled, qty: 0),
      );
    });
    await pumpApp(tester);

    expect(find.text('ابدأ أول صفقة'), findsOneWidget);
  });

  testWidgets('the waiting threshold is read from settings', (tester) async {
    await seed(tester, () async {
      await app.seedSettings(const Settings(waitingThresholdDays: 5));
      await putTrade(
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
      await putTrade('o', makeTrade(id: 'o', qty: 900));
      await putTrade(
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
