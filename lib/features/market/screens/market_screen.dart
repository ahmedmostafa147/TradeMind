import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shell/home_shell.dart';
import '../market_providers.dart';
import '../models/egx_stock_info.dart';
import '../widgets/market_top_movers_card.dart';

/// «السوق» — Top 5 gainers and bottom 5 losers from TradingView EGX scanner.
class MarketScreen extends ConsumerWidget {
  const MarketScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final boardAsync = ref.watch(tradingViewBoardProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('السوق'),
        actions: const [SettingsAction()],
      ),
      body: boardAsync.when(
        loading: () => const Center(
          child: Padding(
            padding: EdgeInsets.all(32),
            child: Text('بيحمّل أسعار البورصة...'),
          ),
        ),
        error: (_, __) => _MarketErrorView(
          onRetry: () => ref.refresh(tradingViewBoardProvider),
        ),
        data: (stocks) {
          if (stocks.isEmpty) {
            return _MarketErrorView(
              onRetry: () => ref.refresh(tradingViewBoardProvider),
            );
          }

          // Sort by changePercent descending
          final sorted = List<EgxStockInfo>.from(stocks)
            ..sort((a, b) => b.changePercent.compareTo(a.changePercent));

          final top5Gainers = sorted.take(5).toList();
          final top5Losers = sorted.reversed.take(5).toList();

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(tradingViewBoardProvider);
              await ref.read(tradingViewBoardProvider.future);
            },
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('أداء أسهم البورصة اليوم', style: theme.textTheme.titleMedium),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.primaryContainer,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        'TradingView',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: theme.colorScheme.onPrimaryContainer,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                MarketTopMoversCard(
                  title: 'أعلى 5 أسهم (الأكثر ارتفاعاً)',
                  icon: Icons.trending_up_rounded,
                  headerColor: Colors.green,
                  stocks: top5Gainers,
                ),
                const SizedBox(height: 16),
                MarketTopMoversCard(
                  title: 'أقل 5 أسهم (الأكثر انخفاضاً)',
                  icon: Icons.trending_down_rounded,
                  headerColor: Colors.red,
                  stocks: top5Losers,
                ),
                const SizedBox(height: 20),
                Text(
                  'المصدر: TradingView Egypt Scanner. الأسعار محدّثة بناءً على بيانات الجلسة '
                  'ومتاحة للاسترشاد، وليست توصية بالبيع أو الشراء.',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _MarketErrorView extends StatelessWidget {
  final VoidCallback onRetry;
  const _MarketErrorView({required this.onRetry});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('جاري تحديث بيانات السوق', style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(
              'تعذّر الاتصال بخدمة أسعار TradingView. تأكد من اتصال الإنترنت ثم اضغط حدّث.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 16),
            OutlinedButton(
              onPressed: onRetry,
              child: const Text('حدّث'),
            ),
          ],
        ),
      ),
    );
  }
}
