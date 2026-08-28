import 'package:egx_trade_journal/core/widgets/risk_warning.dart';
import 'package:egx_trade_journal/trades/widgets/quick_add_trade_sheet.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/app_harness.dart';

/// Covers the quick-add sheet's sizing inputs and its layout under a keyboard.
///
/// Two regressions live here. The sheet laid its content out in a bare Column,
/// so the inline ticker suggestions pushed it past the space left above the
/// keyboard and it overflowed rather than scrolled. And it had no quantity
/// input at all, so every position was sized as though the entire account
/// backed it, with a readout that showed the settings-wide loss budget under
/// the label "المخاطرة" — the same figure for every trade, regardless of size.
void main() {
  late AppHarness app;

  setUp(() async {
    app = await AppHarness.create();
  });

  tearDown(() => app.dispose());

  /// Pumps the sheet alone at [size], so the keyboard-constrained height that
  /// produced the overflow can be reproduced deliberately.
  Future<void> pumpSheet(WidgetTester tester, {Size? size}) async {
    if (size != null) {
      tester.view.physicalSize = size;
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
    }

    // Mirrors showModalBottomSheet(isScrollControlled: true), which hands the
    // sheet the whole height and lets it size itself. The harness keeps the
    // quote badge offline, so no test spins on a price that never arrives.
    await app.pump(
      tester,
      const Scaffold(
        body: SingleChildScrollView(child: QuickAddTradeSheet()),
      ),
    );
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

  /// «هدخل بفلوس قد ايه» — the field the sheet was missing.
  ///
  /// Without it the suggestion came from the risk rule alone, which sizes as
  /// though the whole account were behind every trade: someone here to commit
  /// 2,000 EGP was told to buy 680 shares of a 10.00 stock, and had to divide
  /// it out by hand before typing a quantity.
  group('the position budget', () {
    Finder budgetField() => find.byKey(const ValueKey('quick-budget-field'));

    Future<void> priced(WidgetTester tester) async {
      await pumpSheet(tester);
      await tester.enterText(find.byType(TextFormField).first, 'COMI');
      await tester.enterText(fieldWithLabel('سعر الدخول'), '10');
      await tester.enterText(fieldWithLabel('وقف الخسارة'), '9.50');
      await tester.pumpAndSettle();
    }

    testWidgets('a budget caps the suggestion below the risk rule', (
      tester,
    ) async {
      await priced(tester);
      expect(find.text('المقترح: 680'), findsOneWidget, reason: 'risk only');

      await tester.enterText(budgetField(), '2000');
      await tester.pumpAndSettle();

      // 2,000 / 10.00 = 200 whole shares, well under the 680 the 340 loss
      // budget would allow.
      expect(find.text('المقترح: 200'), findsOneWidget);
      expect(
        find.text('الكمية اتحددت بالمبلغ ده، مش بحد المخاطرة'),
        findsOneWidget,
        reason: 'the sheet says which of the two constraints bound it',
      );
    });

    testWidgets('a budget never loosens the risk limit', (tester) async {
      await priced(tester);

      await tester.enterText(budgetField(), '999999');
      await tester.pumpAndSettle();

      expect(find.text('المقترح: 680'), findsOneWidget);
      expect(
        find.text('سيبه فاضي عشان يستخدم حد المخاطرة بس'),
        findsOneWidget,
      );
    });

    testWidgets('a typed quantity still wins over the budget', (tester) async {
      await priced(tester);

      await tester.enterText(budgetField(), '2000');
      await tester.enterText(fieldWithLabel('عدد الأسهم'), '150');
      await tester.pumpAndSettle();

      expect(find.text('1,500.00 ج.م'), findsOneWidget, reason: 'position');
    });

    testWidgets('the saved trade carries the budget-sized quantity', (
      tester,
    ) async {
      await priced(tester);
      await tester.enterText(budgetField(), '2000');
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(FilledButton, 'حفظ الصفقة السريعة'));
      await tester.pumpAndSettle();

      expect((await app.storedTrades()).single.quantity, 200);
    });
  });

  testWidgets('the saved trade carries the typed quantity', (tester) async {
    await pumpSheet(tester);

    await tester.enterText(find.byType(TextFormField).first, 'COMI');
    await tester.enterText(fieldWithLabel('سعر الدخول'), '10');
    await tester.enterText(fieldWithLabel('وقف الخسارة'), '9.50');
    await tester.enterText(fieldWithLabel('عدد الأسهم'), '120');
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(FilledButton, 'حفظ الصفقة السريعة'));
    await tester.pumpAndSettle();

    final stored = await app.storedTrades();
    expect(stored, hasLength(1));
    final saved = stored.first;
    expect(saved.ticker, 'COMI');
    expect(saved.quantity, 120, reason: 'not the 680 the risk rule allows');
  });
}
