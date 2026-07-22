import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/calc/smart_trade.dart';
import '../../core/formatters.dart';
import '../../settings/settings_providers.dart';
import '../../trades/trade_draft.dart';
import '../../trades/trade_form_screen.dart';
import 'trade_summary_card.dart';

/// «منشئ الصفقة الذكي» — enter a price, pick two percentages, get a fully
/// sized trade. No mental arithmetic anywhere in the flow.
class SmartTradeBuilder extends ConsumerStatefulWidget {
  const SmartTradeBuilder({super.key});

  @override
  ConsumerState<SmartTradeBuilder> createState() => _SmartTradeBuilderState();
}

class _SmartTradeBuilderState extends ConsumerState<SmartTradeBuilder> {
  static const List<double> _takeProfitPresets = [0.03, 0.05, 0.07, 0.10];
  static const List<double> _stopLossPresets = [0.01, 0.02, 0.03, 0.05];

  final _entryController = TextEditingController();
  final _takeProfitController = TextEditingController();
  final _stopLossController = TextEditingController();

  /// Null until the defaults have been seeded from settings, which cannot be
  /// read in initState because the settings box is provider-scoped.
  double? _takeProfitPercent;
  double? _stopLossPercent;

  @override
  void dispose() {
    _entryController.dispose();
    _takeProfitController.dispose();
    _stopLossController.dispose();
    super.dispose();
  }

  void _setTakeProfit(double fraction) {
    setState(() {
      _takeProfitPercent = fraction;
      _takeProfitController.text = _percentText(fraction);
    });
  }

  void _setStopLoss(double fraction) {
    setState(() {
      _stopLossPercent = fraction;
      _stopLossController.text = _percentText(fraction);
    });
  }

  /// Trims the trailing ".0" so a 5% preset reads "5" rather than "5.0".
  static String _percentText(double fraction) {
    final percent = fraction * 100;
    return percent == percent.roundToDouble()
        ? percent.round().toString()
        : percent.toStringAsFixed(1);
  }

  @override
  Widget build(BuildContext context) {
    final settings = ref.watch(settingsProvider);
    final theme = Theme.of(context);

    // Seeded once from the configured defaults, then owned by the user's taps.
    _takeProfitPercent ??= settings.defaultTakeProfitPercent;
    _stopLossPercent ??= settings.defaultStopLossPercent;
    if (_takeProfitController.text.isEmpty) {
      _takeProfitController.text = _percentText(_takeProfitPercent!);
    }
    if (_stopLossController.text.isEmpty) {
      _stopLossController.text = _percentText(_stopLossPercent!);
    }

    final plan = SmartTradePlan.compute(
      capital: settings.capital,
      maxRiskPercent: settings.maxRiskPercent,
      takeProfitPercent: _takeProfitPercent!,
      stopLossPercent: _stopLossPercent!,
      entryPrice: parseNumber(_entryController.text),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
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
        const SizedBox(height: 16),

        TextField(
          controller: _entryController,
          onChanged: (_) => setState(() {}),
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          inputFormatters: [
            FilteringTextInputFormatter.allow(RegExp(r'[0-9.٠-٩]')),
          ],
          textDirection: TextDirection.ltr,
          textAlign: TextAlign.right,
          decoration: const InputDecoration(
            labelText: 'سعر الدخول',
            suffixText: kCurrencySuffix,
          ),
        ),
        const SizedBox(height: 20),

        _PercentPicker(
          title: 'نسبة الهدف',
          presets: _takeProfitPresets,
          selected: _takeProfitPercent,
          controller: _takeProfitController,
          onSelected: _setTakeProfit,
          onTyped: (fraction) => setState(() => _takeProfitPercent = fraction),
        ),
        const SizedBox(height: 20),

        _PercentPicker(
          title: 'نسبة وقف الخسارة',
          presets: _stopLossPresets,
          selected: _stopLossPercent,
          controller: _stopLossController,
          onSelected: _setStopLoss,
          onTyped: (fraction) => setState(() => _stopLossPercent = fraction),
        ),
        const SizedBox(height: 20),

        TradeSummaryCard(plan: plan),
        const SizedBox(height: 16),

        FilledButton.icon(
          onPressed: _canCreate(plan) ? () => _createTrade(plan) : null,
          icon: const Icon(Icons.add_chart_rounded),
          label: const Text('إنشاء الصفقة'),
        ),
      ],
    );
  }

  bool _canCreate(SmartTradePlan plan) =>
      plan.entryPrice != null &&
      plan.stopLossPrice != null &&
      (plan.sizing.effectiveQty ?? 0) > 0;

  void _createTrade(SmartTradePlan plan) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => TradeFormScreen(
          draft: TradeDraft(
            entryPrice: plan.entryPrice,
            stopPrice: plan.stopLossPrice,
            quantity: plan.sizing.effectiveQty,
            takeProfitPrice: plan.takeProfitPrice,
            reason:
                'هدف ${_percentText(plan.takeProfitPercent)}% '
                'ووقف ${_percentText(plan.stopLossPercent)}%',
          ),
        ),
      ),
    );
  }
}

class _PercentPicker extends StatelessWidget {
  final String title;
  final List<double> presets;
  final double? selected;
  final TextEditingController controller;
  final ValueChanged<double> onSelected;
  final ValueChanged<double> onTyped;

  const _PercentPicker({
    required this.title,
    required this.presets,
    required this.selected,
    required this.controller,
    required this.onSelected,
    required this.onTyped,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: theme.textTheme.titleSmall),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final preset in presets)
                    ChoiceChip(
                      label: Text('${_label(preset)}%'),
                      // Compared with a tolerance so a typed "5" still lights
                      // up the 5% chip despite the round-trip through text.
                      selected:
                          selected != null &&
                          (selected! - preset).abs() < 1e-9,
                      onSelected: (_) => onSelected(preset),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            SizedBox(
              width: 92,
              child: TextField(
                controller: controller,
                onChanged: (value) {
                  final percent = parseNumber(value);
                  if (percent != null && percent > 0) onTyped(percent / 100);
                },
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'[0-9.٠-٩]')),
                ],
                textDirection: TextDirection.ltr,
                textAlign: TextAlign.center,
                decoration: const InputDecoration(
                  suffixText: '%',
                  isDense: true,
                  labelText: 'يدوي',
                ),
              ),
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
