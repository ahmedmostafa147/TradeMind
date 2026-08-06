import 'package:flutter/material.dart';

import '../core/theme.dart';
import '../dashboard/analytics_screen.dart';
import '../dashboard/dashboard_screen.dart';
import '../dashboard/goal_view.dart';
import '../features/ai_parser/widgets/ai_trade_sheet.dart';
import '../today/today_screen.dart';
import '../trades/trades_screen.dart';
import '../trades/widgets/quick_add_trade_sheet.dart';
import '../watchlist/paste_recommendations_screen.dart';
import '../watchlist/watchlist_form_screen.dart';

/// «صفقاتي» — the three views of the journal, under one roof.
///
/// «قرار اليوم», «سجل الصفقات» and «لوحة التحكم» used to be three of five
/// bottom-nav destinations. They are not three things: they are the same
/// trades, filtered to what needs a decision, listed in full, and totted up.
/// Presented as siblings in a bottom bar they looked like separate features,
/// and the only way to learn the difference was to open each one and compare.
///
/// A TabBar says what a bottom bar could not — that these belong to each other
/// and switching between them is changing the view, not the place. It also
/// leaves the bottom bar with three destinations that are genuinely different
/// jobs: my trades, plan a trade, settings.
///
/// One Scaffold owns the AppBar and the add button for all three tabs, so
/// "add a trade" is reachable from every view and cannot drift apart between
/// them — it existed twice on one screen before this.
class TradesHubScreen extends StatelessWidget {
  const TradesHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 6,
      child: Scaffold(
        appBar: AppBar(
          // NO TITLE. The bottom navigation bar already labels this
          // destination «صفقاتي», so an app bar repeating it spent a row of a
          // phone screen saying the same word twice — and the tab strip below
          // says which view you are on anyway.
          toolbarHeight: 44,
          actions: [
            IconButton(
              icon: Icon(Icons.auto_awesome, color: context.palette.aiAccent),
              tooltip: 'تحليل توصيات بالـ AI',
              onPressed: () => showModalBottomSheet(
                context: context,
                isScrollControlled: true,
                // The sheet lists every trade found across several images, so
                // it can run the full height of the screen — without this the
                // top of the list sits under the status bar.
                useSafeArea: true,
                builder: (_) => const AiTradeSheet(),
              ),
            ),
            // The rest go in a menu rather than the bar. Four icons plus a
            // title is more than a phone width holds, and only the AI reader is
            // reached often enough to earn a permanent slot.
            PopupMenuButton<_HubAction>(
              tooltip: 'المزيد',
              onSelected: (action) => _run(context, action),
              itemBuilder: (_) => const [
                PopupMenuItem(
                  value: _HubAction.analytics,
                  child: ListTile(
                    leading: Icon(Icons.insights_outlined),
                    title: Text('الإحصائيات التفصيلية'),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
                PopupMenuItem(
                  value: _HubAction.pasteRecommendations,
                  child: ListTile(
                    leading: Icon(Icons.content_paste_go_rounded),
                    title: Text('لصق ترشيحات'),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
                PopupMenuItem(
                  value: _HubAction.addToWatchlist,
                  child: ListTile(
                    leading: Icon(Icons.playlist_add_rounded),
                    title: Text('إضافة للمتابعة'),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
              ],
            ),
          ],
          // Scrollable, because five fixed tabs crush their labels on a
          // narrow phone. «الهدف» is new and «التحليلات» was promoted out of
          // the overflow menu: the web carries both as top-level tabs, and a
          // feature reachable only from a three-dot menu is a feature most
          // people never find.
          bottom: const TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: [
              Tab(text: 'قرار اليوم'),
              Tab(text: 'صفقاتي'),
              Tab(text: 'تخطيط'),
              Tab(text: 'الأداء'),
              Tab(text: 'التحليلات'),
              Tab(text: 'الهدف'),
            ],
          ),
        ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: () => openQuickAddSheet(context),
          icon: const Icon(Icons.add_rounded),
          label: const Text(kAddTradeLabel),
        ),
        body: const TabBarView(
          children: [
            TodayView(),
            TradesView(filter: TradesFilter.real),
            TradesView(filter: TradesFilter.planned),
            PerformanceView(),
            AnalyticsView(),
            GoalView(),
          ],
        ),
      ),
    );
  }

  static void _run(BuildContext context, _HubAction action) {
    final screen = switch (action) {
      _HubAction.analytics => const AnalyticsScreen(),
      _HubAction.pasteRecommendations => const PasteRecommendationsScreen(),
      _HubAction.addToWatchlist => const WatchlistFormScreen(),
    };
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => screen));
  }
}

enum _HubAction { analytics, pasteRecommendations, addToWatchlist }
