import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../core/calc/sizing_result.dart';
import '../../core/formatters.dart';
import '../../features/market/widgets/stock_quote_badge.dart';
import '../../settings/settings_providers.dart';
import '../trade.dart';
import '../trade_draft.dart';
import '../trade_form_screen.dart';
import '../trade_status.dart';
import '../trades_providers.dart';

/// Fast 4-field quick trade modal.
class QuickAddTradeSheet extends ConsumerStatefulWidget {
  const QuickAddTradeSheet({super.key});

  @override
  ConsumerState<QuickAddTradeSheet> createState() => _QuickAddTradeSheetState();
}

class _QuickAddTradeSheetState extends ConsumerState<QuickAddTradeSheet> {
  final _tickerController = TextEditingController();
  final _entryController = TextEditingController();
  final _stopController = TextEditingController();
  final _targetController = TextEditingController();

  @override
  void dispose() {
    _tickerController.dispose();
    _entryController.dispose();
    _stopController.dispose();
    _targetController.dispose();
    super.dispose();
  }

  void _quickSave(SizingResult sizing) {
    final ticker = _tickerController.text.trim().toUpperCase();
    final entry = parseNumber(_entryController.text);
    final stop = parseNumber(_stopController.text);
    final target = parseNumber(_targetController.text);

    if (ticker.isEmpty || entry == null || stop == null) return;

    final trade = Trade(
      id: const Uuid().v4(),
      entryDate: DateTime.now(),
      ticker: ticker,
      reason: 'صفقة سريعة',
      entryPrice: entry,
      stopPrice: stop,
      quantity: sizing.effectiveQty ?? 1,
      takeProfitPrice: target,
      status: TradeStatus.planned,
    );

    ref.read(tradesProvider.notifier).add(trade);
    Navigator.of(context).pop();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('تمت إضافة صفقة $ticker بنجاح!')),
    );
  }

  void _openFullForm() {
    final ticker = _tickerController.text.trim().toUpperCase();
    final entry = parseNumber(_entryController.text);
    final stop = parseNumber(_stopController.text);
    final target = parseNumber(_targetController.text);

    final draft = TradeDraft(
      ticker: ticker,
      entryPrice: entry,
      stopPrice: stop,
      takeProfitPrice: target,
      reason: 'صفقة سريعة',
    );

    Navigator.of(context).pop();
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => TradeFormScreen(draft: draft)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final settings = ref.watch(settingsProvider);
    final theme = Theme.of(context);

    final entry = parseNumber(_entryController.text);
    final stop = parseNumber(_stopController.text);
    final sizing = SizingResult.compute(
      capital: settings.capital,
      maxRiskPercent: settings.maxRiskPercent,
      entry: entry,
      stop: stop,
    );

    final isValid = _tickerController.text.trim().isNotEmpty &&
        entry != null &&
        stop != null &&
        stop < entry;

    return Padding(
      padding: EdgeInsets.fromLTRB(
        24,
        20,
        24,
        MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Icon(Icons.flash_on_rounded, color: Colors.amber, size: 28),
              const SizedBox(width: 10),
              Text(
                'إضافة صفقة سريعة',
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              TextButton(
                onPressed: _openFullForm,
                child: const Text('التفاصيل الكاملة ←'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _tickerController,
            textCapitalization: TextCapitalization.characters,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(
              labelText: 'رمز السهم',
              hintText: 'COMI',
              prefixIcon: Icon(Icons.show_chart_rounded),
            ),
          ),
          if (_tickerController.text.trim().isNotEmpty) ...[
            const SizedBox(height: 8),
            StockQuoteBadge(symbol: _tickerController.text),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _entryController,
                  onChanged: (_) => setState(() {}),
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
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
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextField(
                  controller: _stopController,
                  onChanged: (_) => setState(() {}),
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[0-9.٠-٩]')),
                  ],
                  textDirection: TextDirection.ltr,
                  textAlign: TextAlign.right,
                  decoration: const InputDecoration(
                    labelText: 'وقف الخسارة',
                    suffixText: kCurrencySuffix,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _targetController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            inputFormatters: [
              FilteringTextInputFormatter.allow(RegExp(r'[0-9.٠-٩]')),
            ],
            textDirection: TextDirection.ltr,
            textAlign: TextAlign.right,
            decoration: const InputDecoration(
              labelText: 'سعر الهدف (اختياري)',
              suffixText: kCurrencySuffix,
            ),
          ),
          if (sizing.effectiveQty != null && sizing.effectiveQty! > 0) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerLow,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: theme.colorScheme.outlineVariant),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'الأسهم المحسوبة: ${quantity(sizing.effectiveQty)}',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    'المخاطرة: ${money(sizing.maxLoss)}',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 20),
          FilledButton.icon(
            onPressed: isValid ? () => _quickSave(sizing) : null,
            icon: const Icon(Icons.check_circle_rounded),
            label: const Text('حفظ الصفقة السريعة'),
          ),
        ],
      ),
    );
  }
}
