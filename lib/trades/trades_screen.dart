import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/calc/trade_metrics.dart';
import '../core/widgets/app_logo_title.dart';
import '../settings/settings_providers.dart';
import 'trade.dart';
import 'trade_detail_screen.dart';
import 'trades_providers.dart';
import 'widgets/quick_add_trade_sheet.dart';
import 'widgets/trade_tile.dart';

class TradesScreen extends ConsumerWidget {
  const TradesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trades = ref.watch(sortedTradesProvider);
    final settings = ref.watch(settingsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const AppLogoTitle(title: 'سجل الصفقات'),
        actions: [
          IconButton(
            icon: const Icon(Icons.flash_on_rounded, color: Colors.amber),
            tooltip: 'صفقة سريعة',
            onPressed: () => showModalBottomSheet(
              context: context,
              isScrollControlled: true,
              builder: (_) => const QuickAddTradeSheet(),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          builder: (_) => const QuickAddTradeSheet(),
        ),
        icon: const Icon(Icons.flash_on_rounded),
        label: const Text('صفقة سريعة'),
      ),
      body: trades.isEmpty
          ? const _EmptyState()
          : ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              itemCount: trades.length,
              separatorBuilder: (_, _) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final trade = trades[index];
                return Dismissible(
                  key: ValueKey(trade.id),
                  direction: DismissDirection.endToStart,
                  confirmDismiss: (_) => settings.enableConfirmations
                      ? _confirmDelete(context, trade)
                      : Future.value(true),
                  onDismissed: (_) =>
                      ref.read(tradesProvider.notifier).remove(trade.id),
                  background: const _DeleteBackground(),
                  child: TradeTile(
                    trade: trade,
                    metrics: TradeMetrics.of(
                      trade,
                      capital: settings.capital,
                      maxRiskPercent: settings.maxRiskPercent,
                    ),
                    // Tapping opens the read-only detail page; editing lives
                    // behind the pencil there, so a stray tap in a long list
                    // cannot land the user in an editable form.
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => TradeDetailScreen(tradeId: trade.id),
                      ),
                    ),
                  ),
                );
              },
            ),
    );
  }

  Future<bool> _confirmDelete(BuildContext context, Trade trade) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('حذف الصفقة'),
        content: Text('متأكد إنك عايز تحذف صفقة ${trade.ticker}؟'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('إلغاء'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('حذف'),
          ),
        ],
      ),
    );
    return confirmed ?? false;
  }
}

class _DeleteBackground extends StatelessWidget {
  const _DeleteBackground();

  @override
  Widget build(BuildContext context) {
    return Container(
      alignment: AlignmentDirectional.centerEnd,
      padding: const EdgeInsetsDirectional.only(end: 24),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.errorContainer,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Icon(
        Icons.delete_outline,
        color: Theme.of(context).colorScheme.onErrorContainer,
      ),
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
              // Names the button that actually exists — this used to say
              // «إضافة صفقة», which no longer appears anywhere on the screen.
              'اضغط «صفقة سريعة» تحت عشان تسجّل أول صفقة، '
              'أو ابدأ من «حاسبة الصفقة» عشان تعرف الكمية المناسبة الأول.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }
}
