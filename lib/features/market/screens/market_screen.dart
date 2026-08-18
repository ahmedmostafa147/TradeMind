import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme.dart';
import '../../../shell/home_shell.dart';
import '../market_providers.dart';
import '../models/egx_stock_info.dart';
import '../widgets/market_flows_view.dart';
import '../widgets/market_top_movers_card.dart';

/// «السوق» — the board's five best and five worst, then who bought and who sold.
///
/// MIRROR OF site/components/dashboard/market-flows-panel.tsx, in its order:
/// movers first (they change every session and answer "what happened today"),
/// the investor split under them (it answers "who moved it"). The two come from
/// different places — TradingView's scanner and our own `marketFlows`
/// collection — and either can be missing without taking the other down.
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
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(tradingViewBoardProvider);
          await ref.read(tradingViewBoardProvider.future);
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
          children: [
            _MoversSection(theme: theme, boardAsync: boardAsync, ref: ref),
            const SizedBox(height: 24),
            // Renders nothing at all until a session has been entered, so an
            // unreachable board never leaves the tab looking like two failures.
            const MarketFlowsView(),
          ],
        ),
      ),
    );
  }
}

class _MoversSection extends StatelessWidget {
  final ThemeData theme;
  final AsyncValue<List<EgxStockInfo>> boardAsync;
  final WidgetRef ref;

  const _MoversSection({
    required this.theme,
    required this.boardAsync,
    required this.ref,
  });

  @override
  Widget build(BuildContext context) {
    // win/loss are palette tokens, generated and contrast-checked. Material's
    // Colors.green/red are a different green and a different red, so the card
    // header used to be a shade the numbers under it never use.
    final colors = context.resultColors;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Flexible(
              child: Text(
                'أداء أسهم البورصة اليوم',
                style: theme.textTheme.titleMedium,
              ),
            ),
            const SizedBox(width: 8),
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
        boardAsync.when(
          // A STATIC placeholder, not a CircularProgressIndicator: HomeShell
          // builds its tabs inside an IndexedStack, so this screen exists at
          // launch whether or not it is visible, and a spinner offscreen keeps
          // scheduling frames — which makes every pumpAndSettle in the widget
          // tests wait for ever.
          loading: () => const Padding(
            padding: EdgeInsets.symmetric(vertical: 32),
            child: Center(child: Text('بيحمّل أسعار البورصة...')),
          ),
          error: (_, _) => _MarketErrorView(
            onRetry: () => ref.invalidate(tradingViewBoardProvider),
          ),
          data: (stocks) {
            if (stocks.isEmpty) {
              return _MarketErrorView(
                onRetry: () => ref.invalidate(tradingViewBoardProvider),
              );
            }

            final sorted = List<EgxStockInfo>.from(stocks)
              ..sort((a, b) => b.changePercent.compareTo(a.changePercent));

            return Column(
              children: [
                MarketTopMoversCard(
                  title: 'أعلى 5 أسهم (الأكثر ارتفاعًا)',
                  icon: Icons.trending_up_rounded,
                  headerColor: colors.win,
                  stocks: sorted.take(5).toList(),
                ),
                const SizedBox(height: 16),
                MarketTopMoversCard(
                  title: 'أقل 5 أسهم (الأكثر انخفاضًا)',
                  icon: Icons.trending_down_rounded,
                  headerColor: colors.loss,
                  stocks: sorted.reversed.take(5).toList(),
                ),
                const SizedBox(height: 20),
                Text(
                  'المصدر: TradingView Egypt Scanner. الأسعار متأخرة ١٥ دقيقة '
                  'ومتاحة للاسترشاد، وليست توصية بالبيع أو الشراء.',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _MarketErrorView extends StatelessWidget {
  final VoidCallback onRetry;
  const _MarketErrorView({required this.onRetry});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
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
          OutlinedButton(onPressed: onRetry, child: const Text('حدّث')),
        ],
      ),
    );
  }
}
