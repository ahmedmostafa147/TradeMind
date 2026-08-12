import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'home_shell.dart';
import '../billing/billing_providers.dart';
import '../billing/entitlements.dart';
import '../billing/widgets/paywall.dart';
import '../core/theme.dart';
import '../dashboard/analytics_screen.dart';
import '../dashboard/dashboard_screen.dart';
import '../features/ai_parser/widgets/ai_trade_sheet.dart';
import '../today/today_screen.dart';
import '../trades/trades_screen.dart';
import '../trades/widgets/quick_add_trade_sheet.dart';
import '../watchlist/watchlist_form_screen.dart';

class TradesHubScreen extends ConsumerWidget {
  const TradesHubScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final entitlement = ref.watch(entitlementProvider);
    return DefaultTabController(
      length: 5,
      child: Scaffold(
        appBar: AppBar(
          toolbarHeight: 44,
          actions: [
            IconButton(
              icon: Icon(
                Icons.auto_awesome,
                color: entitlement.can(Feature.aiReader)
                    ? context.palette.aiAccent
                    : Theme.of(context).colorScheme.outline,
              ),
              tooltip: entitlement.can(Feature.aiReader)
                  ? 'تحليل توصيات بالـ AI'
                  : 'تحليل توصيات بالـ AI — ${Paywall.lockedLabel}',
              onPressed: () => !entitlement.can(Feature.aiReader)
                  ? ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('قراءة التوصيات بالـ AI ${Paywall.lockedLabel}.'),
                      ),
                    )
                  : showModalBottomSheet(
                      context: context,
                      isScrollControlled: true,
                      useSafeArea: true,
                      builder: (_) => const AiTradeSheet(),
                    ),
            ),
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
            const SettingsAction(),
          ],
          bottom: const TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: [
              Tab(text: 'قرار اليوم'),
              Tab(text: 'صفقاتي'),
              Tab(text: 'تخطيط'),
              Tab(text: 'الأداء'),
              Tab(text: 'التحليلات'),
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
            if (entitlement.can(Feature.analytics))
              const PerformanceView()
            else
              const Paywall(
                title: 'الأداء',
                what: 'صافي الربح ونسبة النجاح والتوقّع الرياضي ومنحنى رأس المال وسيناريوهات المحفظة.',
              ),
            if (entitlement.can(Feature.analytics))
              const AnalyticsView()
            else
              const Paywall(
                title: 'التحليلات',
                what: 'معامل الربح ومتوسط R وسلاسل الربح والخسارة ومتوسط مدة الاحتفاظ.',
              ),
          ],
        ),
      ),
    );
  }

  static const int _analyticsTab = 4;

  static void _run(BuildContext context, _HubAction action) {
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

enum _HubAction { analytics, addToWatchlist }
