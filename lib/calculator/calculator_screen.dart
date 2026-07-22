import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/calc/sizing_result.dart';
import '../core/formatters.dart';
import '../core/theme.dart';
import '../core/widgets/app_logo_title.dart';
import '../core/widgets/risk_warning.dart';
import '../settings/settings_providers.dart';
import '../trades/trade_draft.dart';
import '../trades/trade_form_screen.dart';
import 'widgets/smart_trade_builder.dart';

class CalculatorScreen extends ConsumerStatefulWidget {
  const CalculatorScreen({super.key});

  @override
  ConsumerState<CalculatorScreen> createState() => _CalculatorScreenState();
}

class _CalculatorScreenState extends ConsumerState<CalculatorScreen> {
  // Transient form state stays local. Routing keystrokes through a global
  // provider would buy nothing — SizingResult.compute is a few nanoseconds of
  // arithmetic and is safe to run in build().
  final _entryController = TextEditingController();
  final _stopController = TextEditingController();

  @override
  void dispose() {
    _entryController.dispose();
    _stopController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final settings = ref.watch(settingsProvider);
    final entry = parseNumber(_entryController.text);
    final stop = parseNumber(_stopController.text);

    final result = SizingResult.compute(
      capital: settings.capital,
      maxRiskPercent: settings.maxRiskPercent,
      entry: entry,
      stop: stop,
    );

    final bothEntered = entry != null && stop != null;
    final invalidStop = bothEntered && entry <= stop;
    final colors = context.resultColors;

    return Scaffold(
      appBar: AppBar(title: const AppLogoTitle(title: 'حاسبة الصفقة')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Added as its own section above the manual calculator, which is left
          // exactly as it was for anyone who already knows their stop price.
          const SmartTradeBuilder(),
          const SizedBox(height: 28),
          const Divider(),
          const SizedBox(height: 20),
          Text(
            'الحاسبة اليدوية',
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          Text(
            'لو عارف سعر الاستوب بالظبط.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 16),

          _PriceField(
            // Keyed so tests (and anything else) can address the manual
            // calculator unambiguously: the smart builder above it has a
            // field with the same label.
            key: const ValueKey('manual-entry-price'),
            controller: _entryController,
            label: 'سعر الدخول',
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 16),
          _PriceField(
            key: const ValueKey('manual-stop-price'),
            controller: _stopController,
            label: 'سعر الاستوب',
            onChanged: (_) => setState(() {}),
            errorText: invalidStop
                ? 'سعر الاستوب لازم يكون أقل من سعر الدخول'
                : null,
          ),
          const SizedBox(height: 24),

          if (result.overRisk) ...[
            const RiskWarning(),
            const SizedBox(height: 16),
          ],

          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  ReadoutRow(
                    label: 'أقصى خسارة مسموحة للصفقة',
                    value: money(result.maxLoss),
                  ),
                  ReadoutRow(
                    label: 'المخاطرة للسهم الواحد',
                    value: money(result.riskPerShare),
                  ),
                  const Divider(height: 24),
                  ReadoutRow(
                    label: 'الأسهم المقترحة',
                    value: quantity(result.suggestedQty),
                    emphasise: true,
                    valueColor: Theme.of(context).colorScheme.primary,
                  ),
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

          // A bare "0" here reads as a bug, so say what actually happened.
          if (result.capitalTooSmall) ...[
            const SizedBox(height: 12),
            Text(
              'رأس المال لا يسمح بأي كمية عند هذا الاستوب. '
              'قرّب الاستوب من سعر الدخول أو زوّد رأس المال.',
              style: TextStyle(color: colors.loss),
            ),
          ],

          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed:
                (result.suggestedQty != null && result.suggestedQty! > 0)
                ? () => _openForm(result, entry!, stop!)
                : null,
            icon: const Icon(Icons.add),
            label: const Text('استخدم دي كصفقة جديدة'),
          ),
        ],
      ),
    );
  }

  void _openForm(SizingResult result, double entry, double stop) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => TradeFormScreen(
          draft: TradeDraft(
            entryPrice: entry,
            stopPrice: stop,
            quantity: result.suggestedQty,
          ),
        ),
      ),
    );
  }
}

class _PriceField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final ValueChanged<String> onChanged;
  final String? errorText;

  const _PriceField({
    super.key,
    required this.controller,
    required this.label,
    required this.onChanged,
    this.errorText,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      onChanged: onChanged,
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      inputFormatters: [
        FilteringTextInputFormatter.allow(RegExp(r'[0-9.٠-٩]')),
      ],
      textDirection: TextDirection.ltr,
      textAlign: TextAlign.right,
      decoration: InputDecoration(
        labelText: label,
        suffixText: kCurrencySuffix,
        errorText: errorText,
      ),
    );
  }
}
