import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../core/formatters.dart';
import '../../settings/settings_providers.dart';
import '../screenshot_store.dart';
import '../timeline_entry.dart';
import '../trade.dart';
import '../trade_status.dart';
import '../trades_providers.dart';
import 'checklist_sheet.dart';

class TradeFormSaver {
  static Future<void> saveTrade({
    required BuildContext context,
    required WidgetRef ref,
    required Trade? existing,
    required GlobalKey<FormState> formKey,
    required DateTime entryDate,
    required String ticker,
    required String reason,
    required double entryPrice,
    required double stopPrice,
    required int quantity,
    required double? takeProfitPrice,
    required String? exitPriceText,
    required DateTime? exitDate,
    required String notesText,
    required TradeStatus status,
    required List<String> tags,
    required bool isFavorite,
    required List<String> screenshots,
    required List<String> checklist,
    required List<TimelineEntry> timeline,
    required List<String> unsavedScreenshots,
    required ScreenshotStore store,
  }) async {
    final isExecuted = status.isExecuted;
    final typedExitPrice = isExecuted ? parseNumber(exitPriceText ?? '') : null;

    // [Trade] asserts the pair is set together or not at all, so a half-filled
    // exit would throw rather than save. Form validation rejects that before
    // reaching here; this only guarantees no future call site can crash the
    // app, by dropping the lone half instead.
    final resolvedExitDate = typedExitPrice == null ? null : exitDate;
    final exitPrice = resolvedExitDate == null ? null : typedExitPrice;

    // «مغلقة» with no exit is a record that calls itself open the moment it is
    // read back — `Trade.isOpen` is `exitPrice == null`.
    //
    // Checked BEFORE `validate()`, not after. The exit field carries the same
    // rule, but it lives at the bottom of a scrolling form while «حفظ» is in
    // the app bar: the validator does reject the save, and then paints its
    // reason on a field the user cannot see, so the button reads as dead. A
    // snackbar says it where the tap happened.
    if (status == TradeStatus.closed && exitPrice == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('صفقة مغلقة لازم يكون ليها سعر وتاريخ خروج'),
        ),
      );
      // Still runs, so the field itself is marked too — the message and the
      // error the user finds on scrolling agree.
      formKey.currentState?.validate();
      return;
    }

    if (!(formKey.currentState?.validate() ?? false)) return;

    // The exit fields decide the status, not the picker above them.
    //
    // «إقفال» promises «أدخل سعر وتاريخ الخروج عشان تقفل الصفقة» and then sends
    // the user straight to this form. Saving the chip's value verbatim meant
    // filling in the exit did everything except close the trade: it stayed
    // «مفتوحة» on قرار اليوم, out of the win rate and off the equity curve,
    // with the exit price sitting in the same record contradicting it.
    //
    // The other direction is handled where it belongs, in the form: switching
    // the chip away from «مغلقة» empties the exit pair, so a reopened trade
    // does not get closed straight back on the next save.
    final resolvedStatus = status == TradeStatus.open && exitPrice != null
        ? TradeStatus.closed
        : status;

    final settings = ref.read(settingsProvider);
    var updatedChecklist = List<String>.from(checklist);

    if (settings.enableChecklist && status != TradeStatus.cancelled) {
      final result = await ChecklistSheet.show(context, updatedChecklist);
      if (result == null) return;
      updatedChecklist = result;
    }

    final notes = notesText.trim();

    final trade = Trade(
      id: existing?.id ?? const Uuid().v4(),
      entryDate: entryDate,
      ticker: ticker.trim().toUpperCase(),
      reason: reason.trim(),
      entryPrice: entryPrice,
      stopPrice: stopPrice,
      quantity: quantity,
      takeProfitPrice: takeProfitPrice,
      exitPrice: exitPrice,
      exitDate: resolvedExitDate,
      notes: notes.isEmpty ? null : notes,
      status: resolvedStatus,
      tags: tags,
      isFavorite: isFavorite,
      screenshotPaths: screenshots,
      completedChecklistItems: updatedChecklist,
      timeline: timeline,
    );

    final removed = (existing?.screenshotPaths ?? const <String>[])
        .where((path) => !screenshots.contains(path));
    for (final path in removed) {
      await store.delete(path);
    }
    for (final path in unsavedScreenshots) {
      if (!screenshots.contains(path)) await store.delete(path);
    }

    final notifier = ref.read(tradesProvider.notifier);
    if (existing != null) {
      await notifier.update(trade);
    } else {
      await notifier.add(trade);
    }

    if (context.mounted) Navigator.of(context).pop();
  }
}
