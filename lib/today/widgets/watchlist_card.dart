import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/formatters.dart';
import '../../core/theme.dart';
import '../../watchlist/watchlist_form_screen.dart';
import '../../watchlist/watchlist_item.dart';
import '../../watchlist/watchlist_providers.dart';
import 'watchlist_actions.dart';

class WatchlistCard extends ConsumerWidget {
  final WatchlistItem item;

  const WatchlistCard({super.key, required this.item});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colors = context.resultColors;
    final priorityColor = switch (item.priority) {
      WatchPriority.high => colors.loss,
      WatchPriority.medium => colors.breakeven,
      WatchPriority.low => colors.open,
    };

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    item.ticker,
                    style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(width: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                    decoration: BoxDecoration(
                      color: colors.surfaceFor(priorityColor),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: colors.borderFor(priorityColor)),
                    ),
                    child: Text(
                      item.priority.label,
                      style: TextStyle(
                        color: priorityColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                item.reason,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 20,
                runSpacing: 8,
                children: [
                  _MiniFact(label: 'سعر الشراء', value: money(item.targetBuyPrice)),
                  _MiniFact(label: 'الاستوب', value: money(item.stopPrice)),
                  _MiniFact(label: 'تاريخ الإضافة', value: dateLabel(item.dateAdded)),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: FilledButton(
                      onPressed: () async {
                        await ref
                            .read(watchlistProvider.notifier)
                            .convertToPlannedTrade(item);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('تحوّلت ${item.ticker} لصفقة مخططة'),
                            ),
                          );
                        }
                      },
                      child: const Text('حوّلها لصفقة'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => WatchlistFormScreen(existing: item),
                        ),
                      ),
                      child: const Text('تعديل'),
                    ),
                  ),
                  const SizedBox(width: 4),
                  IconButton(
                    icon: const Icon(Icons.delete_outline, size: 20),
                    tooltip: 'حذف',
                    onPressed: () => deleteWatchlistItem(context, ref, item),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MiniFact extends StatelessWidget {
  final String label;
  final String value;

  const _MiniFact({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(label, style: theme.textTheme.bodySmall?.copyWith(fontSize: 11)),
        NumericText(
          value,
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }
}
