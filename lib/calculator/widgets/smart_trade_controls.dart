import 'package:flutter/material.dart';

/// Header text for smart trade builder.
///
/// `StopPriceField` used to live here too. It is gone: the stop and the target
/// are the same question in two directions, so both are rendered by
/// [LevelField], which owns the price box, its validation message and the
/// derived counterpart underneath it.
class SmartTradeHeader extends StatelessWidget {
  const SmartTradeHeader({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'منشئ الصفقة الذكي',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          // Word-for-word the line in site/components/calculator-widget.tsx.
          // It used to end «التطبيق يحسب الباقي», which the site cannot repeat:
          // «التطبيق» names the Android app specifically (CLAUDE.md §3), and
          // the same calculator renders on the landing page and the dashboard.
          'اكتب سعر الدخول، وحدّد الهدف والاستوب بنسبة أو بسعر — '
          'والباقي بيتحسب لوحده.',
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}
