import 'package:flutter/material.dart';

import '../../core/formatters.dart';
import '../../core/theme.dart';

class ActionSection extends StatelessWidget {
  final String title;
  final int count;
  final IconData icon;
  final Color? accent;
  final List<Widget> children;

  const ActionSection({
    super.key,
    required this.title,
    required this.count,
    required this.icon,
    required this.children,
    this.accent,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accentColor = accent;
    final color = accentColor ?? theme.colorScheme.primary;
    final tint = accentColor == null
        ? theme.colorScheme.primaryContainer
        : context.resultColors.surfaceFor(accentColor);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 12, top: 8),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: tint,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 18, color: color),
              ),
              const SizedBox(width: 10),
              Text(
                title,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 3,
                ),
                decoration: BoxDecoration(
                  color: tint,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: NumericText(
                  quantity(count),
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: color,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        ),
        ...children,
        const SizedBox(height: 16),
      ],
    );
  }
}
