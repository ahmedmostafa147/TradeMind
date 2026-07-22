import 'package:flutter/material.dart';

import '../../core/formatters.dart';
import '../timeline_entry.dart';

/// Dated events on a trade — "اشتريت النهاردة", "حركت الاستوب", "بعت نص الكمية".
class TimelineEditor extends StatefulWidget {
  final List<TimelineEntry> entries;
  final ValueChanged<List<TimelineEntry>> onChanged;

  const TimelineEditor({
    super.key,
    required this.entries,
    required this.onChanged,
  });

  @override
  State<TimelineEditor> createState() => _TimelineEditorState();
}

class _TimelineEditorState extends State<TimelineEditor> {
  final _controller = TextEditingController();
  DateTime _date = _today();

  static DateTime _today() {
    final now = DateTime.now();
    return DateTime(now.year, now.month, now.day);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _add() {
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    widget.onChanged([
      ...widget.entries,
      TimelineEntry(date: _date, text: text),
    ]);
    _controller.clear();
    setState(() => _date = _today());
  }

  void _removeAt(int index) {
    final next = [...widget.entries]..removeAt(index);
    widget.onChanged(next);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final sorted = [...widget.entries]
      ..sort((a, b) => a.date.compareTo(b.date));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final entry in sorted)
          Dismissible(
            key: ValueKey('${entry.date.millisecondsSinceEpoch}_${entry.text}'),
            direction: DismissDirection.endToStart,
            onDismissed: (_) => _removeAt(widget.entries.indexOf(entry)),
            background: Container(
              alignment: AlignmentDirectional.centerEnd,
              padding: const EdgeInsetsDirectional.only(end: 16),
              color: theme.colorScheme.errorContainer,
              child: Icon(
                Icons.delete_outline,
                color: theme.colorScheme.onErrorContainer,
              ),
            ),
            child: ListTile(
              contentPadding: EdgeInsets.zero,
              dense: true,
              leading: Icon(
                Icons.circle,
                size: 8,
                color: theme.colorScheme.primary,
              ),
              title: Text(entry.text),
              subtitle: NumericText(
                dateLabel(entry.date),
                style: theme.textTheme.bodySmall,
              ),
            ),
          ),
        const SizedBox(height: 8),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: TextField(
                controller: _controller,
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => _add(),
                decoration: const InputDecoration(
                  labelText: 'حدث جديد',
                  hintText: 'مثال: حركت الاستوب لسعر الدخول',
                ),
              ),
            ),
            const SizedBox(width: 8),
            IconButton.filledTonal(
              icon: const Icon(Icons.event),
              tooltip: 'تاريخ الحدث',
              onPressed: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: _date,
                  firstDate: DateTime(2000),
                  lastDate: DateTime(2100),
                );
                if (picked != null) {
                  setState(
                    () => _date = DateTime(
                      picked.year,
                      picked.month,
                      picked.day,
                    ),
                  );
                }
              },
            ),
            const SizedBox(width: 4),
            IconButton.filled(
              icon: const Icon(Icons.add),
              tooltip: 'إضافة',
              onPressed: _add,
            ),
          ],
        ),
        Padding(
          padding: const EdgeInsets.only(top: 4),
          child: NumericText(
            dateLabel(_date),
            style: theme.textTheme.bodySmall,
          ),
        ),
      ],
    );
  }
}
