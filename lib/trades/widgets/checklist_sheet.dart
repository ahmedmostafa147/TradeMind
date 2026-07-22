import 'package:flutter/material.dart';

import '../../core/formatters.dart';
import '../checklist.dart';

/// Pre-save discipline prompt.
///
/// Deliberately does NOT block saving on an incomplete checklist — the journal
/// records what actually happened, including undisciplined trades, and an app
/// that refuses to record them would just teach the user to lie to it. It makes
/// the gap visible instead, and the risk score prices it in.
class ChecklistSheet extends StatefulWidget {
  final List<String> initial;

  const ChecklistSheet({super.key, required this.initial});

  /// Returns the chosen item ids, or null if the user backed out.
  static Future<List<String>?> show(
    BuildContext context,
    List<String> initial,
  ) => showModalBottomSheet<List<String>>(
    context: context,
    isScrollControlled: true,
    builder: (_) => ChecklistSheet(initial: initial),
  );

  @override
  State<ChecklistSheet> createState() => _ChecklistSheetState();
}

class _ChecklistSheetState extends State<ChecklistSheet> {
  late final Set<String> _checked = {...widget.initial};

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final completion = checklistCompletion(_checked.toList());

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('قبل ما تحفظ', style: theme.textTheme.titleLarge),
                NumericText(
                  percent(completion),
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: theme.colorScheme.primary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'مش شرط تكمّلها كلها — بس اللي هتسيبه فاضي هيقلّل تقييم الانضباط.',
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(height: 12),
            for (final item in ChecklistItem.values)
              CheckboxListTile(
                value: _checked.contains(item.id),
                onChanged: (checked) => setState(() {
                  if (checked ?? false) {
                    _checked.add(item.id);
                  } else {
                    _checked.remove(item.id);
                  }
                }),
                title: Text(item.label),
                contentPadding: EdgeInsets.zero,
                controlAffinity: ListTileControlAffinity.leading,
                dense: true,
              ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('رجوع'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton(
                    onPressed: () =>
                        Navigator.of(context).pop(_checked.toList()),
                    child: const Text('تمام، احفظ'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
