import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/calc/sizing_result.dart';
import '../../core/formatters.dart';
import '../../core/theme.dart';
import '../../core/widgets/risk_warning.dart';
import '../trade_status.dart';

class StatusSelector extends StatelessWidget {
  final TradeStatus value;
  final ValueChanged<TradeStatus> onChanged;

  const StatusSelector({
    super.key,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('حالة الصفقة', style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: [
            for (final status in TradeStatus.values)
              ChoiceChip(
                label: Text(
                  status.label,
                  style: TextStyle(
                    fontWeight:
                        status == value ? FontWeight.bold : FontWeight.w600,
                    color: status == value
                        ? Theme.of(context).colorScheme.onPrimary
                        : Theme.of(context).colorScheme.onSurface,
                  ),
                ),
                selected: status == value,
                onSelected: (_) => onChanged(status),
                selectedColor: Theme.of(context).colorScheme.primary,
                showCheckmark: true,
                checkmarkColor: Theme.of(context).colorScheme.onPrimary,
              ),
          ],
        ),
      ],
    );
  }
}

class FormSection extends StatelessWidget {
  final String title;
  final Widget child;

  const FormSection({super.key, required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }
}

class LivePreviewCard extends StatelessWidget {
  final SizingResult result;

  const LivePreviewCard({super.key, required this.result});

  @override
  Widget build(BuildContext context) {
    final colors = context.resultColors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (result.overRisk) ...[
          const RiskWarning(),
          const SizedBox(height: 12),
        ],
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                ReadoutRow(
                  label: 'قيمة المركز',
                  value: money(result.positionValue),
                ),
                ReadoutRow(
                  label: 'المخاطرة بالجنيه',
                  value: money(result.riskEgp),
                ),
                ReadoutRow(
                  label: 'نسبة المخاطرة',
                  value: percent(result.riskPct),
                  valueColor: result.overRisk ? colors.loss : null,
                  emphasise: true,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class FormNumberField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String? suffix;
  final String? helperText;
  final bool integerOnly;
  final VoidCallback onChanged;
  final FormFieldValidator<String>? validator;

  const FormNumberField({
    super.key,
    required this.controller,
    required this.label,
    required this.onChanged,
    this.suffix,
    this.helperText,
    this.integerOnly = false,
    this.validator,
  });

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      onChanged: (_) => onChanged(),
      validator: validator,
      keyboardType: TextInputType.numberWithOptions(decimal: !integerOnly),
      inputFormatters: [
        FilteringTextInputFormatter.allow(
          integerOnly ? RegExp(r'[0-9٠-٩]') : RegExp(r'[0-9.٠-٩]'),
        ),
      ],
      textDirection: TextDirection.ltr,
      textAlign: TextAlign.right,
      decoration: InputDecoration(
        labelText: label,
        suffixText: suffix,
        helperText: helperText,
      ),
    );
  }
}

