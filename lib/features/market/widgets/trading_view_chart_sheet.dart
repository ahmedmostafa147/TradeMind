import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/formatters.dart';
import '../../../core/theme.dart';
import '../models/egx_stock_info.dart';
import '../services/egx_market_service.dart';

/// Interactive chart modal sheet for EGX stocks.
class TradingViewChartSheet extends StatelessWidget {
  final String symbol;
  final EgxStockInfo? info;

  const TradingViewChartSheet({
    super.key,
    required this.symbol,
    this.info,
  });

  static void show(BuildContext context, String symbol, [EgxStockInfo? info]) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => TradingViewChartSheet(symbol: symbol, info: info),
    );
  }

  void _openTradingViewWeb() {
    final clean = EgxMarketService.normalize(symbol);
    final url = Uri.parse('https://ar.tradingview.com/symbols/EGX-$clean/');
    launchUrl(url, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.resultColors;
    final cleanSymbol = EgxMarketService.normalize(symbol);
    final name = EgxMarketService.nameFor(cleanSymbol) ?? info?.name ?? cleanSymbol;
    final pct = info?.changePercent;
    final isWin = (pct ?? 0) >= 0;

    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  NumericText(
                    cleanSymbol,
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    name,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (info != null)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                NumericText(
                  money(info!.price),
                  style: theme.textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (pct != null)
                  NumericText(
                    '${isWin ? '+' : ''}${pct.toStringAsFixed(2)}%',
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: isWin ? colors.win : colors.loss,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
              ],
            ),
          const SizedBox(height: 24),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                const Icon(
                  Icons.candlestick_chart_rounded,
                  size: 48,
                  color: Colors.blueAccent,
                ),
                const SizedBox(height: 12),
                Text(
                  'الرسم البياني التفاعلي من TradingView',
                  style: theme.textTheme.titleMedium,
                ),
                const SizedBox(height: 4),
                Text(
                  'افتح الشارت المباشر والمؤشرات الفنية لسهم $cleanSymbol.',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: _openTradingViewWeb,
                  icon: const Icon(Icons.open_in_new_rounded),
                  label: Text('افتح شارت $cleanSymbol على TradingView'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}
