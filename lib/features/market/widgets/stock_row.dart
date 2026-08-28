import 'package:flutter/material.dart';

import '../../../core/formatters.dart';
import '../../../core/theme.dart';
import '../models/egx_stock_info.dart';
import '../services/egx_market_service.dart';
import 'stock_logo.dart';
import 'trading_view_chart_sheet.dart';

/// One line of the stocks list.
///
/// ── IT IS HANDED ITS QUOTE, IT DOES NOT FETCH ONE ──────────────────────────
///
/// This used to `ref.watch(livePriceProvider(code))`, which is right beside a
/// single open position and wrong in a list — every visible row spun up its own
/// provider for a price that arrives, for all ~292 listings at once, in the one
/// board response the screen already holds. `livePriceProvider` still exists and
/// is still correct for `LivePnlView`, where there genuinely is one symbol.
///
/// Being a plain StatelessWidget also means scrolling rebuilds nothing but the
/// rows entering the viewport.
class StockRowWidget extends StatelessWidget {
  final String code;

  /// Null when the board could not be reached — the row then shows the name and
  /// «—», never a zero. A price that did not arrive must not read as a stock
  /// that did not move.
  final EgxStockInfo? info;

  final VoidCallback onTap;

  const StockRowWidget({
    super.key,
    required this.code,
    required this.info,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.resultColors;

    final pct = info?.changePercent;
    final color = pct == null || pct == 0
        ? theme.colorScheme.onSurfaceVariant
        : (pct > 0 ? colors.win : colors.loss);

    // The curated Arabic directory wins over TradingView's own description for
    // the thirty names it covers; the board's name carries the rest.
    final name = EgxMarketService.nameFor(code) ?? info?.name ?? code;

    return ListTile(
      onTap: onTap,
      // Handed the id the board already carried — like the price, this row
      // fetches nothing of its own.
      leading: StockLogo(logoId: info?.logoId, name: name),
      title: NumericText(code, style: theme.textTheme.titleSmall),
      subtitle: Text(
        name,
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
                info == null ? kEmptyValue : money(info!.price),
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
