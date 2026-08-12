import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../billing/billing_providers.dart';
import '../billing/entitlements.dart';
import '../billing/widgets/paywall.dart';
import '../core/theme.dart';
import '../dashboard/analytics_screen.dart';
import '../dashboard/dashboard_screen.dart';
import '../dashboard/goal_view.dart';
import '../features/ai_parser/widgets/ai_trade_sheet.dart';
import '../today/today_screen.dart';
import '../trades/trades_screen.dart';
import '../trades/widgets/quick_add_trade_sheet.dart';
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
class TradesHubScreen extends ConsumerWidget {
  const TradesHubScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final entitlement = ref.watch(entitlementProvider);
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
              icon: Icon(
                Icons.auto_awesome,
                color: entitlement.can(Feature.aiReader)
                    ? context.palette.aiAccent
                    : Theme.of(context).colorScheme.outline,
              ),
              // Both strings go through `Paywall.lockedLabel`. They used to read
              // «محتاج اشتراك» and «من مميزات رادار Pro» — two more wordings for
              // one state, and both naming a product the app may not sell. See
              // the note at the top of paywall.dart.
              tooltip: entitlement.can(Feature.aiReader)
                  ? 'تحليل توصيات بالـ AI'
                  : 'تحليل توصيات بالـ AI — ${Paywall.lockedLabel}',
              onPressed: () => !entitlement.can(Feature.aiReader)
                  ? ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text(
                          'قراءة التوصيات بالـ AI ${Paywall.lockedLabel}.',
                        ),
                      ),
                    )
                  : showModalBottomSheet(
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
            //
            // THE BUILDER IS LOAD-BEARING, do not inline it away. `_run` calls
            // `DefaultTabController.of` to reach the «التحليلات» tab, and this
            // method's own `context` sits ABOVE the DefaultTabController that
            // this very build returns — so passing it throws "was called with a
            // context that does not contain a DefaultTabController". The Builder
            // manufactures a context below it.
            Builder(
              builder: (tabContext) => PopupMenuButton<_HubAction>(
                tooltip: 'المزيد',
                onSelected: (action) => _run(tabContext, action),
                itemBuilder: (_) => const [
                  PopupMenuItem(
                    value: _HubAction.analytics,
                    child: ListTile(
                      leading: Icon(Icons.insights_outlined),
                      title: Text('الإحصائيات التفصيلية'),
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),
                  // «لصق ترشيحات» WAS HERE AND IS GONE. See the note on
                  // `_HubAction` below.
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
        body: TabBarView(
          children: [
            const TodayView(),
            const TradesView(filter: TradesFilter.real),
            const TradesView(filter: TradesFilter.planned),
            // «الأداء» and «التحليلات» are the paid pair. Recording and
            // reviewing trades — the three tabs above — stays free, because the
            // free plan promises exactly that and a journal you cannot write in
            // is not a limited plan.
            if (entitlement.can(Feature.analytics))
              const PerformanceView()
            else
              const Paywall(
                title: 'الأداء',
                what:
                    'صافي الربح ونسبة النجاح والتوقّع الرياضي ومنحنى رأس المال '
                    'وسيناريوهات المحفظة — محسوبة من صفقاتك المقفولة.',
              ),
            if (entitlement.can(Feature.analytics))
              const AnalyticsView()
            else
              const Paywall(
                title: 'التحليلات',
                what:
                    'معامل الربح ومتوسط R وسلاسل الربح والخسارة ومتوسط مدة '
                    'الاحتفاظ وأكتر سهم بتتداوله.',
              ),
            const GoalView(),
          ],
        ),
      ),
    );
  }

  /// Index of «التحليلات» in the tab strip above. Named rather than written as
  /// a bare 4 at the call site, because the menu item below jumps to it and a
  /// tab inserted anywhere to its left would silently send the user elsewhere.
  static const int _analyticsTab = 4;

  static void _run(BuildContext context, _HubAction action) {
    // «الإحصائيات التفصيلية» SWITCHES TABS, it does not push a screen.
    //
    // It used to push an `AnalyticsScreen` that wrapped the same AnalyticsView
    // with no entitlement check, so this menu handed a free account the paid
    // «التحليلات» surface while the tab two rows up showed it a paywall. The
    // website's overflow has always done it this way — `setTab('analytics')` —
    // and one gated route to one surface is the only arrangement where a second
    // door cannot forget the lock.
    // A statement switch over the whole enum, so the analyser flags a new action
    // that nothing handles. The previous shape — an early return for analytics
    // and an expression switch with `throw StateError('handled above')` for it —
    // moved that check to runtime for no gain, and it only existed because a
    // third action needed the expression form.
    switch (action) {
      case _HubAction.analytics:
        DefaultTabController.of(context).animateTo(_analyticsTab);
      case _HubAction.addToWatchlist:
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const WatchlistFormScreen()),
        );
    }
  }
}

/// «لصق ترشيحات» WAS A THIRD ACTION HERE, and it is gone by the owner's call.
///
/// It pasted a chat message into a parser and turned the lines it recognised into
/// watchlist items. Two reasons it went:
///
///   * NO WEBSITE EQUIVALENT. The app and the site are meant to be the same
///     product on two screens; a feature on one of them only is a feature most
///     users never learn exists, and the parser had no browser counterpart.
///   * THE WORD «ترشيح» IN OUR OWN UI. The product states in three published
///     places that it gives no recommendations — the footer disclaimer, the terms,
///     and the FAQ — and RELEASE.md depends on that claim so Play does not file
///     the app under its restricted financial categories. A screen titled «لصق
///     ترشيحات» with a «المصدر» field reads as Radar dealing in recommendations,
///     even though every one of them came from somebody the user already listens
///     to.
///
/// The AI reader survives the same test because it never uses that word: it reads
/// an image the user already has and saves the result as a PLANNED trade with
/// `reason` = «توصية من صورة» — attributed to the sender, not to us.
///
/// `WatchlistFormScreen` still adds a watched stock one at a time, with the same
/// «المصدر» field, which is where the useful half of this lived.
enum _HubAction { analytics, addToWatchlist }
