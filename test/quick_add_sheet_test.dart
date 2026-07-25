import 'dart:io';

import 'package:egx_trade_journal/core/hive_keys.dart';
import 'package:egx_trade_journal/core/widgets/risk_warning.dart';
import 'package:egx_trade_journal/features/market/market_providers.dart';
import 'package:egx_trade_journal/settings/settings_providers.dart';
import 'package:egx_trade_journal/trades/timeline_entry_adapter.dart';
import 'package:egx_trade_journal/trades/trade.dart';
import 'package:egx_trade_journal/trades/trade_adapter.dart';
import 'package:egx_trade_journal/trades/trades_providers.dart';
import 'package:egx_trade_journal/trades/widgets/quick_add_trade_sheet.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_ce/hive.dart';

/// Covers the quick-add sheet's sizing inputs and its layout under a keyboard.
///
/// Two regressions live here. The sheet laid its content out in a bare Column,
/// so the inline ticker suggestions pushed it past the space left above the
/// keyboard and it overflowed rather than scrolled. And it had no quantity
/// input at all, so every position was sized as though the entire account
/// backed it, with a readout that showed the settings-wide loss budget under
/// the label "المخاطرة" — the same figure for every trade, regardless of size.
void main() {
  late Directory tempDir;
  late Box settingsBox;
  late Box<Trade> tradesBox;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('egx_quick_add');
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

  /// Pumps the sheet alone at [size], so the keyboard-constrained height that
  /// produced the overflow can be reproduced deliberately.
  Future<void> pumpSheet(WidgetTester tester, {Size? size}) async {
    if (size != null) {
      tester.view.physicalSize = size;
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
    }

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          settingsBoxProvider.overrideWithValue(settingsBox),
          tradesBoxProvider.overrideWithValue(tradesBox),
          // No network, no spinner: the quote badge is not what is under test.
          livePriceProvider.overrideWith((ref, symbol) async => null),
        ],
        child: const MaterialApp(
          home: Directionality(
            textDirection: TextDirection.rtl,
            child: Scaffold(
              // Mirrors showModalBottomSheet(isScrollControlled: true), which
              // hands the sheet the whole height and lets it size itself.
              body: SingleChildScrollView(child: QuickAddTradeSheet()),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  Finder fieldWithLabel(String label) =>
      find.ancestor(of: find.text(label), matching: find.byType(TextField));

  testWidgets('ticker suggestions scroll instead of overflowing a short sheet', (
    tester,
  ) async {
    // Roughly what is left above an open keyboard on the reported phone.
    await pumpSheet(tester, size: const Size(900, 800));

    await tester.enterText(find.byType(TextFormField).first, 'B');
    await tester.pumpAndSettle();

    // The reported symptom was a RenderFlex overflow painted at the bottom.
    expect(tester.takeException(), isNull);
    expect(find.byType(ActionChip), findsWidgets, reason: 'suggestions shown');
  });

  testWidgets('typing a ticker updates the sheet with no other interaction', (
    tester,
  ) async {
    await pumpSheet(tester);

    // Suggestions are rendered by TickerField itself, but the save button is
    // the parent's — it only reacts if the parent was told the text changed.
    await tester.enterText(find.byType(TextFormField).first, 'COMI');
    await tester.pumpAndSettle();

    expect(find.text('البنك التجاري الدولي (CIB)'), findsOneWidget);
  });

  testWidgets('a typed quantity overrides the risk-rule suggestion', (
    tester,
  ) async {
    await pumpSheet(tester);

    await tester.enterText(find.byType(TextFormField).first, 'COMI');
    await tester.enterText(fieldWithLabel('سعر الدخول'), '10');
    await tester.enterText(fieldWithLabel('وقف الخسارة'), '9.50');
    await tester.pumpAndSettle();

    // Defaults are 17,000 at 2% → 340 budget over a 0.50 stop → 680 shares.
    expect(find.text('المقترح: 680'), findsOneWidget);

    await tester.enterText(fieldWithLabel('عدد الأسهم'), '100');
    await tester.pumpAndSettle();

    // The readout must follow the typed quantity, not the suggestion.
    expect(find.text('100'), findsWidgets);
    expect(find.text('1,000.00 ج.م'), findsOneWidget, reason: 'position value');
    // 100 × 0.50 = 50 risked, which is 50/17,000 = 0.3% — NOT the 340.00
    // settings budget the old readout printed here for every trade alike.
    expect(find.textContaining('50.00 ج.م'), findsOneWidget);
    expect(find.textContaining('0.3%'), findsOneWidget);
    expect(find.text('340.00 ج.م'), findsNothing);
  });

  testWidgets('an oversized typed quantity is flagged, not quietly accepted', (
    tester,
  ) async {
    await pumpSheet(tester);

    await tester.enterText(find.byType(TextFormField).first, 'COMI');
    await tester.enterText(fieldWithLabel('سعر الدخول'), '10');
    await tester.enterText(fieldWithLabel('وقف الخسارة'), '9.50');
    await tester.enterText(fieldWithLabel('عدد الأسهم'), '2000');
    await tester.pumpAndSettle();

    // 2,000 × 0.50 = 1,000 risked against a 340 limit.
    expect(find.byType(RiskWarning), findsOneWidget);
  });

  testWidgets('an empty or zero quantity means "use the suggestion"', (
    tester,
  ) async {
    await pumpSheet(tester);

    await tester.enterText(find.byType(TextFormField).first, 'COMI');
    await tester.enterText(fieldWithLabel('سعر الدخول'), '10');
    await tester.enterText(fieldWithLabel('وقف الخسارة'), '9.50');
    await tester.pumpAndSettle();

    expect(find.text('680'), findsWidgets, reason: 'left blank, sized by risk');

    // SizingResult treats a non-positive userQty as unset, which is what the
    // full form does too — a lone "0" is a half-typed number, not a request
    // for a zero-share position.
    await tester.enterText(fieldWithLabel('عدد الأسهم'), '0');
    await tester.pumpAndSettle();

    expect(find.text('680'), findsWidgets);
  });

  testWidgets('saving is blocked while no quantity can be resolved', (
    tester,
  ) async {
    await pumpSheet(tester);

    final saveButton = find.widgetWithText(FilledButton, 'حفظ الصفقة السريعة');
    expect(
      tester.widget<FilledButton>(saveButton).onPressed,
      isNull,
      reason: 'nothing entered yet',
    );

    // A stop above the entry sizes nothing, so there is no quantity to save.
    await tester.enterText(find.byType(TextFormField).first, 'COMI');
    await tester.enterText(fieldWithLabel('سعر الدخول'), '10');
    await tester.enterText(fieldWithLabel('وقف الخسارة'), '11');
    await tester.pumpAndSettle();

    expect(
      tester.widget<FilledButton>(saveButton).onPressed,
      isNull,
      reason: 'an inverted stop is not a position',
    );

    await tester.enterText(fieldWithLabel('وقف الخسارة'), '9.50');
    await tester.pumpAndSettle();

    expect(tester.widget<FilledButton>(saveButton).onPressed, isNotNull);
  });

  testWidgets('the saved trade carries the typed quantity', (tester) async {
    await pumpSheet(tester);

    await tester.enterText(find.byType(TextFormField).first, 'COMI');
    await tester.enterText(fieldWithLabel('سعر الدخول'), '10');
    await tester.enterText(fieldWithLabel('وقف الخسارة'), '9.50');
    await tester.enterText(fieldWithLabel('عدد الأسهم'), '120');
    await tester.pumpAndSettle();

    // The save awaits a Hive write, and real file I/O never completes inside
    // testWidgets' fake-async zone — runAsync escapes to the real clock, the
    // same reason the acceptance suite seeds through it.
    await tester.runAsync(() async {
      await tester.tap(find.widgetWithText(FilledButton, 'حفظ الصفقة السريعة'));
      await tester.pump();
      await Future<void>.delayed(const Duration(milliseconds: 200));
    });

    expect(tradesBox.length, 1);
    final saved = tradesBox.values.first;
    expect(saved.ticker, 'COMI');
    expect(saved.quantity, 120, reason: 'not the 680 the risk rule allows');
  });
}
