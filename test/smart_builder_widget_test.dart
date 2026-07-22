import 'dart:io';

import 'package:egx_trade_journal/calculator/calculator_screen.dart';
import 'package:egx_trade_journal/core/hive_keys.dart';
import 'package:egx_trade_journal/core/theme.dart';
import 'package:egx_trade_journal/settings/settings_providers.dart';
import 'package:egx_trade_journal/trades/timeline_entry_adapter.dart';
import 'package:egx_trade_journal/trades/trade.dart';
import 'package:egx_trade_journal/trades/trade_adapter.dart';
import 'package:egx_trade_journal/trades/trades_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_ce/hive.dart';

/// Drives the spec's worked example through the real widget tree, so the
/// numbers are checked as the trader sees them — after formatting.
void main() {
  late Directory tempDir;
  late Box settingsBox;
  late Box<Trade> tradesBox;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('egx_smart');
    Hive.init(tempDir.path);
    if (!Hive.isAdapterRegistered(kTimelineEntryTypeId)) {
      Hive.registerAdapter(TimelineEntryAdapter());
    }
    if (!Hive.isAdapterRegistered(kTradeTypeId)) {
      Hive.registerAdapter(TradeAdapter());
    }
    settingsBox = await Hive.openBox(kSettingsBox);
    tradesBox = await Hive.openBox<Trade>(kTradesBox);
  });

  tearDown(() async {
    await Hive.close();
    if (tempDir.existsSync()) tempDir.deleteSync(recursive: true);
  });

  Future<void> pumpCalculator(WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          settingsBoxProvider.overrideWithValue(settingsBox),
          tradesBoxProvider.overrideWithValue(tradesBox),
        ],
        child: MaterialApp(
          theme: buildLightTheme(),
          locale: const Locale('ar'),
          supportedLocales: const [Locale('ar')],
          localizationsDelegates: const [
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: const CalculatorScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  /// The smart builder's entry field is the first on the screen.
  Future<void> enterPrice(WidgetTester tester, String price) async {
    await tester.enterText(find.byType(TextField).first, price);
    await tester.pumpAndSettle();
  }

  Future<void> scrollTo(WidgetTester tester, Finder target) async {
    await tester.scrollUntilVisible(
      target,
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
  }

  testWidgets('the builder appears above the untouched manual calculator', (
    tester,
  ) async {
    await pumpCalculator(tester);

    expect(find.text('منشئ الصفقة الذكي'), findsOneWidget);
    await scrollTo(tester, find.text('الحاسبة اليدوية'));
    expect(find.text('الحاسبة اليدوية'), findsOneWidget);
  });

  testWidgets("the spec's example renders 42.42 and 39.59", (tester) async {
    await pumpCalculator(tester);
    await enterPrice(tester, '40.40');

    await scrollTo(tester, find.text('ملخص الصفقة'));

    expect(find.text('42.42 ج.م'), findsOneWidget, reason: 'سعر الهدف');
    expect(find.text('39.59 ج.م'), findsOneWidget, reason: 'وقف الخسارة');
    // Defaults are 5% and 2%, so the plan is 2.02 against 0.81 per share.
    expect(find.text('419'), findsWidgets, reason: 'الأسهم المقترحة');
    expect(find.text('✅ صفقة جيدة'), findsOneWidget);
  });

  testWidgets('choosing percentages recalculates instantly', (tester) async {
    await pumpCalculator(tester);
    await enterPrice(tester, '100.00');

    // 5% / 2% by default.
    await scrollTo(tester, find.text('ملخص الصفقة'));
    expect(find.text('105.00 ج.م'), findsOneWidget);
    expect(find.text('98.00 ج.م'), findsOneWidget);

    // Switch the target to 3% — no button, no reload.
    await scrollTo(tester, find.widgetWithText(ChoiceChip, '3%').first);
    await tester.tap(find.widgetWithText(ChoiceChip, '3%').first);
    await tester.pumpAndSettle();

    await scrollTo(tester, find.text('ملخص الصفقة'));
    expect(find.text('103.00 ج.م'), findsOneWidget);
    expect(find.text('98.00 ج.م'), findsOneWidget, reason: 'الوقف ما اتغيرش');
  });

  testWidgets('quality degrades when the reward stops justifying the risk', (
    tester,
  ) async {
    await pumpCalculator(tester);
    await enterPrice(tester, '100.00');

    // 3% target against a 3% stop is a 1.0 ratio — a warning, not a win.
    await scrollTo(tester, find.widgetWithText(ChoiceChip, '3%').first);
    await tester.tap(find.widgetWithText(ChoiceChip, '3%').first);
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(ChoiceChip, '3%').last);
    await tester.pumpAndSettle();

    await scrollTo(tester, find.text('ملخص الصفقة'));
    expect(find.text('⚠️ المخاطرة مرتفعة'), findsOneWidget);
    expect(find.text('✅ صفقة جيدة'), findsNothing);
  });

  testWidgets('nothing is computed until a price is entered', (tester) async {
    await pumpCalculator(tester);
    await scrollTo(tester, find.text('ملخص الصفقة'));

    // Every derived figure reads as unavailable rather than as zero.
    expect(find.text('—'), findsWidgets);
    expect(find.text('✅ صفقة جيدة'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('the create button is disabled until the plan is sizeable', (
    tester,
  ) async {
    await pumpCalculator(tester);
    await scrollTo(tester, find.text('إنشاء الصفقة'));

    final before = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, 'إنشاء الصفقة'),
    );
    expect(before.onPressed, isNull);

    await enterPrice(tester, '40.40');
    await scrollTo(tester, find.text('إنشاء الصفقة'));
    final after = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, 'إنشاء الصفقة'),
    );
    expect(after.onPressed, isNotNull);
  });

  testWidgets('creating a trade opens the form already filled in', (
    tester,
  ) async {
    await pumpCalculator(tester);
    await enterPrice(tester, '40.40');

    await scrollTo(tester, find.text('إنشاء الصفقة'));
    await tester.tap(find.text('إنشاء الصفقة'));
    await tester.pumpAndSettle();

    expect(find.text('إضافة صفقة'), findsWidgets);

    List<String?> builtFieldValues() => tester
        .widgetList<TextFormField>(find.byType(TextFormField))
        .map((f) => f.controller?.text)
        .toList();

    expect(builtFieldValues(), containsAll(['40.40', '39.59', '419']));

    // The target sits further down the form, and a lazy ListView has not built
    // it yet — scroll it into existence before reading it.
    await scrollTo(tester, find.text('سعر الهدف (اختياري)'));
    expect(builtFieldValues(), contains('42.42'));
  });

  testWidgets('a typed percentage overrides the presets', (tester) async {
    await pumpCalculator(tester);
    await enterPrice(tester, '100.00');

    // The manual take-profit box is the second TextField in the builder.
    await tester.enterText(find.byType(TextField).at(1), '8');
    await tester.pumpAndSettle();

    await scrollTo(tester, find.text('ملخص الصفقة'));
    expect(find.text('108.00 ج.م'), findsOneWidget);
  });
}
