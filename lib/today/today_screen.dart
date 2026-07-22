import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../watchlist/paste_recommendations_screen.dart';
import '../watchlist/watchlist_form_screen.dart';
import '../watchlist/watchlist_providers.dart';
import 'today_providers.dart';
import 'widgets/no_tasks_banner.dart';
import 'widgets/summary_card.dart';
import 'widgets/today_empty_state.dart';
import 'widgets/today_sections_list.dart';

/// «قرار اليوم» — Action center for trades requiring user decisions.
class TodayScreen extends ConsumerWidget {
  const TodayScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final decisions = ref.watch(dailyDecisionsProvider);
    final watchlist = ref.watch(sortedWatchlistProvider);
    final theme = Theme.of(context);

    final noActions = decisions.isEmpty && watchlist.isEmpty;
    final nothingAtAll = noActions && decisions.recentlyClosed.isEmpty;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'قرار اليوم',
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.content_paste_go_rounded),
            tooltip: 'لصق ترشيحات',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => const PasteRecommendationsScreen(),
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.playlist_add_rounded),
            tooltip: 'إضافة للمتابعة',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const WatchlistFormScreen()),
            ),
          ),
        ],
      ),
      body: nothingAtAll
          ? const TodayEmptyState()
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
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
            ),
    );
  }
}
