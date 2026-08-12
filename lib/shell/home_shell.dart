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

/// Four destinations, each a different job: look at my trades, read the market,
/// size a trade, change my settings.
///
/// THIS COMMENT USED TO DESCRIBE «المستجدات» AS THE FOURTH ONE and argue that it
/// earned its slot. It was wrong twice over by the time anybody read it: the tab
/// had already been replaced by «السوق», and the paragraph claiming the admin
/// console publishes to `announcements` and `signals` described collections that
/// firestore.rules denies outright. The screen and its service are now deleted
/// too, so there is nothing left for it to be wrong about.
///
/// The bar was five, and three of those five — «قرار اليوم», «سجل الصفقات» and
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
  /// mark-as-seen call went with it, «السوق» took the slot, and
  /// `lib/features/updates/` has since been deleted entirely.
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
      // THE TRIAL COUNTDOWN BAR IS GONE FROM THE APP, and only from the app.
      //
      // It sat here saying «باقي 3 أيام في تجربتك المجانية» — the clearest
      // possible announcement that a paid tier exists, on a surface that offers
      // no way to reach it, because Play Billing is not wired up and an emailed
      // bank transfer is exactly what Play forbids. A countdown whose only remedy
      // is somewhere else is not information, it is a nag with no button.
      //
      // The website keeps its banner (`TrialBanner` in paywall.tsx) because that
      // is where the user can act on it. Someone whose trial lapses on the phone
      // meets `Paywall.lockedLabel` on the surface they reached for, which states
      // the situation where it is relevant instead of counting down to it for a
      // fortnight.
      body: Column(
        children: [
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
