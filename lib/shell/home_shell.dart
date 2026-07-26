import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../calculator/calculator_screen.dart';
import '../features/sync/providers/sync_provider.dart';
import '../settings/settings_screen.dart';
import 'trades_hub_screen.dart';

/// Three destinations, each a different job: look at my trades, plan a new
/// one, change my settings.
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

  @override
  Widget build(BuildContext context) {
    // The shell is what keeps the sync controller alive. A Riverpod provider
    // nothing watches is never constructed, so this single line is the
    // difference between the cloud backup running and it being dead code —
    // which is what it was: the observer existed but was never referenced, so
    // no trade was ever uploaded.
    ref.watch(syncControllerProvider);

    return Scaffold(
      // IndexedStack, not a rebuild-on-switch: it preserves scroll position and
      // half-typed calculator input across tab changes.
      body: IndexedStack(
        index: _index,
        children: const [
          TradesHubScreen(),
          CalculatorScreen(),
          SettingsScreen(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long),
            label: 'صفقاتي',
          ),
          NavigationDestination(
            icon: Icon(Icons.calculate_outlined),
            selectedIcon: Icon(Icons.calculate),
            label: 'حاسبة الصفقة',
          ),
          NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings),
            label: 'الإعدادات',
          ),
        ],
      ),
    );
  }
}
