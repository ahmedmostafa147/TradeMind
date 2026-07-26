import 'package:flutter/material.dart';

import '../../core/calc/daily_decisions.dart';
import '../../core/formatters.dart';
import '../../core/theme.dart';

class SummaryCard extends StatelessWidget {
  final DailyDecisions decisions;
  final int watchlistCount;

  const SummaryCard({
    super.key,
    required this.decisions,
    required this.watchlistCount,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.resultColors;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: theme.cardTheme.color,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: theme.colorScheme.outlineVariant),
        boxShadow: [
          BoxShadow(
            color: AppColors.cardShadow,
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: theme.colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  Icons.auto_graph_rounded,
                  size: 18,
                  color: theme.colorScheme.primary,
                ),
              ),
              const SizedBox(width: 10),
              Text(
                'ملخص النهاردة',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 12,
            runSpacing: 10,
            children: [
              _StatTile(label: 'مفتوحة', value: decisions.openCount),
              _StatTile(
                label: 'تجاوزت الحد',
                value: decisions.overRiskCount,
                color: decisions.overRiskCount > 0 ? colors.loss : null,
              ),
              _StatTile(label: 'مخططة', value: decisions.plannedCount),
              _StatTile(
                label: 'أُقفلت الأسبوع ده',
                value: decisions.closedThisWeekCount,
                color: colors.win,
              ),
              if (watchlistCount > 0)
                _StatTile(label: 'متابعة', value: watchlistCount),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  final String label;
  final int value;
  final Color? color;

  const _StatTile({required this.label, required this.value, this.color});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accent = color;
    final activeColor = accent ?? theme.colorScheme.onSurface;
    final tile = accent == null
        ? theme.colorScheme.surfaceContainerHighest
        : context.resultColors.surfaceFor(accent);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: tile,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          NumericText(
            quantity(value),
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w800,
              color: activeColor,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
