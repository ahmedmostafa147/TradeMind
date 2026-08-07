import 'package:egx_trade_journal/dashboard/widgets/goal_planner_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// The savings planner card in «الهدف», the app's half of the landing page
/// calculator.
///
/// What is pinned here is the honesty of the framing, not the arithmetic —
/// goal_plan_test.dart owns the numbers. The rate must never appear pre-filled
/// by us, and the journal's own rate must be an offer rather than a default.
void main() {
  Future<void> pumpCard(
    WidgetTester tester, {
    double capital = 17000,
    double? suggested,
  }) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Directionality(
          textDirection: TextDirection.rtl,
          child: Scaffold(
            body: SingleChildScrollView(
              child: GoalPlannerCard(
                capital: capital,
                suggestedAnnualReturn: suggested,
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  Finder fieldWithLabel(String label) =>
      find.ancestor(of: find.text(label), matching: find.byType(TextField));

  testWidgets('the return rate starts empty, never at a house number', (
    tester,
  ) async {
    // A pre-filled 20% is a forward-looking return figure asserted by us, which
    // is the claim the disclaimer and RELEASE.md keep the product clear of.
    await pumpCard(tester);

    final field = tester.widget<TextField>(
      fieldWithLabel('العائد السنوي اللي بتفترضه'),
    );
    expect(field.controller?.text, isEmpty);
    expect(find.text('رقم بتفترضه انت — مش توقّع مننا.'), findsOneWidget);
  });

  testWidgets('with no rate the result is exactly what was paid in', (
    tester,
  ) async {
    await pumpCard(tester, capital: 0);

    await tester.enterText(fieldWithLabel('المبلغ اللي عايز توصله'), '240000');
    await tester.enterText(fieldWithLabel('المدة'), '10');
    await tester.pumpAndSettle();

    // 240,000 over 120 months with no return is 2,000 a month, and no growth.
    expect(find.text('2,000.00 ج.م'), findsWidgets);
    expect(
      find.textContaining('من غير عائد، اللي بتوصله هو بالظبط اللي دفعته'),
      findsOneWidget,
    );
  });

  testWidgets('capital pre-fills the starting amount', (tester) async {
    await pumpCard(tester, capital: 17000);

    final field = tester.widget<TextField>(
      fieldWithLabel('معاك كام دلوقتي (اختياري)'),
    );
    expect(field.controller?.text, '17000');
  });

  testWidgets('a preset sets the amount and the horizon but NOT the rate', (
    tester,
  ) async {
    await pumpCard(tester);

    await tester.tap(find.widgetWithText(ChoiceChip, 'شراء سيارة'));
    await tester.pumpAndSettle();

    expect(
      tester
          .widget<TextField>(fieldWithLabel('المبلغ اللي عايز توصله'))
          .controller
          ?.text,
      '1200000',
    );
    expect(
      tester.widget<TextField>(fieldWithLabel('المدة')).controller?.text,
      '5',
    );
    // Picking «شراء سيارة» must not quietly assert what the EGX pays.
    expect(
      tester
          .widget<TextField>(fieldWithLabel('العائد السنوي اللي بتفترضه'))
          .controller
          ?.text,
      isEmpty,
    );
  });

  testWidgets('the journal rate is offered, not applied', (tester) async {
    await pumpCard(tester, suggested: 24.0);

    final rateField = fieldWithLabel('العائد السنوي اللي بتفترضه');
    expect(
      tester.widget<TextField>(rateField).controller?.text,
      isEmpty,
      reason: 'a measurement silently used as a forecast is the whole trap',
    );

    await tester.tap(find.widgetWithText(ActionChip, 'من دفترك: 24.0%'));
    await tester.pumpAndSettle();

    expect(tester.widget<TextField>(rateField).controller?.text, '24.0');
  });

  testWidgets('switching direction swaps the question, not the card', (
    tester,
  ) async {
    await pumpCard(tester);
    expect(find.text('المبلغ المطلوب كل شهر'), findsOneWidget);

    await tester.tap(find.widgetWithText(ChoiceChip, 'هحطّ شهريًا'));
    await tester.pumpAndSettle();

    expect(find.text('اللي هتوصله بعد المدة'), findsOneWidget);
    expect(find.text('هتحطّ كام كل شهر'), findsOneWidget);
  });

  testWidgets('a starting amount that already gets there asks for nothing', (
    tester,
  ) async {
    await pumpCard(tester, capital: 0);

    await tester.enterText(fieldWithLabel('المبلغ اللي عايز توصله'), '100000');
    await tester.enterText(fieldWithLabel('المدة'), '10');
    await tester.enterText(fieldWithLabel('العائد السنوي اللي بتفترضه'), '20');
    await tester.enterText(
      fieldWithLabel('معاك كام دلوقتي (اختياري)'),
      '200000',
    );
    await tester.pumpAndSettle();

    // Printing a bare «0.00 ج.م» under «المبلغ المطلوب كل شهر» reads as a
    // broken calculator, so the caption changes instead.
    expect(find.text('اللي معاك دلوقتي بيوصلك لوحده'), findsOneWidget);
    expect(find.text('من غير ما تحطّ ولا جنيه زيادة'), findsOneWidget);
  });

  testWidgets('it renders on a narrow phone without overflowing', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await pumpCard(tester, suggested: 18.5);

    expect(tester.takeException(), isNull);
  });
}
