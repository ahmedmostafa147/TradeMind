import 'package:flutter/material.dart';

import '../formatters.dart';
import '../theme.dart';

/// The core discipline signal. Deliberately loud — a filled red banner rather
/// than a subtle hint — because the whole point of the app is that an oversized
/// position is impossible to miss.
class RiskWarning extends StatelessWidget {
  const RiskWarning({super.key});

  @override
  Widget build(BuildContext context) {
    final colors = context.resultColors;
    final loss = colors.loss;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: colors.lossSurface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: loss),
      ),
      child: Row(
        children: [
          Icon(Icons.warning_amber_rounded, color: loss, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'تحذير: المخاطرة أعلى من الحد المسموح',
              style: TextStyle(color: loss, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }
}

/// A label/value row used across the calculator and the form's live preview.
class ReadoutRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;
  final bool emphasise;

  const ReadoutRow({
    super.key,
    required this.label,
    required this.value,
    this.valueColor,
    this.emphasise = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isUnset = value == kEmptyValue || value.trim() == '—';
    final effectiveColor = isUnset ? theme.colorScheme.outline : valueColor;

    final valueStyle = emphasise
        ? theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
            color: effectiveColor,
          )
        : theme.textTheme.bodyLarge?.copyWith(color: effectiveColor);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Flexible(child: Text(label, style: theme.textTheme.bodyMedium)),
          const SizedBox(width: 12),
          NumericText(value, style: valueStyle),
        ],
      ),
    );
  }
}
