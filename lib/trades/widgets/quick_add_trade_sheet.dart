import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:uuid/uuid.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/state/app_state.dart';
import '../cubit/trades_cubit.dart';

import '../../core/calc/sizing_result.dart';
import '../../core/formatters.dart';
import '../../core/theme.dart';
import '../../core/widgets/risk_warning.dart';
import '../../features/market/widgets/stock_quote_badge.dart';
import '../../features/market/widgets/ticker_field.dart';
import '../trade.dart';
import '../trade_draft.dart';
import '../trade_form_screen.dart';
import '../trade_status.dart';

/// The one name the add-a-trade action goes by, everywhere.
///
/// It used to be "صفقة سريعة" on the button, "إضافة صفقة" in one empty state
/// and "حاسبة الصفقة" in another — three names for what a new user experiences
/// as one job, which is what made the app feel like it had more moving parts
/// than it does.
const String kAddTradeLabel = 'أضف صفقة';

/// Opens the add-trade sheet. Every entry point routes through here so the
/// presentation (full height, above the keyboard, under the status bar) cannot
/// drift between callers.
Future<void> openQuickAddSheet(BuildContext context) => showModalBottomSheet(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  builder: (_) => const QuickAddTradeSheet(),
);

/// Fast quick-trade modal: ticker, entry, stop, target and share count.
class QuickAddTradeSheet extends StatefulWidget {
  const QuickAddTradeSheet({super.key});

  @override
  State<QuickAddTradeSheet> createState() => _QuickAddTradeSheetState();
}

class _QuickAddTradeSheetState extends State<QuickAddTradeSheet> {
  final _tickerController = TextEditingController();
  final _entryController = TextEditingController();
  final _stopController = TextEditingController();
  final _targetController = TextEditingController();

  /// Left empty the risk rule sizes the position, which assumes the whole
  /// account backs it. Traders rarely commit everything, so the quantity has
  /// to be typeable here and not only in the full form.
  final _quantityController = TextEditingController();

  /// «هدخل بفلوس قد ايه» — the cash going into THIS position.
  ///
  /// The same field the calculator has. Without it the suggestion is the risk
  /// rule alone, which sizes as if the whole account were behind every trade —
  /// so the sheet kept proposing hundreds of shares to someone who came to
  /// spend a few thousand pounds, and the number had to be worked out by hand
  /// before it could be typed into عدد الأسهم.
  final _budgetController = TextEditingController();

  @override
  void dispose() {
    _tickerController.dispose();
    _entryController.dispose();
    _stopController.dispose();
    _targetController.dispose();
    _quantityController.dispose();
    _budgetController.dispose();
    super.dispose();
  }

  void _quickSave(SizingResult sizing) {
    final ticker = _tickerController.text.trim().toUpperCase();
    final entry = parseNumber(_entryController.text);
    final stop = parseNumber(_stopController.text);
    final target = parseNumber(_targetController.text);
    final qty = sizing.effectiveQty;

    if (ticker.isEmpty || entry == null || stop == null) return;
    // Never invent a quantity: a fallback of 1 used to save a position nobody
    // chose, with risk figures to match.
    if (qty == null || qty <= 0) return;

    final trade = Trade(
      id: const Uuid().v4(),
      entryDate: DateTime.now(),
      ticker: ticker,
      reason: 'صفقة سريعة',
      entryPrice: entry,
      stopPrice: stop,
      quantity: qty,
      takeProfitPrice: target,
      status: TradeStatus.planned,
    );

    context.read<TradesCubit>().save(trade);
    Navigator.of(context).pop();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('تمت إضافة صفقة $ticker بنجاح!')),
    );
  }

  void _openFullForm(SizingResult sizing) {
    final ticker = _tickerController.text.trim().toUpperCase();
    final entry = parseNumber(_entryController.text);
    final stop = parseNumber(_stopController.text);
    final target = parseNumber(_targetController.text);

    final draft = TradeDraft(
      ticker: ticker,
      entryPrice: entry,
      stopPrice: stop,
      takeProfitPrice: target,
      // The full form has no budget field, so a budget typed here would be the
      // one thing «التفاصيل الكاملة ←» threw away. Carrying the quantity it
      // produced keeps the answer even though the question cannot follow.
      quantity: parseInteger(_quantityController.text) ??
          (sizing.limitedByBudget ? sizing.effectiveQty : null),
      reason: 'صفقة سريعة',
    );

    Navigator.of(context).pop();
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => TradeFormScreen(draft: draft)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final settings = context.settings;
    final theme = Theme.of(context);

    final entry = parseNumber(_entryController.text);
    final stop = parseNumber(_stopController.text);
    final sizing = SizingResult.compute(
      capital: settings.capital,
      maxRiskPercent: settings.maxRiskPercent,
      entry: entry,
      stop: stop,
      userQty: parseInteger(_quantityController.text),
      budget: parseNumber(_budgetController.text),
    );

    final isValid = _tickerController.text.trim().isNotEmpty &&
        entry != null &&
        stop != null &&
        stop < entry &&
        (sizing.effectiveQty ?? 0) > 0;

    // Scrollable, not a bare Column: the ticker suggestions appear inline and
    // push the sheet past the space left above the keyboard, which overflowed
    // the bottom by ~46px instead of scrolling.
    return SingleChildScrollView(
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
              Icon(
                Icons.flash_on_rounded,
                color: context.palette.aiAccent,
                size: 28,
              ),
              const SizedBox(width: 10),
              // Expanded, not Spacer: the title plus the full-details button
              // are wider than a phone at this text size and the row was
              // overflowing by ~74px. Now the title takes the slack and
              // ellipsises instead.
              Expanded(
                child: Text(
                  'إضافة صفقة سريعة',
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              TextButton(
                onPressed: () => _openFullForm(sizing),
                child: const Text('التفاصيل الكاملة ←'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TickerField(
            controller: _tickerController,
            onChanged: () => setState(() {}),
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
          // Full width and above عدد الأسهم on purpose: it is the input that
          // decides the suggestion shown under that field.
          TextField(
            key: const ValueKey('quick-budget-field'),
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
              helperText: sizing.limitedByBudget
                  ? 'الكمية اتحددت بالمبلغ ده، مش بحد المخاطرة'
                  : 'سيبه فاضي عشان يستخدم حد المخاطرة بس',
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _targetController,
                  onChanged: (_) => setState(() {}),
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[0-9.٠-٩]')),
                  ],
                  textDirection: TextDirection.ltr,
                  textAlign: TextAlign.right,
                  decoration: const InputDecoration(
                    labelText: 'الهدف (اختياري)',
                    suffixText: kCurrencySuffix,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextField(
                  controller: _quantityController,
                  onChanged: (_) => setState(() {}),
                  keyboardType: TextInputType.number,
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[0-9٠-٩]')),
                  ],
                  textDirection: TextDirection.ltr,
                  textAlign: TextAlign.right,
                  decoration: InputDecoration(
                    labelText: 'عدد الأسهم',
                    helperText: sizing.suggestedQty != null
                        ? 'المقترح: ${quantity(sizing.suggestedQty)}'
                        : null,
                  ),
                ),
              ),
            ],
          ),
          if (sizing.overRisk) ...[
            const SizedBox(height: 12),
            const RiskWarning(),
          ],
          if ((sizing.effectiveQty ?? 0) > 0) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 4,
              ),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerLow,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: theme.colorScheme.outlineVariant),
              ),
              child: Column(
                children: [
                  ReadoutRow(
                    label: 'عدد الأسهم',
                    value: quantity(sizing.effectiveQty),
                  ),
                  ReadoutRow(
                    label: 'قيمة المركز',
                    value: money(sizing.positionValue),
                  ),
                  // This used to read `maxLoss` — the loss budget from
                  // settings, identical for every trade — while labelled as
                  // this position's risk. With a typed quantity that reading
                  // was plainly wrong, so it now shows what is actually at
                  // stake here.
                  ReadoutRow(
                    label: 'المخاطرة',
                    value: '${money(sizing.riskEgp)} · ${percent(sizing.riskPct)}',
                    valueColor: sizing.overRisk ? context.resultColors.loss : null,
                    emphasise: true,
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
