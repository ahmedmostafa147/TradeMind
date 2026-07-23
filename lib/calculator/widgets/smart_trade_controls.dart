import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/calc/smart_trade.dart';
import '../../core/formatters.dart';

/// Helper input field for entering a technical stop price level directly.
class StopPriceField extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final SmartTradePlan plan;

  const StopPriceField({
    super.key,
    required this.controller,
    required this.onChanged,
    required this.plan,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      key: const ValueKey('stop-price-field'),
      controller: controller,
      onChanged: onChanged,
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      inputFormatters: [
        FilteringTextInputFormatter.allow(RegExp(r'[0-9.٠-٩]')),
      ],
      textDirection: TextDirection.ltr,
      textAlign: TextAlign.right,
      decoration: InputDecoration(
        labelText: 'سعر وقف الخسارة',
        suffixText: kCurrencySuffix,
        helperText: 'لازم يكون أقل من سعر الدخول',
        errorText: _stopPriceError(plan),
      ),
    );
  }

  String? _stopPriceError(SmartTradePlan plan) {
    final entry = plan.entryPrice;
    final stop = parseNumber(controller.text);
    if (entry == null || stop == null) return null;
    if (stop >= entry) return 'سعر الاستوب لازم يكون أقل من سعر الدخول';
    return null;
  }
}

/// Header text for smart trade builder.
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
          'اكتب سعر الدخول واختار النسب — التطبيق يحسب الباقي.',
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}
