import 'dart:io';

import 'package:egx_trade_journal/app.dart';
import 'package:egx_trade_journal/billing/billing_providers.dart';
import 'package:egx_trade_journal/billing/entitlements.dart';
import 'package:egx_trade_journal/core/hive_keys.dart';
import 'package:egx_trade_journal/features/auth/providers/auth_providers.dart';
import 'package:egx_trade_journal/features/auth/repositories/auth_repository.dart';
import 'package:egx_trade_journal/features/market/market_providers.dart';
import 'package:egx_trade_journal/settings/settings_providers.dart';
import 'package:egx_trade_journal/trades/checklist.dart';
import 'package:egx_trade_journal/trades/timeline_entry.dart';
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

/// Drives the section 9 acceptance criteria through the real widget tree, so
/// the numbers are verified as the user actually sees them — after formatting,
/// not just as raw doubles.
/// Grants an active subscription for the widget tests. Named rather than a
/// closure because AsyncNotifierProvider wants a constructor.
class _ProTrial extends AsyncNotifier<Entitlement> implements BillingController {
  @override
  Future<Entitlement> build() async => const Entitlement(plan: Plan.pro);

  @override
  Future<void> refresh() async {}
}

void main() {
  late Directory tempDir;
  late Box settingsBox;
  late Box<Trade> tradesBox;
  late Box<WatchlistItem> watchlistBox;
  late Box authBox;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('egx_acceptance');
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
    // Just close, then drop the directory. Hive.deleteFromDisk() hangs here:
    // the widget tree still holds these boxes when tearDown runs, and each test
    // gets its own temp directory anyway, so there is nothing to clean up
    // beyond removing it.
    await Hive.close();
    if (tempDir.existsSync()) tempDir.deleteSync(recursive: true);
  });

  /// Hive writes MUST go through runAsync inside testWidgets.
  ///
  /// A testWidgets body runs in a fake-async zone, where real file I/O never
  /// completes — `await box.put(...)` simply hangs forever, and the only
  /// symptom is the whole test timing out ten minutes later with no useful
  /// message. runAsync escapes to the real clock for the duration.
  Future<void> seed(WidgetTester tester, Future<void> Function() write) async {
    await tester.runAsync(write);
  }

  Future<void> pumpApp(WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          settingsBoxProvider.overrideWithValue(settingsBox),
          tradesBoxProvider.overrideWithValue(tradesBox),
          watchlistBoxProvider.overrideWithValue(watchlistBox),
          // Mirrors main(): both auth providers throw until overridden, and
          // the settings screen watches them, so the whole app fails to build
          // without this pair.
          authBoxProvider.overrideWithValue(authBox),
          authProvider.overrideWith(() => AuthRepository(authBox)),
          // Keep the open-trade live-price lookup offline and instant, so no
          // test hits the network or spins on the loading indicator.
          livePriceProvider.overrideWith((ref, symbol) async => null),
          // FULL ACCESS, because these tests are about the journal and not
          // about billing. Without Firebase the controller resolves to `free`
          // — correctly — and «الأداء» and «التحليلات» then render the paywall
          // instead of the figures each test is asserting on. Gating is covered
          // by entitlements_test.dart, which needs no widgets at all.
          billingProvider.overrideWith(_ProTrial.new),
        ],
        child: const EgxJournalApp(),
      ),
    );
    await tester.pumpAndSettle();
  }

  // The manual calculator was merged into the smart builder: the stop is now
  // entered as an absolute price by switching the builder to "سعر" mode. These
  // target the builder's own fields by key.
  final entryField = find.byKey(const ValueKey('entry-price-field'));
  final stopPriceField = find.byKey(const ValueKey('stop-price-field'));

  /// The scrollable of whatever screen is on top.
  ///
  /// NOT a bare `find.byType(Scrollable).first`: a pushed route leaves the
  /// whole shell mounted underneath it, so the first Scrollable in the tree
  /// belongs to a screen the user cannot see. Scoping to the last Scaffold
  /// picks the route actually in front.
  final contentScrollable = find
      .descendant(
        of: find.byType(Scaffold).last,
        matching: find.byType(Scrollable),
      )
      .first;

  /// The content list of one «صفقاتي» tab, by key.
  ///
  /// The hub needs its own finder because its TabBarView is itself a PageView
  /// — dragging that switches tab instead of scrolling — and it keeps the
  /// neighbouring tab built, so neither the first nor the last Scrollable under
  /// the hub is reliably the visible one. The key is.
  /// `.first` because the list's own Scrollable is not the only one inside it:
  /// «الأداء» nests GridViews for the stat tiles, and those are Scrollables too
  /// (non-scrolling ones). The outermost is the list itself.
  Finder hubList(String name) => find
      .descendant(
        of: find.byKey(ValueKey(name)),
        matching: find.byType(Scrollable),
      )
      .first;

  /// Navigates to a destination by the name it had when there were five tabs.
  ///
  /// «قرار اليوم», «سجل الصفقات» and «لوحة التحكم» are now tabs inside
  /// «صفقاتي», so reaching them takes two taps. Mapping that here rather than
  /// at forty call sites keeps each test saying WHERE it wants to be instead of
  /// how the shell happens to be wired this week.
  Future<void> openTab(WidgetTester tester, String label) async {
    const hubTabs = {
      'قرار اليوم': 'قرار اليوم',
      'سجل الصفقات': 'صفقاتي',
      'لوحة التحكم': 'الأداء',
    };

    if (hubTabs[label] case final subTab?) {
      // Scoped to the NavigationBar: 'صفقاتي' is both the bar's label and,
      // since the journal split into «صفقاتي» and «تخطيط», one of the hub's
      // own tabs — so a bare find.text matches two widgets.
      await tester.tap(
        find.descendant(
          of: find.byType(NavigationBar),
          matching: find.text('صفقاتي'),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(Tab, subTab));
      await tester.pumpAndSettle();
      return;
    }

    await tester.tap(find.text(label).last);
    await tester.pumpAndSettle();
  }

  /// The detailed analytics moved from an icon on the dashboard into the hub's
  /// overflow menu.
  Future<void> openAnalytics(WidgetTester tester) async {
    // By tooltip, not by type: PopupMenuButton is generic over the hub's own
    // private action enum, so no byType finder here can name it.
    await tester.tap(find.byTooltip('المزيد'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('الإحصائيات التفصيلية').last);
    await tester.pumpAndSettle();
  }

  /// Opens the full trade form from the trades tab.
  ///
  /// The FAB now opens the quick-add sheet rather than the full form, so
  /// reaching the form means going through "التفاصيل الكاملة".
  Future<void> openFullTradeForm(WidgetTester tester) async {
    await tester.tap(find.text(kAddTradeLabel).last);
    await tester.pumpAndSettle();
    await tester.tap(find.text('التفاصيل الكاملة ←'));
    await tester.pumpAndSettle();
  }

  /// Tags, screenshots and the timeline moved behind a collapsed section.
  Future<void> expandOptionalSections(WidgetTester tester) async {
    final header = find.text('أدوات ومرفقات إضافية (صور، تصنيفات، سجل)');
    await tester.scrollUntilVisible(
      header,
      300,
      scrollable: contentScrollable,
    );
    await tester.tap(header);
    await tester.pumpAndSettle();
  }

  /// Opens the calculator and switches the stop input to absolute-price mode,
  /// which is what the manual calculator used to provide.
  Future<void> openManualCalculator(WidgetTester tester) async {
    await openTab(tester, 'حاسبة الصفقة');
    // `.last`, not the only one: both «جني الأرباح» and «وقف الخسارة» carry the
    // نسبة/سعر toggle now, and the stop's is the second.
    await tester.ensureVisible(find.text('سعر').last);
    await tester.tap(find.text('سعر').last);
    await tester.pumpAndSettle();
  }

  /// The builder recomputes inline, so the results are already on screen; this
  /// just brings the summary card fully into view before asserting.
  Future<void> showManualResults(WidgetTester tester) async {
    await tester.scrollUntilVisible(
      find.text('الأسهم المقترحة'),
      300,
      scrollable: contentScrollable,
    );
    await tester.pumpAndSettle();
  }

  testWidgets('app opens RTL with Arabic labels and no crash', (tester) async {
    await pumpApp(tester);

    expect(Directionality.of(tester.element(find.byType(NavigationBar))),
        TextDirection.rtl);

    // Each destination a different job — not five, three of which were the
    // same trades shown differently.
    expect(find.text('صفقاتي'), findsWidgets);
    expect(find.text('السوق'), findsWidgets);
    expect(find.text('حاسبة الصفقة'), findsWidgets);
    expect(find.text('الإعدادات'), findsWidgets);

    // The journal's views are tabs inside صفقاتي, and they carry the SAME
    // labels the web dashboard uses — the two surfaces are one product, so a
    // screen must not be called «اليوم» here and «قرار اليوم» there.
    for (final tab in const [
      'قرار اليوم',
      'صفقاتي',
      'تخطيط',
      'الأداء',
      'التحليلات',
      'الهدف',
    ]) {
      expect(find.widgetWithText(Tab, tab), findsOneWidget, reason: tab);
    }
  });

  testWidgets('settings show max loss of 340.00 at the defaults', (
    tester,
  ) async {
    await pumpApp(tester);
    await openTab(tester, 'الإعدادات');

    expect(find.text('أقصى خسارة لو ضرب الاستوب'), findsOneWidget);
    expect(find.text('340.00 ج.م'), findsOneWidget);
  });

  testWidgets('zero trades shows "—" and does not crash', (tester) async {
    await pumpApp(tester);
    await openTab(tester, 'لوحة التحكم');

    expect(find.text('نسبة النجاح'), findsOneWidget);
    expect(find.text('—'), findsWidgets);

    // The chart sits below the fold, and ListView builds lazily, so it has to
    // be scrolled into existence before it can be asserted on.
    await tester.scrollUntilVisible(
      find.text('الرسم البياني هيظهر بعد أول صفقة مغلقة'),
      300,
      scrollable: hubList('performance-list'),
    );
    await tester.pumpAndSettle();

    expect(find.text('الرسم البياني هيظهر بعد أول صفقة مغلقة'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('empty trades list explains how to start', (tester) async {
    await pumpApp(tester);
    await openTab(tester, 'سجل الصفقات');

    expect(find.text('لسه مفيش صفقات'), findsOneWidget);
    expect(find.text(kAddTradeLabel), findsWidgets);
  });

  group('calculator — the spec fixture on screen', () {
    testWidgets('10.00 / 9.50 suggests 680 and does NOT flag at exactly 2%', (
      tester,
    ) async {
      await pumpApp(tester);
      await openManualCalculator(tester);

      await tester.enterText(entryField, '10.00');
      await tester.enterText(stopPriceField, '9.50');
      await tester.pumpAndSettle();
      await showManualResults(tester);

      expect(find.text('680'), findsOneWidget, reason: 'الأسهم المقترحة');
      expect(find.text('6,800.00 ج.م'), findsOneWidget, reason: 'قيمة المركز');
      expect(find.text('340.00 ج.م'), findsWidgets, reason: 'المخاطرة');
      expect(find.text('2.0%'), findsOneWidget, reason: 'نسبة المخاطرة');

      // The core of the acceptance criteria: exactly at the limit is not a
      // breach, so the warning must be absent.
      expect(
        find.text('تحذير: المخاطرة أعلى من الحد المسموح'),
        findsNothing,
        reason: 'exactly at the limit must not flag',
      );
    });

    testWidgets('the non-dyadic price pair suggests 1000, not 999', (
      tester,
    ) async {
      // capital 10,000 at 1% — the case that exposes both float bugs.
      await seed(tester, () async {
        await settingsBox.put(kCapitalKey, 10000.0);
        await settingsBox.put(kMaxRiskKey, 0.01);
      });
      await pumpApp(tester);
      await openManualCalculator(tester);

      await tester.enterText(entryField, '1.10');
      await tester.enterText(stopPriceField, '1.00');
      await tester.pumpAndSettle();
      await showManualResults(tester);

      expect(find.text('1,000'), findsOneWidget);
      expect(find.text('999'), findsNothing);
      expect(
        find.text('تحذير: المخاطرة أعلى من الحد المسموح'),
        findsNothing,
        reason: 'the app must not flag the quantity it just recommended',
      );
    });

    testWidgets('entry below stop shows an inline error and no quantity', (
      tester,
    ) async {
      await pumpApp(tester);
      await openManualCalculator(tester);

      await tester.enterText(entryField, '9.00');
      await tester.enterText(stopPriceField, '10.00');
      await tester.pumpAndSettle();

      expect(
        find.text('سعر الاستوب لازم يكون أقل من سعر الدخول'),
        findsOneWidget,
      );
      // And the summary says what is missing instead of printing a column of
      // «—», which reads as a calculator that failed rather than one waiting.
      expect(
        find.text('اكتب سعر الدخول وحدّد الهدف والاستوب، والباقي هيتحسب هنا.'),
        findsOneWidget,
      );
    });
  });

  group('trade list with a saved trade', () {
    Future<void> seedFixtureTrade(
      WidgetTester tester, {
      int quantity = 680,
    }) async {
      await seed(tester, () async {
        await tradesBox.put(
          'fixture',
          Trade(
            id: 'fixture',
            entryDate: DateTime(2026, 3, 1),
            ticker: 'COMI',
            reason: 'اختراق',
            entryPrice: 10.00,
            stopPrice: 9.50,
            quantity: quantity,
            exitPrice: 11.20,
            exitDate: DateTime(2026, 3, 10),
          ),
        );
      });
    }

    testWidgets('renders ربح, 2.4R and +816.00 with no risk warning', (
      tester,
    ) async {
      await seedFixtureTrade(tester);
      await pumpApp(tester);
      await openTab(tester, 'سجل الصفقات');

      expect(find.text('COMI'), findsOneWidget);
      expect(find.text('ربح'), findsOneWidget);
      expect(find.text('2.4R'), findsOneWidget);
      expect(find.text('+816.00 ج.م'), findsOneWidget);
      expect(find.text('2.0%'), findsOneWidget);
      expect(find.text('تحذير: المخاطرة أعلى من الحد المسموح'), findsNothing);
    });

    testWidgets('an oversized position is flagged red', (tester) async {
      // 700 shares → risk 350/17000 = 2.06%, a genuine breach.
      await seedFixtureTrade(tester, quantity: 700);
      await pumpApp(tester);
      await openTab(tester, 'سجل الصفقات');

      expect(find.text('تحذير: المخاطرة أعلى من الحد المسموح'), findsOneWidget);
      expect(find.text('2.1%'), findsOneWidget);
    });

    testWidgets('dashboard reflects the closed trade', (tester) async {
      await seedFixtureTrade(tester);
      await pumpApp(tester);
      await openTab(tester, 'لوحة التحكم');

      expect(find.text('17,816.00 ج.م'), findsOneWidget, reason: 'رأس المال');
      expect(find.text('+816.00 ج.م'), findsOneWidget);
      expect(find.text('100.0%'), findsOneWidget, reason: 'نسبة النجاح');
      expect(find.text('2.4R'), findsOneWidget);
      expect(find.text('4.8%'), findsOneWidget, reason: 'العائد الكلي');
    });

    testWidgets('the analytics screen opens and reports the trade', (
      tester,
    ) async {
      await seedFixtureTrade(tester);
      await pumpApp(tester);
      await openTab(tester, 'لوحة التحكم');

      await openAnalytics(tester);
      await tester.pumpAndSettle();

      expect(find.text('جودة الأداء'), findsOneWidget);
      // One winning trade: expectancy equals its P&L, no losses so the profit
      // factor is undefined rather than infinite.
      expect(find.text('816.00 ج.م'), findsWidgets, reason: 'التوقع');
      expect(find.text('2.4R'), findsWidgets, reason: 'متوسط ووسيط R');

      // The highlights card sits far down a lazily-built list.
      await tester.scrollUntilVisible(
        find.text('أبرز الصفقات'),
        400,
        scrollable: contentScrollable,
      );
      await tester.pumpAndSettle();
      expect(find.text('COMI'), findsWidgets, reason: 'أفضل صفقة');
      expect(tester.takeException(), isNull);
    });
  });

  group('trade detail page', () {
    Future<void> seedRich(WidgetTester tester) async {
      await seed(tester, () async {
        await tradesBox.put(
          'rich',
          Trade(
            id: 'rich',
            entryDate: DateTime(2026, 3, 1),
            ticker: 'COMI',
            reason: 'اختراق مقاومة قوي على حجم عالي',
            entryPrice: 10.00,
            stopPrice: 9.50,
            quantity: 680,
            exitPrice: 11.20,
            exitDate: DateTime(2026, 3, 10),
            notes: 'الدرس: التزمت بالخطة',
            tags: const ['بريك أوت', 'سوينج'],
            isFavorite: true,
            completedChecklistItems: const [
              'trend',
              'levels',
              'volume',
              'risk',
              'size',
              'news',
            ],
            timeline: [
              TimelineEntry(date: DateTime(2026, 3, 1), text: 'اشتريت النهاردة'),
              TimelineEntry(date: DateTime(2026, 3, 4), text: 'حركت الاستوب'),
            ],
          ),
        );
      });
    }

    testWidgets('tapping a row opens the read-only detail page', (
      tester,
    ) async {
      await seedRich(tester);
      await pumpApp(tester);
      await openTab(tester, 'سجل الصفقات');

      await tester.tap(find.text('COMI'));
      await tester.pumpAndSettle();

      // Headline metrics.
      expect(find.text('+816.00 ج.م'), findsWidgets);
      expect(find.text('2.4R'), findsWidgets);
      expect(find.text('12.0%'), findsWidgets, reason: 'العائد');
      expect(find.text('مغلقة'), findsWidgets, reason: 'الحالة');

      // No editable fields on this page.
      expect(find.byType(TextFormField), findsNothing);
      expect(tester.takeException(), isNull);
    });

    testWidgets('shows tags, timeline, checklist and the risk score', (
      tester,
    ) async {
      await seedRich(tester);
      await pumpApp(tester);
      await openTab(tester, 'سجل الصفقات');
      await tester.tap(find.text('COMI'));
      await tester.pumpAndSettle();

      await tester.scrollUntilVisible(
        find.text('تقييم الانضباط'),
        300,
        scrollable: contentScrollable,
      );
      await tester.pumpAndSettle();
      // Checklist complete, risk exactly at limit, stop present, long reason —
      // four of five components, so 80 without screenshots.
      expect(find.text('80/100 · جيد'), findsOneWidget);

      await tester.scrollUntilVisible(
        find.text('التصنيفات'),
        300,
        scrollable: contentScrollable,
      );
      await tester.pumpAndSettle();
      expect(find.text('بريك أوت'), findsOneWidget);

      await tester.scrollUntilVisible(
        find.text('اشتريت النهاردة'),
        300,
        scrollable: contentScrollable,
      );
      await tester.pumpAndSettle();
      expect(find.text('حركت الاستوب'), findsOneWidget);
    });

    testWidgets('the edit button opens the form prefilled', (tester) async {
      await seedRich(tester);
      await pumpApp(tester);
      await openTab(tester, 'سجل الصفقات');
      await tester.tap(find.text('COMI'));
      await tester.pumpAndSettle();

      await tester.tap(find.byTooltip('تعديل'));
      await tester.pumpAndSettle();

      expect(find.text('تعديل الصفقة'), findsOneWidget);
      // The ticker field carries "COMI" as both its value and its hint, so
      // match the controller rather than the rendered text.
      final ticker = tester.widget<TextFormField>(
        find.byType(TextFormField).first,
      );
      expect(ticker.controller?.text, 'COMI');

      // Tags now sit inside a collapsed "extras" section on the form.
      await expandOptionalSections(tester);
      expect(find.text('بريك أوت'), findsWidgets, reason: 'التصنيفات محفوظة');
    });
  });

  testWidgets('a planned idea needs no quantity and offers no exit', (
    tester,
  ) async {
    await pumpApp(tester);
    await openTab(tester, 'سجل الصفقات');
    await openFullTradeForm(tester);

    // A new trade now starts as "مخططة", so switch to "مفتوحة" first: only an
    // executed position has an exit to record.
    await tester.tap(find.widgetWithText(ChoiceChip, 'مفتوحة'));
    await tester.pumpAndSettle();

    // The exit section sits at the bottom of a lazily-built form, so it has to
    // be scrolled into existence before it can be asserted on.
    await tester.scrollUntilVisible(
      find.text('سعر الخروج'),
      300,
      scrollable: contentScrollable,
    );
    await tester.pumpAndSettle();
    expect(find.text('سعر الخروج'), findsOneWidget, reason: 'open has an exit');

    await tester.scrollUntilVisible(
      find.widgetWithText(ChoiceChip, 'مخططة'),
      -300,
      scrollable: contentScrollable,
    );
    await tester.tap(find.widgetWithText(ChoiceChip, 'مخططة'));
    await tester.pumpAndSettle();

    // Removed from the tree entirely, so no amount of scrolling finds it.
    expect(
      find.text('سعر الخروج'),
      findsNothing,
      reason: 'an unexecuted idea has no exit',
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('an exit price with no date is refused, not crashed on', (
    tester,
  ) async {
    // [Trade] asserts exitPrice and exitDate are set together. The form offers
    // them as two independent inputs — with a clear button on the date — so a
    // price alone used to throw an AssertionError on save and take the app
    // down. This is the exact path the "إقفال" button sends people down.
    await pumpApp(tester);
    await openTab(tester, 'سجل الصفقات');
    await openFullTradeForm(tester);

    await tester.tap(find.widgetWithText(ChoiceChip, 'مفتوحة'));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.widgetWithText(TextFormField, 'رمز السهم'),
      'COMI',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'سبب الدخول والتحليل الفني'),
      'اختراق',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'سعر الدخول'),
      '10.00',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'سعر الاستوب'),
      '9.50',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'عدد الأسهم'),
      '680',
    );
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.widgetWithText(TextFormField, 'سعر الخروج'),
      300,
      scrollable: contentScrollable,
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'سعر الخروج'),
      '12.00',
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('حفظ'));
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull, reason: 'the reported crash');
    expect(find.text('اختار تاريخ الخروج'), findsOneWidget);
    expect(
      find.text('قبل ما تحفظ'),
      findsNothing,
      reason: 'validation runs before the checklist, so the save never starts',
    );
    expect(tradesBox.isEmpty, isTrue, reason: 'nothing half-saved');
  });

  testWidgets('the checklist sheet appears before saving when enabled', (
    tester,
  ) async {
    await pumpApp(tester);
    await openTab(tester, 'سجل الصفقات');
    await openFullTradeForm(tester);

    await tester.enterText(find.widgetWithText(TextFormField, 'رمز السهم'), 'COMI');
    await tester.enterText(
      find.widgetWithText(TextFormField, 'سبب الدخول والتحليل الفني'),
      'اختراق',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'سعر الدخول'),
      '10.00',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'سعر الاستوب'),
      '9.50',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'عدد الأسهم'),
      '680',
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('حفظ'));
    await tester.pumpAndSettle();

    expect(find.text('قبل ما تحفظ'), findsOneWidget);
    for (final item in ChecklistItem.values) {
      expect(find.text(item.label), findsOneWidget);
    }

    // Backing out of the sheet must abandon the save entirely.
    //
    // The completed save is deliberately NOT exercised here: committing it runs
    // the real Hive write, and a testWidgets body runs in a fake-async zone
    // where file I/O never completes — the test would hang for its full timeout
    // rather than fail. Persistence is covered by trade_adapter_test instead.
    await tester.tap(find.text('رجوع'));
    await tester.pumpAndSettle();

    expect(find.text('قبل ما تحفظ'), findsNothing, reason: 'sheet dismissed');
    expect(
      find.text('سبب الدخول والتحليل الفني'),
      findsWidgets,
      reason: 'still on the form, nothing saved',
    );
    expect(tradesBox.isEmpty, isTrue, reason: 'backing out saved nothing');
  });

  testWidgets('the checklist can be turned off in settings', (tester) async {
    await seed(tester, () async {
      await settingsBox.put(kEnableChecklistKey, false);
    });
    await pumpApp(tester);
    await openTab(tester, 'الإعدادات');

    await tester.scrollUntilVisible(
      find.text('قائمة التحقق قبل الحفظ'),
      300,
      scrollable: contentScrollable,
    );
    await tester.pumpAndSettle();

    final toggle = tester.widget<SwitchListTile>(
      find.widgetWithText(SwitchListTile, 'قائمة التحقق قبل الحفظ'),
    );
    expect(toggle.value, isFalse, reason: 'the stored preference is honoured');
  });

  testWidgets('analytics on an empty journal shows "—" and does not crash', (
    tester,
  ) async {
    await pumpApp(tester);
    await openTab(tester, 'لوحة التحكم');
    await openAnalytics(tester);

    expect(find.text('جودة الأداء'), findsOneWidget);
    expect(find.text('—'), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets('all rendered numbers use Western digits', (tester) async {
    await seed(tester, () async {
      await tradesBox.put(
        'fixture',
        Trade(
          id: 'fixture',
          entryDate: DateTime(2026, 3, 1),
          ticker: 'COMI',
          reason: 'اختراق',
          entryPrice: 10.00,
          stopPrice: 9.50,
          quantity: 680,
          exitPrice: 11.20,
          exitDate: DateTime(2026, 3, 10),
        ),
      );
    });
    await pumpApp(tester);

    for (final label in ['لوحة التحكم', 'سجل الصفقات', 'الإعدادات']) {
      await openTab(tester, label);
      final texts = tester.widgetList<Text>(find.byType(Text));
      for (final widget in texts) {
        final data = widget.data;
        if (data == null) continue;
        expect(
          data.runes.any((r) => r >= 0x0660 && r <= 0x0669),
          isFalse,
          reason: 'Arabic-Indic digits leaked into "$data" on $label',
        );
      }
    }
  });
}
