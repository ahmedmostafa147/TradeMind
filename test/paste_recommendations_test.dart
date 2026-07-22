import 'dart:io';

import 'package:egx_trade_journal/core/hive_keys.dart';
import 'package:egx_trade_journal/core/theme.dart';
import 'package:egx_trade_journal/settings/settings_providers.dart';
import 'package:egx_trade_journal/trades/timeline_entry_adapter.dart';
import 'package:egx_trade_journal/trades/trade.dart';
import 'package:egx_trade_journal/trades/trade_adapter.dart';
import 'package:egx_trade_journal/trades/trades_providers.dart';
import 'package:egx_trade_journal/watchlist/paste_recommendations_screen.dart';
import 'package:egx_trade_journal/watchlist/watchlist_item.dart';
import 'package:egx_trade_journal/watchlist/watchlist_item_adapter.dart';
import 'package:egx_trade_journal/watchlist/watchlist_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_ce/hive.dart';

void main() {
  late Directory tempDir;
  late Box settingsBox;
  late Box<Trade> tradesBox;
  late Box<WatchlistItem> watchlistBox;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('egx_paste');
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
  });

  tearDown(() async {
    await Hive.close();
    if (tempDir.existsSync()) tempDir.deleteSync(recursive: true);
  });

  Future<void> pumpScreen(WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          settingsBoxProvider.overrideWithValue(settingsBox),
          tradesBoxProvider.overrideWithValue(tradesBox),
          watchlistBoxProvider.overrideWithValue(watchlistBox),
        ],
        child: MaterialApp(
          // The real theme, so the ResultColors extension is present exactly
          // as it is in the app.
          theme: buildLightTheme(),
          locale: const Locale('ar'),
          supportedLocales: const [Locale('ar')],
          localizationsDelegates: const [
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: const PasteRecommendationsScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  Future<void> paste(WidgetTester tester, String message) async {
    await tester.enterText(find.byType(TextField).first, message);
    await tester.pumpAndSettle();
    await tester.tap(find.text('اقرأ الرسالة'));
    await tester.pumpAndSettle();
  }

  /// The review rows sit below the message box in a lazily-built ListView, so
  /// they have to be scrolled into existence before they can be asserted on.
  Future<void> scrollTo(WidgetTester tester, Finder target) async {
    await tester.scrollUntilVisible(
      target,
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
  }

  testWidgets('a pasted message becomes reviewable rows', (tester) async {
    await pumpScreen(tester);
    await paste(tester, '''
COMI دخول 10.50 استوب 9.80
HRHO شراء 18.40 وقف 17.90
''');

    expect(find.text('راجع قبل الحفظ'), findsOneWidget);
    await scrollTo(tester, find.text('احفظ 2 في المتابعة'));
    // Both complete, so the save button offers all of them.
    expect(find.text('احفظ 2 في المتابعة'), findsOneWidget);
    expect(find.byType(Checkbox), findsNWidgets(2));
  });

  testWidgets('an unreadable message says so instead of failing silently', (
    tester,
  ) async {
    await pumpScreen(tester);
    await paste(tester, 'السلام عليكم، مفيش ترشيحات النهاردة');

    expect(find.text('ملقيتش ترشيحات في الرسالة دي'), findsOneWidget);
    expect(find.text('راجع قبل الحفظ'), findsNothing);
  });

  testWidgets('an incomplete row blocks saving until it is fixed', (
    tester,
  ) async {
    await pumpScreen(tester);
    // Three bare numbers is ambiguous, so the parser refuses to guess.
    await paste(tester, 'COMI 10.50 9.80 12.00');

    await scrollTo(tester, find.text('كمّل الناقص الأول'));
    expect(find.text('سعر الشراء ناقص'), findsOneWidget);
    final button = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, 'كمّل الناقص الأول'),
    );
    expect(button.onPressed, isNull, reason: 'saving must be disabled');
  });

  testWidgets('a stop above the entry is rejected in review', (tester) async {
    await pumpScreen(tester);
    await paste(tester, 'COMI دخول 9.00 استوب 10.00');

    await scrollTo(tester, find.text('كمّل الناقص الأول'));
    expect(
      find.text('الاستوب لازم يكون أقل من سعر الشراء'),
      findsOneWidget,
    );
  });

  testWidgets('saving writes every selected row with its source', (
    tester,
  ) async {
    await pumpScreen(tester);
    await paste(tester, '''
COMI دخول 10.50 استوب 9.80
HRHO شراء 18.40 وقف 17.90
''');

    // The source field is the second TextField on the screen.
    await tester.enterText(find.byType(TextField).at(1), 'قناة التحليل');
    await tester.pumpAndSettle();
    await scrollTo(tester, find.text('احفظ 2 في المتابعة'));

    // The write itself is real file I/O, which never completes inside the
    // fake-async zone — so the tap is driven through runAsync.
    await tester.runAsync(() async {
      await tester.tap(find.text('احفظ 2 في المتابعة'));
      await Future<void>.delayed(const Duration(milliseconds: 200));
    });

    expect(watchlistBox.length, 2);
    final saved = watchlistBox.values.toList()
      ..sort((a, b) => a.ticker.compareTo(b.ticker));
    expect(saved[0].ticker, 'COMI');
    expect(saved[0].targetBuyPrice, 10.50);
    expect(saved[0].stopPrice, 9.80);
    expect(saved[0].source, 'قناة التحليل');
    expect(saved[1].ticker, 'HRHO');
    expect(saved[1].source, 'قناة التحليل');
  });

  testWidgets('unticking a row excludes it from the save', (tester) async {
    await pumpScreen(tester);
    await paste(tester, '''
COMI دخول 10.50 استوب 9.80
HRHO شراء 18.40 وقف 17.90
''');

    await scrollTo(tester, find.text('احفظ 2 في المتابعة'));
    await tester.tap(find.byType(Checkbox).first);
    await tester.pumpAndSettle();
    expect(find.text('احفظ 1 في المتابعة'), findsOneWidget);

    await tester.runAsync(() async {
      await tester.tap(find.text('احفظ 1 في المتابعة'));
      await Future<void>.delayed(const Duration(milliseconds: 200));
    });

    expect(watchlistBox.length, 1);
    expect(watchlistBox.values.single.ticker, 'HRHO');
  });

  testWidgets('editing a parsed value in review is what gets saved', (
    tester,
  ) async {
    await pumpScreen(tester);
    await paste(tester, 'COMI دخول 10.50 استوب 9.80');

    await scrollTo(tester, find.text('احفظ 1 في المتابعة'));
    // Correct the stop the sender got wrong.
    await tester.enterText(
      find.widgetWithText(TextField, 'الاستوب').first,
      '9.20',
    );
    await tester.pumpAndSettle();

    await tester.runAsync(() async {
      await tester.tap(find.text('احفظ 1 في المتابعة'));
      await Future<void>.delayed(const Duration(milliseconds: 200));
    });

    expect(watchlistBox.values.single.stopPrice, 9.20);
  });
}
