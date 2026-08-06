import 'package:flutter/material.dart';

import '../../core/calc/daily_decisions.dart';
import '../../core/formatters.dart';
import '../../core/theme.dart';
import '../../features/market/widgets/live_pnl_view.dart';
import '../../trades/widgets/result_badge.dart';
import '../../trades/widgets/trade_levels.dart';

class TradeActionCard extends StatelessWidget {
  final DecisionItem item;
  final String? message;
  final Color? borderColor;
  final bool showRiskWarning;
  final List<Widget> actions;
  final VoidCallback onTap;

  const TradeActionCard({
    super.key,
    required this.item,
    required this.actions,
    required this.onTap,
    this.message,
    this.borderColor,
    this.showRiskWarning = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.resultColors;
    final trade = item.trade;
    final metrics = item.metrics;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Card(
        shape: borderColor == null
            ? null
            : RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
                side: BorderSide(color: borderColor!, width: 1.5),
              ),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(20),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      trade.ticker,
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(width: 8),
                    ResultBadge(metrics.result, status: trade.status),
                    const Spacer(),
                    if (trade.isFavorite)
                      Icon(Icons.star_rounded, size: 20, color: colors.breakeven),
                    if (trade.notes != null && trade.notes!.trim().isNotEmpty)
                      Padding(
                        padding: const EdgeInsetsDirectional.only(start: 6),
                        child: Icon(
                          Icons.notes_rounded,
                          size: 18,
                          color: theme.colorScheme.outline,
                        ),
                      ),
                  ],
                ),
                if (showRiskWarning) ...[
                  const SizedBox(height: 10),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: colors.lossSurface,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.warning_amber_rounded,
                          size: 18,
                          color: colors.loss,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'تحذير: المخاطرة أعلى من الحد المسموح',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colors.loss,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                if (message != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    message!,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
                // The plan first, in the order every other screen shows it,
                // then what this card adds on top. The target and the position
                // value used to be missing here, and the share count vanished
                // entirely on a planned idea rather than reading as "not set".
                const SizedBox(height: 12),
                TradeLevels(
                  trade: trade,
                  positionValue: metrics.positionValue,
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 16,
                  runSpacing: 8,
                  children: [
                    _Fact(
                      label: 'المخاطرة',
                      value: percent(metrics.riskPct),
                      color: metrics.overRisk ? colors.loss : null,
                    ),
                    _Fact(
                      label: 'الأيام',
                      value: quantity(item.daysSinceEntry),
                    ),
                  ],
                ),
                // Running result for a live position — the number a trader
                // opens this screen to see. Only open trades have one; a planned
                // idea has not risked money yet.
                if (trade.isOpen && trade.ticker.trim().isNotEmpty) ...[
                  const SizedBox(height: 12),
                  LivePnlView(
                    ticker: trade.ticker,
                    entryPrice: trade.entryPrice,
                    quantity: trade.quantity,
                  ),
                ],
                const SizedBox(height: 14),
                Row(children: _spaced(actions)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  static List<Widget> _spaced(List<Widget> actions) {
    final result = <Widget>[];
    for (var i = 0; i < actions.length; i++) {
      if (i > 0) result.add(const SizedBox(width: 8));
      result.add(Expanded(child: actions[i]));
    }
    return result;
  }
}

class _Fact extends StatelessWidget {
  final String label;
  final String value;
  final Color? color;

  const _Fact({required this.label, required this.value, this.color});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label,
          style: theme.textTheme.bodySmall?.copyWith(fontSize: 11),
        ),
        const SizedBox(height: 2),
        NumericText(
          value,
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }
}
