import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../billing/billing_providers.dart';
import '../billing/entitlements.dart';
import '../billing/widgets/paywall.dart';
import '../calculator/calculator_screen.dart';
import '../features/sync/providers/sync_provider.dart';
import '../features/market/screens/market_screen.dart';
import '../features/market/screens/stocks_screen.dart';
import '../settings/settings_screen.dart';
import 'trades_hub_screen.dart';

/// Five destinations, each a different job: look at my trades, read the market,
/// browse the stocks, size a trade, change my settings.
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

/// Which destination the shell is showing.
///
/// A PROVIDER RATHER THAN LOCAL STATE, because «الإعدادات» is reached from a
/// gear inside each screen's own AppBar (see [SettingsAction]) and those screens
/// are several Scaffolds deep. Walking back up with
/// `findAncestorStateOfType` worked in principle and was a silent no-op in
/// practice — one null and the button simply does nothing, with no error to
/// notice. Riverpod already threads state through this tree.
class ShellIndex extends Notifier<int> {
  @override
  int build() => 0;

  void select(int value) => state = value;
}

final shellIndexProvider = NotifierProvider<ShellIndex, int>(ShellIndex.new);

/// Position of «الإعدادات» in the IndexedStack. It has no bar destination.
const int kSettingsIndex = 4;

class _HomeShellState extends ConsumerState<HomeShell> {


  /// «المستجدات» USED TO LIVE AT INDEX 2, with a seen/unseen badge and the
  /// bookkeeping that went with it. The feed is gone — both collections behind
  /// it are denied by firestore.rules — so the tab, its badge and the
  /// mark-as-seen call went with it, «السوق» took the slot, and
  /// `lib/features/updates/` has since been deleted entirely.
  void _select(int value) =>
      ref.read(shellIndexProvider.notifier).select(value);

  @override
  Widget build(BuildContext context) {
    // The shell is what keeps the sync controller alive. A Riverpod provider
    // nothing watches is never constructed, so this single line is the
    // difference between the cloud backup running and it being dead code —
    // which is what it was: the observer existed but was never referenced, so
    // no trade was ever uploaded.
    ref.watch(syncControllerProvider);

    final index = ref.watch(shellIndexProvider);

    // Watched here so the whole shell reflects a plan change the moment the
    // subscription lands, rather than only the screen that happens to be open.
    final entitlement = ref.watch(entitlementProvider);

    return Scaffold(
      body: Column(
        children: [
          Expanded(
            // IndexedStack, not a rebuild-on-switch: it preserves scroll
            // position and half-typed calculator input across tab changes.
            child: IndexedStack(
              index: index,
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
                const StocksScreen(),
                const CalculatorScreen(),
                const SettingsScreen(),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
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
          // «الأسهم» sits between «السوق» and the calculator on BOTH surfaces —
          // the two market-facing destinations together, then the tools. SECTIONS
          // in customer-dashboard.tsx carries the same five in the same order.
          const NavigationDestination(
            icon: Icon(Icons.candlestick_chart_outlined),
            selectedIcon: Icon(Icons.candlestick_chart),
            label: 'الأسهم',
          ),
          const NavigationDestination(
            icon: Icon(Icons.calculate_outlined),
            selectedIcon: Icon(Icons.calculate),
            label: 'حاسبة الصفقة',
          ),
        ],
      ),
    );
  }
}

/// The settings gear every screen puts in ITS OWN AppBar.
///
/// ── WHY IT IS NOT A DESTINATION IN THE BAR BELOW ──────────────────────────
///
/// Five destinations on a 360px phone give each about 68px, and «حاسبة الصفقة»
/// does not fit — the label truncates, and a truncated label in a nav bar is a
/// destination people stop recognising. Settings is the one that can leave:
/// opened rarely, conventionally a gear in a header anyway, and the only one of
/// the five outside the daily loop. `customer-dashboard.tsx` does the same below
/// its `sm` breakpoint and keeps all five in the row on desktop.
///
/// ── AND WHY IT IS NOT ONE AppBar ON THE SHELL ─────────────────────────────
///
/// Every screen in the IndexedStack is its own Scaffold with its own AppBar —
/// the hub's carries the TabBar, the stocks screen's carries the sort toggle. A
/// Scaffold inside a Scaffold's body renders BOTH bars, stacked. So the shell
/// hands each screen this widget instead of imposing a bar none of them can use.
const Key settingsActionKey = ValueKey('settings-action');

class SettingsAction extends ConsumerWidget {
  const SettingsAction({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return IconButton(
      // Keyed so tests can reach the visible one: the shell's IndexedStack
      // builds every screen, so this widget exists once per destination and only
      // one of them is on screen. `find.byKey(...).hitTestable()` picks it.
      key: settingsActionKey,
      icon: const Icon(Icons.settings_outlined),
      tooltip: 'الإعدادات',
      onPressed: () =>
          { debugPrint('GEAR TAPPED'); ref.read(shellIndexProvider.notifier).select(kSettingsIndex); },
    );
  }
}
