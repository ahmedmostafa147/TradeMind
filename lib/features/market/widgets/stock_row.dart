import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/formatters.dart';
import '../../../core/theme.dart';
import '../market_providers.dart';
import '../models/egx_stock_info.dart';
import '../services/egx_market_service.dart';
import 'trading_view_chart_sheet.dart';

class StockRowWidget extends ConsumerWidget {
  final String code;
  final VoidCallback onTap;

  const StockRowWidget({super.key, required this.code, required this.onTap});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colors = context.resultColors;
    final quote = ref.watch(livePriceProvider(code));

    final EgxStockInfo? info = quote.asData?.value;
    final pct = info?.changePercent;
    final color = pct == null || pct == 0
        ? theme.colorScheme.onSurfaceVariant
        : (pct > 0 ? colors.win : colors.loss);

    return ListTile(
      onTap: onTap,
      title: NumericText(code, style: theme.textTheme.titleSmall),
      subtitle: Text(
        EgxMarketService.nameFor(code) ?? code,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: theme.textTheme.bodySmall?.copyWith(
          color: theme.colorScheme.onSurfaceVariant,
        ),
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              NumericText(
                info == null ? kEmptyValue : money(info.price),
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (pct != null) ...[
                const SizedBox(height: 2),
                NumericText(
                  '${pct > 0 ? '+' : ''}${pct.toStringAsFixed(2)}%',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: color,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ],
          ),
          IconButton(
            icon: const Icon(Icons.candlestick_chart_outlined, size: 20),
            tooltip: 'عرض الشارت التفاعلي',
            onPressed: () => TradingViewChartSheet.show(context, code, info),
          ),
        ],
      ),
    );
  }
}
