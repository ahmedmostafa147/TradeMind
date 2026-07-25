import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/calc/smart_trade.dart';
import '../../core/formatters.dart';
import '../../settings/settings_providers.dart';
import '../../trades/trade_draft.dart';
import '../../trades/trade_form_screen.dart';
import 'percent_picker.dart';
import 'smart_trade_controls.dart';
import 'trade_summary_card.dart';

enum StopInputMode { percent, price }

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
  final _stopPriceController = TextEditingController();
  final _budgetController = TextEditingController();

  StopInputMode _stopMode = StopInputMode.percent;
  double? _takeProfitPercent;
  double? _stopLossPercent;

  @override
  void dispose() {
    _entryController.dispose();
    _takeProfitController.dispose();
    _stopLossController.dispose();
    _stopPriceController.dispose();
    _budgetController.dispose();
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

    _takeProfitPercent ??= settings.defaultTakeProfitPercent;
    _stopLossPercent ??= settings.defaultStopLossPercent;
    if (_takeProfitController.text.isEmpty) {
      _takeProfitController.text = _percentText(_takeProfitPercent!);
    }
    if (_stopLossController.text.isEmpty) {
      _stopLossController.text = _percentText(_stopLossPercent!);
    }

    final inPriceMode = _stopMode == StopInputMode.price;
    final stopPrice =
        inPriceMode ? parseNumber(_stopPriceController.text) : null;

    final plan = SmartTradePlan.compute(
      capital: settings.capital,
      maxRiskPercent: settings.maxRiskPercent,
      takeProfitPercent: _takeProfitPercent!,
      stopLossPercent: inPriceMode ? 0.0 : _stopLossPercent!,
      entryPrice: parseNumber(_entryController.text),
      stopPrice: stopPrice,
      budget: parseNumber(_budgetController.text),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SmartTradeHeader(),
        const SizedBox(height: 16),
        TextField(
          key: const ValueKey('entry-price-field'),
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
        const SizedBox(height: 16),

        // Without this the sizing assumes the whole account backs the trade,
        // which is not how anyone actually buys — most people commit a slice.
        TextField(
          key: const ValueKey('budget-field'),
          controller: _budgetController,
          onChanged: (_) => setState(() {}),
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          inputFormatters: [
            FilteringTextInputFormatter.allow(RegExp(r'[0-9.٠-٩]')),
          ],
          textDirection: TextDirection.ltr,
          textAlign: TextAlign.right,
          decoration: InputDecoration(
            labelText: 'المبلغ اللي هدخل بيه (اختياري)',
            suffixText: kCurrencySuffix,
            helperText: plan.sizing.limitedByBudget
                ? 'الكمية اتحددت بالمبلغ ده، مش بحد المخاطرة'
                : 'سيبه فاضي عشان يستخدم حد المخاطرة بس',
          ),
        ),
        const SizedBox(height: 20),
        PercentPicker(
          title: 'نسبة الهدف',
          fieldKey: const ValueKey('take-profit-percent-field'),
          presets: _takeProfitPresets,
          selected: _takeProfitPercent,
          controller: _takeProfitController,
          onSelected: _setTakeProfit,
          onTyped: (fraction) => setState(() => _takeProfitPercent = fraction),
        ),
        const SizedBox(height: 20),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('وقف الخسارة', style: theme.textTheme.titleSmall),
            SegmentedButton<StopInputMode>(
              showSelectedIcon: false,
              segments: const [
                ButtonSegment(value: StopInputMode.percent, label: Text('نسبة')),
                ButtonSegment(value: StopInputMode.price, label: Text('سعر')),
              ],
              selected: {_stopMode},
              onSelectionChanged: (s) => setState(() => _stopMode = s.first),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (_stopMode == StopInputMode.percent)
          PercentPicker(
            title: 'نسبة وقف الخسارة',
            showTitle: false,
            fieldKey: const ValueKey('stop-percent-field'),
            presets: _stopLossPresets,
            selected: _stopLossPercent,
            controller: _stopLossController,
            onSelected: _setStopLoss,
            onTyped: (fraction) => setState(() => _stopLossPercent = fraction),
          )
        else
          StopPriceField(
            controller: _stopPriceController,
            onChanged: (_) => setState(() {}),
            plan: plan,
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
            reason: _stopMode == StopInputMode.price
                ? 'هدف ${_percentText(plan.takeProfitPercent)}% ووقف عند ${money(plan.stopLossPrice)}'
                : 'هدف ${_percentText(plan.takeProfitPercent)}% ووقف ${_percentText(plan.stopLossPercent)}%',
          ),
        ),
      ),
    );
  }
}
