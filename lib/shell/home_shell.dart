import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../billing/billing_providers.dart';
import '../billing/entitlements.dart';
import '../billing/widgets/paywall.dart';
import '../calculator/calculator_screen.dart';
import '../features/sync/providers/sync_provider.dart';
import '../features/market/screens/market_screen.dart';
import '../settings/settings_screen.dart';
import 'trades_hub_screen.dart';

/// Four destinations, each a different job: look at my trades, plan a new one,
/// read what was published, change my settings.
///
/// «المستجدات» is the fourth and it earns the slot on the same test as the
/// others — it is a different JOB, not the same trades shown another way, which
/// is exactly what got three of the original five merged into [TradesHubScreen]
/// below. It is also the only way anybody sees an announcement: the admin
/// console has published to `announcements` and `signals` since it was built,
/// and until this screen existed nothing anywhere read either collection.
///
/// It was five, and three of those five — «قرار اليوم», «سجل الصفقات» and
/// «لوحة التحكم» — were the same trades shown three ways. Sitting side by side
/// in the bar they read as three separate features, so the only way to learn
/// what each held was to open it. They are now the tabs of [TradesHubScreen],
/// where the grouping states the relationship outright.
///
/// A drawer would hide every primary surface behind a gesture that also
/// collides with Android's right-edge back swipe under RTL. NavigationBar
/// mirrors itself automatically, so صفقاتي lands rightmost with no work.
class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key});

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  int _index = 0;

  /// «المستجدات» USED TO LIVE AT INDEX 2, with a seen/unseen badge and the
  /// bookkeeping that went with it. The feed is gone — both collections behind
  /// it are denied by firestore.rules — so the tab, its badge and the
  /// mark-as-seen call went with it, and «السوق» took the slot.
  void _select(int value) => setState(() => _index = value);

  @override
  Widget build(BuildContext context) {
    // The shell is what keeps the sync controller alive. A Riverpod provider
    // nothing watches is never constructed, so this single line is the
    // difference between the cloud backup running and it being dead code —
    // which is what it was: the observer existed but was never referenced, so
    // no trade was ever uploaded.
    ref.watch(syncControllerProvider);

    // Watched here so the whole shell reflects a plan change the moment the
    // subscription lands, rather than only the screen that happens to be open.
    final entitlement = ref.watch(entitlementProvider);

    return Scaffold(
      body: Column(
        children: [
          const TrialBanner(),
          Expanded(
            // IndexedStack, not a rebuild-on-switch: it preserves scroll
            // position and half-typed calculator input across tab changes.
            child: IndexedStack(
              index: _index,
              children: [
                const TradesHubScreen(),
                if (entitlement.can(Feature.marketFlows))
                  const MarketScreen()
                else
                  const Paywall(
                    title: 'السوق',
                    what:
                        'مين اشترى ومين باع في كل جلسة — مؤسسات ولا أفراد، '
                        'مصريين ولا عرب ولا أجانب، وصافي كل فئة.',
                  ),
                const CalculatorScreen(),
                const SettingsScreen(),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: _select,
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long),
            label: 'صفقاتي',
          ),
          const NavigationDestination(
            icon: Icon(Icons.insights_outlined),
            selectedIcon: Icon(Icons.insights),
            label: 'السوق',
          ),
          const NavigationDestination(
            icon: Icon(Icons.calculate_outlined),
            selectedIcon: Icon(Icons.calculate),
            label: 'حاسبة الصفقة',
          ),
          const NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings),
            label: 'الإعدادات',
          ),
        ],
      ),
    );
  }
}
