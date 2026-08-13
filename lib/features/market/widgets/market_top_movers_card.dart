import 'package:flutter/material.dart';

import '../../../core/formatters.dart';
import '../../../core/theme.dart';
import '../../../trades/trade_draft.dart';
import '../../../trades/trade_form_screen.dart';
import '../models/egx_stock_info.dart';

/// Card listing top 5 gainers or top 5 losers in the EGX market.
class MarketTopMoversCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color headerColor;
  final List<EgxStockInfo> stocks;

  const MarketTopMoversCard({
    super.key,
    required this.title,
    required this.icon,
    required this.headerColor,
    required this.stocks,
  });

  void _openStockForm(BuildContext context, String symbol) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => TradeFormScreen(
          draft: TradeDraft(ticker: symbol),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.resultColors;

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: headerColor, size: 20),
                const SizedBox(width: 8),
                Text(title, style: theme.textTheme.titleMedium),
              ],
            ),
            const SizedBox(height: 12),
            if (stocks.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text(
                  'جاري تحميل البيانات...',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: stocks.length,
                separatorBuilder: (context, index) => const Divider(height: 12),
                itemBuilder: (context, index) {
                  final stock = stocks[index];
                  final isPositive = stock.changePercent >= 0;
                  final color = isPositive ? colors.win : colors.loss;

                  return InkWell(
                    onTap: () => _openStockForm(context, stock.symbol),
                    borderRadius: BorderRadius.circular(8),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        vertical: 4,
                        horizontal: 4,
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                NumericText(
                                  stock.symbol,
                                  style: theme.textTheme.titleSmall?.copyWith(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  stock.name,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    color: theme.colorScheme.onSurfaceVariant,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              NumericText(
                                money(stock.price),
                                style: theme.textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 2),
                              NumericText(
                                '${isPositive ? '+' : ''}${stock.changePercent.toStringAsFixed(2)}%',
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: color,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}
