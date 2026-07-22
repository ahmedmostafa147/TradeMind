import 'package:flutter/material.dart';

import '../../../core/formatters.dart';
import '../models/egx_stock_info.dart';
import '../services/egx_market_service.dart';

/// Live EGX stock market quote badge displaying symbol, company name, and price.
class StockQuoteBadge extends StatefulWidget {
  final String symbol;

  const StockQuoteBadge({super.key, required this.symbol});

  @override
  State<StockQuoteBadge> createState() => _StockQuoteBadgeState();
}

class _StockQuoteBadgeState extends State<StockQuoteBadge> {
  EgxStockInfo? _info;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  @override
  void didUpdateWidget(covariant StockQuoteBadge oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.symbol != widget.symbol) {
      _fetch();
    }
  }

  Future<void> _fetch() async {
    if (widget.symbol.trim().isEmpty) return;
    setState(() => _loading = true);
    final info = await EgxMarketService.fetchStockInfo(widget.symbol);
    if (mounted) {
      setState(() {
        _info = info;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.symbol.trim().isEmpty) return const SizedBox.shrink();
    final theme = Theme.of(context);

    if (_loading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 4),
        child: LinearProgressIndicator(minHeight: 2),
      );
    }

    final info = _info;
    if (info == null || info.price == 0.0) {
      return const SizedBox.shrink();
    }

    final isPositive = info.change >= 0;
    final changeColor =
        isPositive ? const Color(0xFF0E7C4A) : const Color(0xFFB3261E);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '${info.symbol} — ${info.name}',
                  style: theme.textTheme.labelMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  'السعر بالبورصة: ${money(info.price)}',
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: changeColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              '${isPositive ? '+' : ''}${info.changePercent.toStringAsFixed(2)}%',
              style: theme.textTheme.labelSmall?.copyWith(
                color: changeColor,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
