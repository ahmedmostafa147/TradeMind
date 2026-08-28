import 'package:egx_trade_journal/calculator/calculator_screen.dart';
import 'package:egx_trade_journal/calculator/widgets/level_field.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/app_harness.dart';

/// Drives the spec's worked example through the real widget tree, so the
/// numbers are checked as the trader sees them — after formatting.
void main() {
  late AppHarness app;

  setUp(() async {
    app = await AppHarness.create();
  });

  tearDown(() => app.dispose());

  Future<void> pumpCalculator(WidgetTester tester) =>
      app.pump(tester, const CalculatorScreen());

  /// The smart builder's entry field is the first on the screen.
  /// BY KEY, NOT `find.byType(TextField).first`.
  ///
  /// It was the first TextField, and that stopped being «سعر الدخول» the moment
  /// «رأس المال» and «المبلغ اللي هدخل بيه» were added above it — so every test
  /// in this file was typing the entry price into the capital box. The form then
  /// had no entry price, so no level could resolve, and the four tests that
  /// assert on a counterpart chip failed looking for a chip that correctly was
  /// not there. A positional finder in a form that grows is a test that lies
  /// about what broke.
  Future<void> enterPrice(WidgetTester tester, String price) async {
    await tester.enterText(
      find.byKey(const ValueKey('entry-price-field')),
      price,
    );
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

  testWidgets('both levels carry the same نسبة/سعر toggle', (tester) async {
    await pumpCalculator(tester);

    expect(find.text('منشئ الصفقة الذكي'), findsOneWidget);
    // The separate manual calculator is gone; its capability lives in the
    // "سعر" mode instead.
    expect(find.text('الحاسبة اليدوية'), findsNothing);
    expect(find.text('جني الأرباح'), findsWidgets);
    expect(find.text('وقف الخسارة'), findsWidgets);
    // TWO, not one. The target was percent-only, so a trader reading a
    // resistance level off a chart had to divide it by their entry by hand.
    expect(find.byType(SegmentedButton<LevelInputMode>), findsNWidgets(2));
  });

  testWidgets('a target typed as a price drives the whole plan', (
    tester,
  ) async {
    await pumpCalculator(tester);
    await enterPrice(tester, '10.00');

    // The first toggle belongs to «جني الأرباح».
    await tester.tap(find.text('سعر').first);
    await tester.pumpAndSettle();

    await tester.enterText(
      find.byKey(const ValueKey('take-profit-price-field')),
      '12.00',
    );
    await tester.pumpAndSettle();

    // The percentage it implies is shown back, so the two modes agree.
    expect(find.text('= 20.0%'), findsOneWidget);

    // 2% default stop → 9.80, so 2.00 reward against 0.20 risk is 10R.
    await scrollTo(tester, find.text('ملخص الصفقة'));
    expect(find.text('10.00R'), findsOneWidget);
  });

  testWidgets('a target below the entry is refused, not silently used', (
    tester,
  ) async {
    await pumpCalculator(tester);
    await enterPrice(tester, '10.00');

    await tester.tap(find.text('سعر').first);
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const ValueKey('take-profit-price-field')),
      '9.00',
    );
    await tester.pumpAndSettle();

    expect(find.text('سعر الهدف لازم يكون أعلى من سعر الدخول'), findsOneWidget);
  });

  testWidgets('the stop-by-price mode sizes from an absolute stop', (
    tester,
  ) async {
    await pumpCalculator(tester);
    await enterPrice(tester, '10.00');

    // The second toggle belongs to «وقف الخسارة».
    await tester.tap(find.text('سعر').last);
    await tester.pumpAndSettle();

    await tester.enterText(
      find.byKey(const ValueKey('stop-price-field')),
      '9.50',
    );
    await tester.pumpAndSettle();
    await scrollTo(tester, find.text('الأسهم المقترحة'));

    // Default capital 17,000 at 2% → 340 max loss ÷ 0.50 risk/share = 680.
    expect(find.text('680'), findsOneWidget);
  });

  testWidgets("the spec's example renders 42.42 and 39.59", (tester) async {
    await pumpCalculator(tester);
    await enterPrice(tester, '40.40');

    // The derived levels sit under their own inputs now, not in the summary:
    // the summary carries only figures that are an ANSWER, and a price the
    // calculator worked out from a percentage the trader picked belongs beside
    // that percentage.
    expect(find.text('= 42.42 ج.م'), findsOneWidget, reason: 'سعر الهدف');
    expect(find.text('= 39.59 ج.م'), findsOneWidget, reason: 'وقف الخسارة');

    await scrollTo(tester, find.text('ملخص الصفقة'));
    // Defaults are 5% and 2%, so the plan is 2.02 against 0.81 per share.
    expect(find.text('419'), findsWidgets, reason: 'الأسهم المقترحة');
    expect(find.text('صفقة جيدة'), findsOneWidget);
  });

  testWidgets('the summary repeats nothing the trader typed', (tester) async {
    await pumpCalculator(tester);
    await enterPrice(tester, '40.40');
    await scrollTo(tester, find.text('ملخص الصفقة'));

    // The entry price is two fields above; reading it back pushed the four
    // figures that ARE an answer below the fold on a phone.
    expect(find.text('سعر الدخول'), findsOneWidget, reason: 'the input only');
    expect(find.text('40.40 ج.م'), findsNothing);
    expect(find.text('أقصى خسارة مسموحة'), findsNothing);

    // What is left is all output.
    expect(find.text('الأسهم المقترحة'), findsOneWidget);
    expect(find.text('قيمة المركز'), findsOneWidget);
    expect(find.text('لو وصل الهدف'), findsOneWidget);
    expect(find.text('لو ضرب الاستوب'), findsOneWidget);
  });

  testWidgets('choosing percentages recalculates instantly', (tester) async {
    await pumpCalculator(tester);
    await enterPrice(tester, '100.00');

    // 5% / 2% by default.
    expect(find.text('= 105.00 ج.م'), findsOneWidget);
    expect(find.text('= 98.00 ج.م'), findsOneWidget);

    // Switch the target to 3% — no button, no reload.
    await scrollTo(tester, find.text('3%').first);
    await tester.tap(find.text('3%').first);
    await tester.pumpAndSettle();

    expect(find.text('= 103.00 ج.م'), findsOneWidget);
    expect(find.text('= 98.00 ج.م'), findsOneWidget, reason: 'الوقف ما اتغيرش');
  });

  testWidgets('quality degrades when the reward stops justifying the risk', (
    tester,
  ) async {
    await pumpCalculator(tester);
    await enterPrice(tester, '100.00');

    // 3% target against a 3% stop is a 1.0 ratio — a warning, not a win.
    await scrollTo(tester, find.text('3%').first);
    await tester.tap(find.text('3%').first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('3%').last);
    await tester.pumpAndSettle();

    await scrollTo(tester, find.text('ملخص الصفقة'));
    expect(find.text('المخاطرة مرتفعة'), findsOneWidget);
    expect(find.text('صفقة جيدة'), findsNothing);
  });

  testWidgets('nothing is computed until a price is entered', (tester) async {
    await pumpCalculator(tester);
    await scrollTo(tester, find.text('ملخص الصفقة'));

    // No figures at all rather than a grid of «—»: an empty calculator has no
    // answer, and a column of dashes looks like one that failed.
    expect(
      find.text('اكتب سعر الدخول وحدّد الهدف والاستوب، والباقي هيتحسب هنا.'),
      findsOneWidget,
    );
    expect(find.text('صفقة جيدة'), findsNothing);
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
    await scrollTo(tester, find.text('الهدف (اختياري)'));
    expect(builtFieldValues(), contains('42.42'));
  });

  testWidgets('the whole calculator fits a 320px phone', (tester) async {
    tester.view.physicalSize = const Size(320, 1400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await pumpCalculator(tester);
    // A six-figure position value is the widest thing the summary ever holds.
    await enterPrice(tester, '999.99');
    await scrollTo(tester, find.text('ملخص الصفقة'));

    expect(tester.takeException(), isNull);
  });

  testWidgets('a typed percentage overrides the presets', (tester) async {
    await pumpCalculator(tester);
    await enterPrice(tester, '100.00');

    // Addressed by key: the builder gained a budget field above this one, and
    // a positional lookup silently pointed at the wrong input.
    await tester.enterText(
      find.byKey(const ValueKey('take-profit-percent-field')),
      '8',
    );
    await tester.pumpAndSettle();

    expect(find.text('= 108.00 ج.م'), findsOneWidget);
  });
}
