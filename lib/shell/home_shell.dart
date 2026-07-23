import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../calculator/calculator_screen.dart';
import '../dashboard/dashboard_screen.dart';
import '../features/sync/providers/sync_provider.dart';
import '../settings/settings_screen.dart';
import '../today/today_screen.dart';
import '../trades/trades_screen.dart';

/// Five destinations is the top of the 3–5 range bottom navigation is built
/// for. A drawer would hide every primary surface behind a gesture that also
/// collides with Android's right-edge back swipe under RTL. NavigationBar
/// mirrors itself automatically, so قرار اليوم lands rightmost with no work.
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
          TodayScreen(),
          CalculatorScreen(),
          TradesScreen(),
          DashboardScreen(),
          SettingsScreen(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.today_outlined),
            selectedIcon: Icon(Icons.today),
            label: 'قرار اليوم',
          ),
          NavigationDestination(
            icon: Icon(Icons.calculate_outlined),
            selectedIcon: Icon(Icons.calculate),
            label: 'حاسبة الصفقة',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long),
            label: 'سجل الصفقات',
          ),
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'لوحة التحكم',
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
