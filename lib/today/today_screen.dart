import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../watchlist/watchlist_providers.dart';
import 'today_providers.dart';
import 'widgets/no_tasks_banner.dart';
import 'widgets/summary_card.dart';
import 'widgets/today_empty_state.dart';
import 'widgets/today_sections_list.dart';

/// «اليوم» — the trades that need a decision right now.
///
/// A tab body, not a screen: it carries no Scaffold or AppBar of its own. It
/// used to be one of five equal bottom-nav destinations alongside «سجل
/// الصفقات» and «لوحة التحكم», which are the same trades shown differently —
/// three siblings a new user had to open one by one to tell apart. All three
/// now live under «صفقاتي», where being views of one thing is stated rather
/// than left to be discovered. See [TradesHubScreen].
class TodayView extends ConsumerWidget {
  const TodayView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final decisions = ref.watch(dailyDecisionsProvider);
    final watchlist = ref.watch(sortedWatchlistProvider);
    final theme = Theme.of(context);

    final noActions = decisions.isEmpty && watchlist.isEmpty;
    final nothingAtAll = noActions && decisions.recentlyClosed.isEmpty;

    if (nothingAtAll) return const TodayEmptyState();

    return ListView(
      key: const ValueKey('today-list'),
      // Bottom padding clears the hub's floating action button.
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
      children: [
        if (noActions) ...[
          const NoTasksBanner(),
          const SizedBox(height: 16),
        ],
        SummaryCard(
          decisions: decisions,
          watchlistCount: watchlist.length,
        ),
        const SizedBox(height: 20),
        TodaySectionsList(
          decisions: decisions,
          watchlist: watchlist,
        ),
        Center(
          child: Text(
            'كل الحسابات محلية على جهازك',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.outline,
            ),
          ),
        ),
      ],
    );
  }
}
