import 'dart:io';

import 'package:egx_trade_journal/core/hive_keys.dart';
import 'package:egx_trade_journal/settings/settings_providers.dart';
import 'package:egx_trade_journal/today/widgets/trade_action_buttons.dart';
import 'package:egx_trade_journal/trades/timeline_entry_adapter.dart';
import 'package:egx_trade_journal/trades/trade.dart';
import 'package:egx_trade_journal/trades/trade_adapter.dart';
import 'package:egx_trade_journal/trades/trade_status.dart';
import 'package:egx_trade_journal/trades/trades_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_ce/hive.dart';

/// «ملاحظة» and «أضف الدرس» both crashed the app the moment the dialog closed:
///
///   'package:flutter/src/widgets/framework.dart': Failed assertion:
///   '_dependents.isEmpty': is not true
///
/// The controller was created beside `showDialog` and disposed on the line
/// after the await — but that future completes when the route is POPPED, before
/// the dismiss animation runs, so the TextField was still mounted when its
/// controller went away underneath it. The throw landed inside the field's own
/// teardown, which left it registered as a dependent of the inherited widgets
/// above it, and the framework asserted when those deactivated.
///
/// Both buttons are covered because both hit that same line — it was reported
/// on حفظ and on إلغاء alike.
void main() {
  late Directory tempDir;
  late Box settingsBox;
  late Box<Trade> tradesBox;

  final today = DateTime(2026, 6, 1);

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('egx_note_dialog');
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

  final trade = Trade(
    id: 'trade-1',
    entryDate: today.subtract(const Duration(days: 3)),
    ticker: 'COMI',
    reason: 'اختراق مقاومة',
    entryPrice: 10.00,
    stopPrice: 9.50,
    quantity: 100,
    exitPrice: 11.20,
    exitDate: today,
    status: TradeStatus.closed,
  );

  /// The button on its own, so the assertion has nowhere to hide behind a
  /// screen that might not have laid it out.
  Future<void> pumpButton(WidgetTester tester, {bool asLesson = false}) async {
    await tester.runAsync(() => tradesBox.put(trade.id, trade));

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          settingsBoxProvider.overrideWithValue(settingsBox),
          tradesBoxProvider.overrideWithValue(tradesBox),
        ],
        child: MaterialApp(
          home: Directionality(
            textDirection: TextDirection.rtl,
            child: Scaffold(
              body: Center(
                child: AddNoteButton(trade: trade, asLesson: asLesson),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  /// EVERY TAP HERE GOES THROUGH runAsync, INCLUDING THE ONE THAT ONLY OPENS
  /// THE DIALOG.
  ///
  /// `_addNote` awaits `showDialog` and then awaits a Hive write. An await
  /// resumes in the zone it was registered in, so opening the dialog from the
  /// fake-async zone leaves that write suspended forever — the record still
  /// lands on disk, but the function never returns and `Hive.close()` in
  /// tearDown blocks on it.
  ///
  /// Fixed pumps rather than pumpAndSettle throughout: the dialog autofocuses
  /// its field, and a focused caret blinks forever, so "settled" never arrives.
  Future<void> openDialog(WidgetTester tester, String label) =>
      tester.runAsync(() async {
        await tester.tap(find.text(label));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 400));
      });

  Future<void> tapDialogButton(WidgetTester tester, Finder button) =>
      tester.runAsync(() async {
        await tester.tap(button);
        await tester.pump();
        await Future<void>.delayed(const Duration(milliseconds: 300));
        await tester.pump(const Duration(milliseconds: 400));
      });

  /// The confirmation snackbar holds a four-second timer that outlives the
  /// test. Cancelling it keeps teardown from waiting on it.
  Future<void> dismissSnackBars(WidgetTester tester) async {
    ScaffoldMessenger.of(
      tester.element(find.byType(Scaffold)),
    ).clearSnackBars();
    await tester.pump();
  }

  testWidgets('حفظ records the note and closes without crashing', (
    tester,
  ) async {
    await pumpButton(tester);
    await openDialog(tester, 'ملاحظة');
    expect(find.text('إضافة ملاحظة'), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'حركت الاستوب لسعر الدخول');
    await tapDialogButton(tester, find.widgetWithText(FilledButton, 'حفظ'));

    expect(tester.takeException(), isNull);
    expect(find.text('إضافة ملاحظة'), findsNothing, reason: 'dialog closed');

    final saved = tradesBox.get('trade-1')!;
    expect(saved.timeline, hasLength(1));
    expect(saved.timeline.single.text, 'حركت الاستوب لسعر الدخول');
    // A plain note lands in the timeline only — `notes` is the lesson field.
    expect(saved.notes, isNull);

    await dismissSnackBars(tester);
  });

  testWidgets('إلغاء closes without crashing and writes nothing', (
    tester,
  ) async {
    await pumpButton(tester);
    await openDialog(tester, 'ملاحظة');

    await tester.enterText(find.byType(TextField), 'كلام هيتلغي');
    await tapDialogButton(tester, find.widgetWithText(TextButton, 'إلغاء'));

    expect(tester.takeException(), isNull);
    expect(find.text('إضافة ملاحظة'), findsNothing);
    expect(tradesBox.get('trade-1')!.timeline, isEmpty);
  });

  testWidgets('the first lesson fills the notes field too', (tester) async {
    await pumpButton(tester, asLesson: true);
    await openDialog(tester, 'أضف الدرس');
    expect(find.text('الدرس المستفاد'), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'استعجلت الخروج');
    await tapDialogButton(tester, find.widgetWithText(FilledButton, 'حفظ'));

    expect(tester.takeException(), isNull);
    final saved = tradesBox.get('trade-1')!;
    expect(saved.notes, 'استعجلت الخروج');
    expect(saved.timeline, hasLength(1));

    await dismissSnackBars(tester);
  });

  testWidgets('an empty note is not written at all', (tester) async {
    await pumpButton(tester);
    await openDialog(tester, 'ملاحظة');

    await tapDialogButton(tester, find.widgetWithText(FilledButton, 'حفظ'));

    expect(tester.takeException(), isNull);
    expect(tradesBox.get('trade-1')!.timeline, isEmpty);
  });
}
