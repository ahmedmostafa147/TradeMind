import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/formatters.dart';
import '../../../core/theme.dart';
import '../market_providers.dart';

/// Live, unrealised profit/loss for an OPEN position, from the last market
/// price. Realised trades already show their final P&L, so this is only for
/// positions still running.
///
/// The price comes from the unofficial Yahoo endpoint behind
/// [livePriceProvider], so every non-success path degrades to a quiet muted
/// line rather than an error — a missing live price must never look like a loss.
class LivePnlView extends ConsumerWidget {
  final String ticker;
  final double entryPrice;
  final int quantity;

  const LivePnlView({
    super.key,
    required this.ticker,
    required this.entryPrice,
    required this.quantity,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colors = context.resultColors;
    final quote = ref.watch(livePriceProvider(ticker));

    Widget muted(String text) => Text(
      text,
      style: theme.textTheme.bodySmall?.copyWith(
        color: theme.colorScheme.outline,
      ),
    );

    return quote.when(
      loading: () => Row(
        children: [
          SizedBox(
            width: 12,
            height: 12,
            child: CircularProgressIndicator(
              strokeWidth: 1.6,
              color: theme.colorScheme.outline,
            ),
          ),
          const SizedBox(width: 8),
          muted('جاري تحديث السعر...'),
        ],
      ),
      error: (_, _) => muted('تعذّر تحديث السعر اللحظي'),
      data: (info) {
        // 0.0 is the service's sentinel for "no real quote" (offline fallback).
        if (info == null || info.price <= 0) {
          return muted('السعر اللحظي غير متاح');
        }

        final current = info.price;
        final pnl = (current - entryPrice) * quantity;
        final pct = entryPrice > 0
            ? (current - entryPrice) / entryPrice * 100
            : null;

        final color = pnl > 0
            ? colors.win
            : (pnl < 0 ? colors.loss : colors.open);
        final pctText = pct == null ? '' : ' (${_signedPct(pct)})';

        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: colors.surfaceFor(color),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Icon(
                pnl >= 0
                    ? Icons.trending_up_rounded
                    : Icons.trending_down_rounded,
                size: 18,
                color: color,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'ربح/خسارة لحظية',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 2),
                    NumericText(
                      '${signedMoney(pnl)}$pctText',
                      style: theme.textTheme.titleSmall?.copyWith(
                        color: color,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    'السعر الحالي',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 2),
                  NumericText(
                    money(current),
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  static String _signedPct(double pct) {
    final sign = pct > 0 ? '+' : '';
    return '$sign${pct.toStringAsFixed(2)}%';
  }
}
