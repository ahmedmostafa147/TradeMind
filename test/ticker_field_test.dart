import 'package:egx_trade_journal/features/market/widgets/ticker_field.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// Guards the ticker input's notification contract.
///
/// The regression this covers: [TickerField] rebuilt itself on every keystroke
/// but only told its parent when a suggestion chip was tapped. Callers key
/// other widgets off the ticker text — the quick-add sheet shows a live quote
/// badge and enables its save button from it — so typing a code by hand, which
/// is the common case, updated none of them until some unrelated field was
/// touched.
void main() {
  Widget host(
    TextEditingController controller, {
    VoidCallback? onChanged,
  }) => MaterialApp(
    home: Scaffold(
      body: TickerField(controller: controller, onChanged: onChanged),
    ),
  );

  testWidgets('typing notifies the parent, not just the field itself', (
    tester,
  ) async {
    final controller = TextEditingController();
    addTearDown(controller.dispose);
    var notified = 0;

    await tester.pumpWidget(host(controller, onChanged: () => notified++));
    await tester.enterText(find.byType(TextFormField), 'COMI');
    await tester.pump();

    expect(notified, greaterThan(0), reason: 'the reported bug: silence');
    expect(controller.text, 'COMI');
  });

  testWidgets('tapping a suggestion notifies too, and only through one path', (
    tester,
  ) async {
    final controller = TextEditingController();
    addTearDown(controller.dispose);
    var notified = 0;

    await tester.pumpWidget(host(controller, onChanged: () => notified++));

    // A partial code offers matching EGX entries as chips. Targeted through
    // the chip, because the field's own hintText is the literal 'COMI' too.
    await tester.enterText(find.byType(TextFormField), 'COM');
    await tester.pumpAndSettle();
    final chip = find.widgetWithText(ActionChip, 'COMI');
    expect(chip, findsOneWidget, reason: 'suggestion offered');

    notified = 0;
    await tester.tap(chip);
    await tester.pumpAndSettle();

    expect(controller.text, 'COMI');
    // _select assigns the text, which fires the controller listener; notifying
    // again from _select as well would rebuild the parent twice per tap.
    expect(notified, 1, reason: 'exactly one notification per selection');
  });

  testWidgets('a resolved code shows its Arabic name and drops suggestions', (
    tester,
  ) async {
    final controller = TextEditingController();
    addTearDown(controller.dispose);

    await tester.pumpWidget(host(controller));
    await tester.enterText(find.byType(TextFormField), 'COMI');
    await tester.pumpAndSettle();

    expect(find.text('البنك التجاري الدولي (CIB)'), findsOneWidget);
    expect(
      find.byType(ActionChip),
      findsNothing,
      reason: 'an exact match has nothing left to suggest',
    );
  });

  testWidgets('an absent onChanged is not an error', (tester) async {
    final controller = TextEditingController();
    addTearDown(controller.dispose);

    await tester.pumpWidget(host(controller));
    await tester.enterText(find.byType(TextFormField), 'TMGH');
    await tester.pump();

    expect(tester.takeException(), isNull);
  });
}
