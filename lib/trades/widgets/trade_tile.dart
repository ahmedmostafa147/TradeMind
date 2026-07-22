import 'package:flutter/material.dart';

import '../../core/calc/trade_metrics.dart';
import '../../core/formatters.dart';
import '../../core/theme.dart';
import '../trade.dart';
import 'result_badge.dart';

class TradeTile extends StatelessWidget {
  final Trade trade;
  final TradeMetrics metrics;
  final VoidCallback onTap;

  const TradeTile({
    super.key,
    required this.trade,
    required this.metrics,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.resultColors;

    final pnlColor = switch (metrics.result) {
      TradeResult.win => colors.win,
      TradeResult.loss => colors.loss,
      TradeResult.breakeven => colors.breakeven,
      TradeResult.open => colors.open,
    };

    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  // The over-limit marker. Red bar plus icon rather than colour
                  // alone, so it survives a colour-blind viewer.
                  if (metrics.overRisk) ...[
                    Container(
                      width: 4,
                      height: 20,
                      decoration: BoxDecoration(
                        color: colors.loss,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    const SizedBox(width: 8),
                  ],
                  Text(
                    trade.ticker,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(width: 8),
                  ResultBadge(metrics.result),
                  const Spacer(),
                  NumericText(
                    dateLabel(trade.entryDate),
                    style: theme.textTheme.bodySmall,
                  ),
                ],
              ),
              if (metrics.overRisk) ...[
                const SizedBox(height: 6),
                Row(
                  children: [
                    Icon(
                      Icons.warning_amber_rounded,
                      size: 14,
                      color: colors.loss,
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        'تحذير: المخاطرة أعلى من الحد المسموح',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colors.loss,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 12),
              Row(
                children: [
                  _Metric(
                    label: 'الربح/الخسارة',
                    value: metrics.pnl == null
                        ? kEmptyValue
                        : signedMoney(metrics.pnl),
                    color: metrics.pnl == null ? null : pnlColor,
                  ),
                  const SizedBox(width: 24),
                  _Metric(
                    label: 'R',
                    value: rMultiple(metrics.rMultiple),
                    color: metrics.rMultiple == null ? null : pnlColor,
                  ),
                  const SizedBox(width: 24),
                  _Metric(
                    label: 'نسبة المخاطرة',
                    value: percent(metrics.riskPct),
                    color: metrics.overRisk ? colors.loss : null,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  final String label;
  final String value;
  final Color? color;

  const _Metric({required this.label, required this.value, this.color});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: theme.textTheme.bodySmall),
        const SizedBox(height: 2),
        NumericText(
          value,
          style: theme.textTheme.titleSmall?.copyWith(
            color: color,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }
}
