import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/formatters.dart';

/// Percentage preset picker and custom manual percentage input field.
class PercentPicker extends StatelessWidget {
  final String title;
  final bool showTitle;
  final List<double> presets;
  final double? selected;
  final TextEditingController controller;
  final ValueChanged<double> onSelected;
  final ValueChanged<double> onTyped;

  const PercentPicker({
    super.key,
    required this.title,
    required this.presets,
    required this.selected,
    required this.controller,
    required this.onSelected,
    required this.onTyped,
    this.showTitle = true,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (showTitle) ...[
          Text(
            title,
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
        ],
        Row(
          children: [
            Expanded(
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    for (final preset in presets) ...[
                      _PresetChip(
                        label: '${_label(preset)}%',
                        isSelected: selected != null &&
                            (selected! - preset).abs() < 1e-9,
                        onTap: () => onSelected(preset),
                      ),
                      const SizedBox(width: 8),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(width: 8),
            _CustomPercentInput(
              controller: controller,
              onTyped: onTyped,
            ),
          ],
        ),
      ],
    );
  }

  static String _label(double fraction) {
    final percent = fraction * 100;
    return percent == percent.roundToDouble()
        ? percent.round().toString()
        : percent.toStringAsFixed(1);
  }
}

class _PresetChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _PresetChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final bg = isSelected
        ? theme.colorScheme.primary
        : theme.colorScheme.surfaceContainerLow;
    final fg = isSelected
        ? theme.colorScheme.onPrimary
        : theme.colorScheme.onSurface;

    return Material(
      color: bg,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          height: 42,
          padding: const EdgeInsets.symmetric(horizontal: 14),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected
                  ? theme.colorScheme.primary
                  : theme.colorScheme.outlineVariant,
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Text(
            label,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: fg,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}

class _CustomPercentInput extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<double> onTyped;

  const _CustomPercentInput({
    required this.controller,
    required this.onTyped,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SizedBox(
      width: 90,
      height: 42,
      child: TextField(
        controller: controller,
        onChanged: (value) {
          final percent = parseNumber(value);
          if (percent != null && percent > 0) onTyped(percent / 100);
        },
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        inputFormatters: [
          FilteringTextInputFormatter.allow(RegExp(r'[0-9.٠-٩]')),
        ],
        textDirection: TextDirection.ltr,
        textAlign: TextAlign.center,
        style: theme.textTheme.bodyMedium?.copyWith(
          fontWeight: FontWeight.bold,
        ),
        decoration: InputDecoration(
          hintText: 'يدوي',
          suffixText: '%',
          isDense: true,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
          fillColor: theme.colorScheme.surfaceContainerLow,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: theme.colorScheme.outlineVariant),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: theme.colorScheme.outlineVariant),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(
              color: theme.colorScheme.primary,
              width: 1.5,
            ),
          ),
        ),
      ),
    );
  }
}
