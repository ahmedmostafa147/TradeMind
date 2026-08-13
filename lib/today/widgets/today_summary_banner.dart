import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/calc/trade_metrics.dart';
import '../../core/formatters.dart';
import '../../core/theme.dart';
import '../../settings/settings_providers.dart';
import '../../trades/trades_providers.dart';

/// Monthly PnL & Win Rate summary banner for Today's decision view.
class TodaySummaryBanner extends ConsumerWidget {
  const TodaySummaryBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colors = context.resultColors;
    final trades = ref.watch(tradesProvider);
    final settings = ref.watch(settingsProvider);

    final now = DateTime.now();
    final thisMonthTrades = trades.where((t) {
      if (t.exitDate == null || t.exitPrice == null) return false;
      return t.exitDate!.year == now.year && t.exitDate!.month == now.month;
    }).toList();

    if (thisMonthTrades.isEmpty) return const SizedBox.shrink();

    double monthPnl = 0.0;
    int wins = 0;

    for (final t in thisMonthTrades) {
      final metrics = TradeMetrics.of(
        t,
        capital: settings.capital,
        maxRiskPercent: settings.maxRiskPercent,
      );
      final pnl = metrics.pnl ?? 0.0;
      monthPnl += pnl;
      if (metrics.result == TradeResult.win) wins++;
    }

    final winRate = (wins / thisMonthTrades.length) * 100;
    final isWin = monthPnl >= 0;

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      color: theme.colorScheme.surfaceContainerLow,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isWin
              ? colors.win.withValues(alpha: 0.3)
              : colors.loss.withValues(alpha: 0.3),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isWin
                    ? colors.win.withValues(alpha: 0.15)
                    : colors.loss.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: Icon(
                isWin
                    ? Icons.trending_up_rounded
                    : Icons.trending_down_rounded,
                color: isWin ? colors.win : colors.loss,
                size: 24,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'أداء شهر ${now.month}/${now.year}',
                    style: theme.textTheme.labelMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 2),
                  NumericText(
                    signedMoney(monthPnl),
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: isWin ? colors.win : colors.loss,
                    ),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                NumericText(
                  '${winRate.toStringAsFixed(0)}% نجاح',
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${thisMonthTrades.length} صفقات',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
