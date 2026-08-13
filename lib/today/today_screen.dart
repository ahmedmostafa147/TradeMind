import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../watchlist/watchlist_providers.dart';
import 'today_providers.dart';
import 'widgets/no_tasks_banner.dart';
import 'widgets/summary_card.dart';
import 'widgets/today_empty_state.dart';
import 'widgets/today_sections_list.dart';
import 'widgets/today_summary_banner.dart';

/// «اليوم» — the trades that need a decision right now.
class TodayView extends ConsumerWidget {
  const TodayView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final decisions = ref.watch(dailyDecisionsProvider);
    final watchlist = ref.watch(sortedWatchlistProvider);

    final noActions = decisions.isEmpty && watchlist.isEmpty;
    final nothingAtAll = noActions && decisions.recentlyClosed.isEmpty;

    if (nothingAtAll) return const TodayEmptyState();

    return ListView(
      key: const ValueKey('today-list'),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
      children: [
        const TodaySummaryBanner(),
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
      ],
    );
  }
}
