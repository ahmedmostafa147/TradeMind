import 'package:flutter/material.dart';

import '../../core/theme.dart';

class NoTasksBanner extends StatelessWidget {
  const NoTasksBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.resultColors;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: colors.winSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colors.winBorder),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: colors.winBorder,
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.check_rounded, size: 18, color: colors.win),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'لا توجد مهام اليوم - كل الأمور تحت السيطرة.',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
                color: colors.win,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
