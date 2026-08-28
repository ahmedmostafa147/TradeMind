import 'package:egx_trade_journal/core/formatters.dart';
import 'package:egx_trade_journal/trades/trade.dart';
import 'package:egx_trade_journal/trades/trade_form_screen.dart';
import 'package:egx_trade_journal/trades/trade_status.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/app_harness.dart';

/// The exit fields and the status chip must agree after a save.
///
/// «إقفال» on the daily screen promises «أدخل سعر وتاريخ الخروج عشان تقفل
/// الصفقة» and then opens this form. The saver wrote the chip's value verbatim,
/// so filling the exit in did everything except close the trade: it stayed
/// «مفتوحة» on قرار اليوم, outside the win rate and off the equity curve, with
/// the exit price sitting in the record contradicting it.
void main() {
  late AppHarness app;

  final today = DateTime(2026, 6, 1);

  setUp(() async {
    // The checklist sheet sits between «حفظ» and the write. It is a separate
    // decision with its own tests; turning it off keeps these about the status.
    app = await AppHarness.create(
      preferences: const {'enableChecklist': false},
    );
  });

  tearDown(() => app.dispose());

  Future<Trade> stored() async =>
      (await app.storedTrades()).firstWhere((t) => t.id == 'trade-1');

  Trade seedTrade({
    required TradeStatus status,
    double? exit,
  }) => Trade(
    id: 'trade-1',
    entryDate: today.subtract(const Duration(days: 3)),
    ticker: 'COMI',
    reason: 'اختراق مقاومة',
    entryPrice: 10.00,
    stopPrice: 9.50,
    quantity: 100,
    exitPrice: exit,
    exitDate: exit == null ? null : today,
    status: status,
  );

  Future<void> pumpForm(WidgetTester tester, Trade existing) async {
    await app.seedTrades([existing]);
    // The harness keeps the quote badge offline; it is not what is under test.
    await app.pump(tester, TradeFormScreen(existing: existing));
  }

  Future<void> tapSave(WidgetTester tester) async {
    await tester.tap(find.widgetWithText(TextButton, 'حفظ'));
    await tester.pumpAndSettle();
  }

  testWidgets('an exit on an open trade closes it', (tester) async {
    // Exactly the record the bug produced: an exit price recorded against a
    // position the journal still calls open.
    await pumpForm(tester, seedTrade(status: TradeStatus.open, exit: 11.00));
    await tapSave(tester);

    final saved = await stored();
    expect(saved.status, TradeStatus.closed);
    expect(saved.exitPrice, 11.00);
  });

  testWidgets('picking «مفتوحة» on a closed trade drops the exit', (
    tester,
  ) async {
    // Without clearing the pair, reopening was impossible: the exit stayed in
    // the field, and the saver read it back as "closed" on the very next save.
    await pumpForm(tester, seedTrade(status: TradeStatus.closed, exit: 11.00));

    await tester.tap(find.widgetWithText(ChoiceChip, 'مفتوحة'));
    await tester.pumpAndSettle();
    await tapSave(tester);

    final saved = await stored();
    expect(saved.status, TradeStatus.open);
    expect(saved.exitPrice, isNull, reason: 'an open position has no exit');
    expect(saved.exitDate, isNull);
  });

  testWidgets('«مغلقة» with no exit is rejected, not silently reopened', (
    tester,
  ) async {
    // `Trade.isOpen` reads `exitPrice == null`, so a closed record with no exit
    // calls itself open the moment it is read back. Say so at the field rather
    // than flipping the chip back under the user.
    await pumpForm(tester, seedTrade(status: TradeStatus.open));

    await tester.tap(find.widgetWithText(ChoiceChip, 'مغلقة'));
    await tester.pumpAndSettle();
    await tapSave(tester);

    expect(
      find.text('صفقة مغلقة لازم يكون ليها سعر وتاريخ خروج'),
      findsOneWidget,
      reason: 'the refusal is a snackbar, not only a field error scrolled '
          'out of the tree',
    );
    expect(
      (await stored()).status,
      TradeStatus.open,
      reason: 'nothing was written',
    );
  });

  /// The form had no entry-date control at all: `DateTime.now()` was stamped on
  /// save and could not be changed, so a trade logged the morning after was
  /// permanently dated wrong — and «الأداء الشهري», the equity curve and
  /// «متوسط مدة الاحتفاظ» all read that field. The web form always had it.
  group('the entry date', () {
    testWidgets('is shown, and reads the stored value', (tester) async {
      await pumpForm(tester, seedTrade(status: TradeStatus.open, exit: 11.00));

      expect(find.text('تاريخ الدخول'), findsOneWidget);
      expect(find.text(dateLabel(today.subtract(const Duration(days: 3)))),
          findsOneWidget);
    });

    testWidgets('is called «المتوقّع» while the trade is only a plan', (
      tester,
    ) async {
      await pumpForm(tester, seedTrade(status: TradeStatus.planned));

      expect(find.text('تاريخ الدخول المتوقّع'), findsOneWidget);
      expect(find.text('تاريخ الدخول'), findsNothing);
    });

    testWidgets('a picked date survives the save', (tester) async {
      await pumpForm(tester, seedTrade(status: TradeStatus.open));

      // The InkWell, not the floating label inside it: the label is painted
      // half outside the field's own box, so a tap aimed at its centre lands on
      // the decoration and opens nothing.
      await tester.tap(
        find
            .ancestor(
              of: find.text('تاريخ الدخول'),
              matching: find.byType(InkWell),
            )
            .first,
      );
      await tester.pumpAndSettle();

      // The picker opens on the trade's own date; step back one day and accept.
      //
      // «حسنًا», not 'OK': this now pumps the app's real locale. The old harness
      // wrapped the form in a bare Directionality with no localisation
      // delegates, so Material fell back to English and the test confirmed with
      // a button no user of this app has ever been shown. (The day numbers stay
      // Western — Flutter's Arabic date formats use them.)
      await tester.tap(find.text('27'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('حسنًا'));
      await tester.pumpAndSettle();

      await tapSave(tester);

      expect((await stored()).entryDate.day, 27);
    });
  });

  testWidgets('a plan is left alone — it has no exit to read', (tester) async {
    await pumpForm(tester, seedTrade(status: TradeStatus.planned));
    await tapSave(tester);

    expect((await stored()).status, TradeStatus.planned);
  });
}
