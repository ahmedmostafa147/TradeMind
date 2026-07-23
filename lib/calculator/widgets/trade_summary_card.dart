import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/calc/smart_trade.dart';
import '../../core/formatters.dart';
import '../../core/theme.dart';
import '../../core/widgets/risk_warning.dart';

/// «ملخص الصفقة» — every number the trader would otherwise work out by hand.
///
/// Framed green when the reward strictly beats the risk, red otherwise, so the
/// verdict is readable before any of the individual figures are.
class TradeSummaryCard extends StatelessWidget {
  final SmartTradePlan plan;

  const TradeSummaryCard({super.key, required this.plan});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.resultColors;
    final positive = plan.rewardBeatsRisk;
    final hasPrices = plan.entryPrice != null;
    final accent = positive ? colors.win : colors.loss;
    final borderColor = hasPrices ? accent : theme.colorScheme.outlineVariant;
    final quality = plan.quality;

    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(color: borderColor, width: hasPrices ? 1.5 : 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Text(
                  'ملخص الصفقة',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                NumericText(
                  plan.rewardRiskRatio == null
                      ? kEmptyValue
                      : '${plan.rewardRiskRatio!.toStringAsFixed(2)}R/R',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: accent,
                  ),
                ),
              ],
            ),

            if (quality != null) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: colors.surfaceFor(_qualityColor(quality, colors)),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  quality.label,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: _qualityColor(quality, colors),
                  ),
                ),
              ),
            ],

            const SizedBox(height: 8),
            ReadoutRow(label: 'سعر الدخول', value: money(plan.entryPrice)),
            ReadoutRow(
              label: 'سعر الهدف',
              value: money(plan.takeProfitPrice),
              valueColor: colors.win,
            ),
            ReadoutRow(
              label: 'سعر وقف الخسارة',
              value: money(plan.stopLossPrice),
              valueColor: colors.loss,
            ),
            const Divider(height: 20),
            ReadoutRow(
              label: 'الأسهم المقترحة',
              value: quantity(plan.sizing.effectiveQty),
              emphasise: true,
            ),
            ReadoutRow(
              label: 'قيمة المركز',
              value: money(plan.sizing.positionValue),
            ),
            const Divider(height: 20),
            ReadoutRow(
              label: 'الربح المتوقع',
              value: money(plan.expectedProfit),
              valueColor: colors.win,
              emphasise: true,
            ),
            ReadoutRow(
              label: 'الخسارة المتوقعة',
              value: money(plan.expectedLoss),
              valueColor: colors.loss,
              emphasise: true,
            ),
            ReadoutRow(
              label: 'نسبة المخاطرة',
              value: percent(plan.sizing.riskPct),
              valueColor: plan.sizing.overRisk ? colors.loss : null,
            ),
            ReadoutRow(
              label: 'أقصى خسارة مسموحة',
              value: money(plan.sizing.maxLoss),
            ),

            if (plan.sizing.overRisk) ...[
              const SizedBox(height: 12),
              const RiskWarning(),
            ],

            const SizedBox(height: 16),
            _CopyRow(plan: plan),
          ],
        ),
      ),
    );
  }

  static Color _qualityColor(TradeQuality quality, ResultColors colors) =>
      switch (quality) {
        TradeQuality.good => colors.win,
        TradeQuality.warning => colors.breakeven,
        TradeQuality.bad => colors.loss,
      };
}

class _CopyRow extends StatelessWidget {
  final SmartTradePlan plan;

  const _CopyRow({required this.plan});

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        _CopyChip(
          label: 'نسخ سعر الهدف',
          // Copied as a bare number so it can be pasted straight into a broker
          // order ticket.
          value: plan.takeProfitPrice?.toStringAsFixed(2),
        ),
        _CopyChip(
          label: 'نسخ سعر وقف الخسارة',
          value: plan.stopLossPrice?.toStringAsFixed(2),
        ),
        _CopyChip(
          label: 'نسخ الكمية',
          value: plan.sizing.effectiveQty?.toString(),
        ),
      ],
    );
  }
}

class _CopyChip extends StatelessWidget {
  final String label;
  final String? value;

  const _CopyChip({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final enabled = value != null;
    return ActionChip(
      avatar: const Icon(Icons.copy_rounded, size: 16),
      label: Text(label),
      onPressed: enabled
          ? () async {
              await Clipboard.setData(ClipboardData(text: value!));
              if (!context.mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('اتنسخ: $value'),
                  duration: const Duration(seconds: 1),
                ),
              );
            }
          : null,
    );
  }
}
