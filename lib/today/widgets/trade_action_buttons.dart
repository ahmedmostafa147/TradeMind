import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../settings/settings_providers.dart';
import '../../trades/timeline_entry.dart';
import '../../trades/trade.dart';
import '../../trades/trade_form_screen.dart';
import '../../trades/trade_status.dart';
import '../../trades/trades_providers.dart';

class EditTradeButton extends StatelessWidget {
  final Trade trade;

  const EditTradeButton({super.key, required this.trade});

  @override
  Widget build(BuildContext context) => OutlinedButton(
        onPressed: () => Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => TradeFormScreen(existing: trade),
          ),
        ),
        child: const Text('تعديل'),
      );
}

class AddNoteButton extends ConsumerWidget {
  final Trade trade;
  final bool asLesson;

  const AddNoteButton({
    super.key,
    required this.trade,
    this.asLesson = false,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) => FilledButton.tonal(
        onPressed: () => _addNote(context, ref, trade, asLesson: asLesson),
        child: Text(asLesson ? 'أضف الدرس' : 'ملاحظة'),
      );
}

class CloseTradeButton extends ConsumerWidget {
  final Trade trade;

  const CloseTradeButton({super.key, required this.trade});

  @override
  Widget build(BuildContext context, WidgetRef ref) => FilledButton(
        onPressed: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('أدخل سعر وتاريخ الخروج عشان تقفل الصفقة'),
            ),
          );
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => TradeFormScreen(existing: trade),
            ),
          );
        },
        child: const Text('إقفال'),
      );
}

class MarkOpenButton extends ConsumerWidget {
  final Trade trade;

  const MarkOpenButton({super.key, required this.trade});

  @override
  Widget build(BuildContext context, WidgetRef ref) => FilledButton(
        onPressed: () async {
          if (trade.quantity <= 0) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('حدد عدد الأسهم عشان تفتح الصفقة'),
              ),
            );
            await Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => TradeFormScreen(existing: trade),
              ),
            );
            return;
          }
          await ref
              .read(tradesProvider.notifier)
              .update(trade.copyWith(status: TradeStatus.open));
        },
        child: const Text('افتحها'),
      );
}

class CancelTradeButton extends ConsumerWidget {
  final Trade trade;

  const CancelTradeButton({super.key, required this.trade});

  @override
  Widget build(BuildContext context, WidgetRef ref) => OutlinedButton(
        onPressed: () async {
          final settings = ref.read(settingsProvider);
          if (settings.enableConfirmations) {
            final confirmed = await showDialog<bool>(
              context: context,
              builder: (context) => AlertDialog(
                title: const Text('إلغاء الفكرة'),
                content: Text('متأكد إنك عايز تلغي فكرة ${trade.ticker}؟'),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(false),
                    child: const Text('رجوع'),
                  ),
                  FilledButton(
                    onPressed: () => Navigator.of(context).pop(true),
                    child: const Text('إلغاء الفكرة'),
                  ),
                ],
              ),
            );
            if (confirmed != true) return;
          }
          await ref
              .read(tradesProvider.notifier)
              .update(trade.copyWith(status: TradeStatus.cancelled));
        },
        child: const Text('إلغاء'),
      );
}

Future<void> _addNote(
  BuildContext context,
  WidgetRef ref,
  Trade trade, {
  bool asLesson = false,
}) async {
  final controller = TextEditingController();
  final text = await showDialog<String>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(asLesson ? 'الدرس المستفاد' : 'إضافة ملاحظة'),
      content: TextField(
        controller: controller,
        autofocus: true,
        maxLines: 3,
        decoration: InputDecoration(
          hintText: asLesson
              ? 'إيه اللي اتعلمته من الصفقة دي؟'
              : 'مثال: حركت الاستوب لسعر الدخول',
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('إلغاء'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(controller.text.trim()),
          child: const Text('حفظ'),
        ),
      ],
    ),
  );
  controller.dispose();

  if (text == null || text.isEmpty) return;

  final now = DateTime.now();
  final entry = TimelineEntry(
    date: DateTime(now.year, now.month, now.day),
    text: text,
  );
  final existingNotes = (trade.notes ?? '').trim();

  await ref.read(tradesProvider.notifier).update(
        trade.copyWith(
          timeline: [...trade.timeline, entry],
          notes: asLesson && existingNotes.isEmpty ? text : trade.notes,
        ),
      );
}
