import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/calc/trade_metrics.dart';
import '../settings/settings_providers.dart';
import 'trade_detail_screen.dart';
import 'trade_status.dart';
import 'trades_providers.dart';
import 'widgets/trade_tile.dart';

enum TradesFilter {
  real,
  planned;

  bool matches(TradeStatus status) => switch (this) {
    TradesFilter.real =>
      status == TradeStatus.open || status == TradeStatus.closed,
    TradesFilter.planned =>
      status == TradeStatus.planned || status == TradeStatus.cancelled,
  };
}

class TradesView extends ConsumerWidget {
  final TradesFilter filter;

  const TradesView({super.key, this.filter = TradesFilter.real});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trades = [
      for (final trade in ref.watch(sortedTradesProvider))
        if (filter.matches(trade.status)) trade,
    ];
    final settings = ref.watch(settingsProvider);
    final isDesktop = (kIsWeb || TargetPlatform.windows == defaultTargetPlatform) &&
        MediaQuery.of(context).size.width >= 900;

    if (trades.isEmpty) return const _EmptyState();

    if (isDesktop) {
      return GridView.builder(
        key: const ValueKey('trades-grid'),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 3,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          mainAxisExtent: 220,
        ),
        itemCount: trades.length,
        itemBuilder: (context, index) {
          final trade = trades[index];
          return TradeTile(
            trade: trade,
            metrics: TradeMetrics.of(
              trade,
              capital: settings.capital,
              maxRiskPercent: settings.maxRiskPercent,
            ),
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => TradeDetailScreen(tradeId: trade.id),
              ),
            ),
          );
        },
      );
    }

    return ListView.separated(
      key: const ValueKey('trades-list'),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
      itemCount: trades.length,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final trade = trades[index];
        return TradeTile(
          trade: trade,
          metrics: TradeMetrics.of(
            trade,
            capital: settings.capital,
            maxRiskPercent: settings.maxRiskPercent,
          ),
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => TradeDetailScreen(tradeId: trade.id),
            ),
          ),
        );
      },
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.receipt_long_outlined,
              size: 64,
              color: theme.colorScheme.outline,
            ),
            const SizedBox(height: 16),
            Text('لسه مفيش صفقات', style: theme.textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(
              'ابدأ بسجل أول صفقة من الزر أسفل الشاشة.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
