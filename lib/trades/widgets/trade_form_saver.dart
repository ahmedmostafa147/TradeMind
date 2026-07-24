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
    if (!(formKey.currentState?.validate() ?? false)) return;

    final settings = ref.read(settingsProvider);
    var updatedChecklist = List<String>.from(checklist);

    if (settings.enableChecklist && status != TradeStatus.cancelled) {
      final result = await ChecklistSheet.show(context, updatedChecklist);
      if (result == null) return;
      updatedChecklist = result;
    }

    final isExecuted = status.isExecuted;
    final exitPrice = isExecuted ? parseNumber(exitPriceText ?? '') : null;
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
      exitDate: exitPrice == null ? null : exitDate,
      notes: notes.isEmpty ? null : notes,
      status: status,
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
