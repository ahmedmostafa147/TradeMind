import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../settings/cubit/settings_cubit.dart';
import '../../trades/cubit/trades_cubit.dart';

import '../../trades/timeline_entry.dart';
import '../../trades/trade.dart';
import '../../trades/trade_detail_screen.dart';
import '../../trades/trade_form_screen.dart';
import '../../trades/trade_status.dart';

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

class AddNoteButton extends StatelessWidget {
  final Trade trade;
  final bool asLesson;

  const AddNoteButton({
    super.key,
    required this.trade,
    this.asLesson = false,
  });

  @override
  Widget build(BuildContext context) => FilledButton.tonal(
        onPressed: () => _addNote(context, trade, asLesson: asLesson),
        child: Text(asLesson ? 'أضف الدرس' : 'ملاحظة'),
      );
}

class CloseTradeButton extends StatelessWidget {
  final Trade trade;

  const CloseTradeButton({super.key, required this.trade});

  @override
  Widget build(BuildContext context) => FilledButton(
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

class MarkOpenButton extends StatelessWidget {
  final Trade trade;

  const MarkOpenButton({super.key, required this.trade});

  @override
  Widget build(BuildContext context) => FilledButton(
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
          await context.read<TradesCubit>().save(
            trade.copyWith(status: TradeStatus.open),
          );
        },
        child: const Text('افتحها'),
      );
}

class CancelTradeButton extends StatelessWidget {
  final Trade trade;

  const CancelTradeButton({super.key, required this.trade});

  @override
  Widget build(BuildContext context) => OutlinedButton(
        onPressed: () async {
          final settings = context.read<SettingsCubit>().requireSettings;
          // Read before the dialog: `context` is not safe to use once an await
          // has passed, and this widget can be gone by the time it returns.
          final trades = context.read<TradesCubit>();
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
          await trades.save(trade.copyWith(status: TradeStatus.cancelled));
        },
        child: const Text('إلغاء'),
      );
}

/// The note box, as a widget that owns its own controller.
///
/// It used to be an inline [AlertDialog] over a controller created in
/// [_addNote] and disposed on the line after `await showDialog`. That crashed
/// the app on both حفظ and إلغاء with
/// `'_dependents.isEmpty': is not true`:
///
/// `showDialog`'s future completes the moment the route is popped, BEFORE the
/// dismiss animation runs — so the [TextField] was still mounted when its
/// controller was disposed underneath it. The throw that followed landed
/// inside the field's own teardown, which left it registered as a dependent of
/// the inherited widgets above it, and the framework asserted when those
/// deactivated.
///
/// A [State] cannot get this wrong: `dispose` runs after the element is gone.
class _NoteDialog extends StatefulWidget {
  final bool asLesson;

  const _NoteDialog({required this.asLesson});

  @override
  State<_NoteDialog> createState() => _NoteDialogState();
}

class _NoteDialogState extends State<_NoteDialog> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
        title: Text(widget.asLesson ? 'الدرس المستفاد' : 'إضافة ملاحظة'),
        content: TextField(
          controller: _controller,
          autofocus: true,
          maxLines: 3,
          decoration: InputDecoration(
            hintText: widget.asLesson
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
            onPressed: () => Navigator.of(context).pop(_controller.text.trim()),
            child: const Text('حفظ'),
          ),
        ],
      );
}

Future<void> _addNote(
  BuildContext context,
  Trade trade, {
  bool asLesson = false,
}) async {
  final trades = context.read<TradesCubit>();
  final text = await showDialog<String>(
    context: context,
    builder: (_) => _NoteDialog(asLesson: asLesson),
  );

  if (text == null || text.isEmpty) return;

  final now = DateTime.now();
  final entry = TimelineEntry(
    date: DateTime(now.year, now.month, now.day),
    text: text,
  );
  final existingNotes = (trade.notes ?? '').trim();

  await trades.save(
        trade.copyWith(
          timeline: [...trade.timeline, entry],
          notes: asLesson && existingNotes.isEmpty ? text : trade.notes,
        ),
      );

  // Say so. A plain note only ever lands in the timeline, which is visible on
  // the detail page and nowhere else — so saving one closed the dialog and
  // changed nothing the user could see, which is indistinguishable from a
  // button that does not work. It was reported as exactly that.
  if (!context.mounted) return;
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(
        asLesson
            ? 'اتسجّل الدرس على صفقة ${trade.ticker}'
            : 'اتسجّلت الملاحظة على صفقة ${trade.ticker}',
      ),
      action: SnackBarAction(
        label: 'اعرضها',
        onPressed: () => Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => TradeDetailScreen(tradeId: trade.id),
          ),
        ),
      ),
    ),
  );
}
