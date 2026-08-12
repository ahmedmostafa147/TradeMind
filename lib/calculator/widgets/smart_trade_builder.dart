import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/calc/smart_trade.dart';
import '../../core/formatters.dart';
import '../../core/theme.dart';
import '../../settings/settings_providers.dart';
import '../../trades/trade_draft.dart';
import '../../trades/trade_form_screen.dart';
import 'level_field.dart';
import 'smart_trade_controls.dart';
import 'trade_summary_card.dart';

/// Kept as an alias so the older name still reads at call sites and in tests;
/// the stop and the target now share one mode type.
typedef StopInputMode = LevelInputMode;

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
  final _takeProfitPriceController = TextEditingController();
  final _stopLossController = TextEditingController();
  final _stopPriceController = TextEditingController();
  final _budgetController = TextEditingController();

  LevelInputMode _stopMode = LevelInputMode.percent;
  LevelInputMode _targetMode = LevelInputMode.percent;
  double? _takeProfitPercent;
  double? _stopLossPercent;

  @override
  void dispose() {
    _entryController.dispose();
    _takeProfitController.dispose();
    _takeProfitPriceController.dispose();
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
    final colors = context.resultColors;

    _takeProfitPercent ??= settings.defaultTakeProfitPercent;
    _stopLossPercent ??= settings.defaultStopLossPercent;
    if (_takeProfitController.text.isEmpty) {
      _takeProfitController.text = _percentText(_takeProfitPercent!);
    }
    if (_stopLossController.text.isEmpty) {
      _stopLossController.text = _percentText(_stopLossPercent!);
    }

    final stopByPrice = _stopMode == LevelInputMode.price;
    final targetByPrice = _targetMode == LevelInputMode.price;

    final plan = SmartTradePlan.compute(
      capital: settings.capital,
      maxRiskPercent: settings.maxRiskPercent,
      takeProfitPercent: targetByPrice ? 0.0 : _takeProfitPercent!,
      stopLossPercent: stopByPrice ? 0.0 : _stopLossPercent!,
      entryPrice: parseNumber(_entryController.text),
      stopPrice: stopByPrice ? parseNumber(_stopPriceController.text) : null,
      targetPrice:
          targetByPrice ? parseNumber(_takeProfitPriceController.text) : null,
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
        LevelField(
          title: 'جني الأرباح',
          accent: colors.win,
          mode: _targetMode,
          onModeChanged: (m) => setState(() => _targetMode = m),
          presets: _takeProfitPresets,
          selectedPercent: _takeProfitPercent,
          percentController: _takeProfitController,
          percentFieldKey: const ValueKey('take-profit-percent-field'),
          onPercentSelected: _setTakeProfit,
          onPercentTyped: (fraction) =>
              setState(() => _takeProfitPercent = fraction),
          priceController: _takeProfitPriceController,
          priceFieldKey: const ValueKey('take-profit-price-field'),
          onPriceChanged: (_) => setState(() {}),
          priceLabel: 'سعر جني الأرباح',
          priceHelper: 'لازم يكون أعلى من سعر الدخول',
          priceError: _targetPriceError(plan),
          resolvedPrice: plan.takeProfitPrice,
          resolvedPercent:
              plan.takeProfitPrice == null ? null : plan.takeProfitPercent,
        ),
        const SizedBox(height: 20),
        LevelField(
          title: 'وقف الخسارة',
          accent: colors.loss,
          mode: _stopMode,
          onModeChanged: (m) => setState(() => _stopMode = m),
          presets: _stopLossPresets,
          selectedPercent: _stopLossPercent,
          percentController: _stopLossController,
          percentFieldKey: const ValueKey('stop-percent-field'),
          onPercentSelected: _setStopLoss,
          onPercentTyped: (fraction) =>
              setState(() => _stopLossPercent = fraction),
          priceController: _stopPriceController,
          priceFieldKey: const ValueKey('stop-price-field'),
          onPriceChanged: (_) => setState(() {}),
          priceLabel: 'سعر وقف الخسارة',
          priceHelper: 'لازم يكون أقل من سعر الدخول',
          priceError: _stopPriceError(plan),
          resolvedPrice: plan.stopLossPrice,
          resolvedPercent:
              plan.stopLossPrice == null ? null : plan.stopLossPercent,
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

  String? _stopPriceError(SmartTradePlan plan) {
    if (_stopMode != LevelInputMode.price) return null;
    final entry = plan.entryPrice;
    final stop = parseNumber(_stopPriceController.text);
    if (entry == null || stop == null) return null;
    return stop >= entry ? 'سعر الاستوب لازم يكون أقل من سعر الدخول' : null;
  }

  String? _targetPriceError(SmartTradePlan plan) {
    if (_targetMode != LevelInputMode.price) return null;
    final entry = plan.entryPrice;
    final target = parseNumber(_takeProfitPriceController.text);
    if (entry == null || target == null) return null;
    return target <= entry ? 'سعر الهدف لازم يكون أعلى من سعر الدخول' : null;
  }

  bool _canCreate(SmartTradePlan plan) =>
      plan.entryPrice != null &&
      plan.stopLossPrice != null &&
      (plan.sizing.effectiveQty ?? 0) > 0;

  void _createTrade(SmartTradePlan plan) {
    // Whichever way each level was entered, the reason records the level the
    // trader will actually recognise when they reopen the trade months later.
    final target = _targetMode == LevelInputMode.price
        ? 'هدف عند ${money(plan.takeProfitPrice)}'
        : 'هدف ${_percentText(plan.takeProfitPercent)}%';
    final stop = _stopMode == LevelInputMode.price
        ? 'ووقف عند ${money(plan.stopLossPrice)}'
        : 'ووقف ${_percentText(plan.stopLossPercent)}%';

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => TradeFormScreen(
          draft: TradeDraft(
            entryPrice: plan.entryPrice,
            stopPrice: plan.stopLossPrice,
            quantity: plan.sizing.effectiveQty,
            takeProfitPrice: plan.takeProfitPrice,
            reason: '$target $stop',
          ),
        ),
      ),
    );
  }
}
