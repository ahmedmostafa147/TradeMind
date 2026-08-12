import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../billing/billing_providers.dart';
import '../billing/entitlements.dart';
import '../billing/widgets/paywall.dart';
import '../calculator/calculator_screen.dart';
import '../dashboard/goal_screen.dart';
import '../features/market/screens/market_screen.dart';
import '../features/market/screens/stocks_screen.dart';
import '../features/sync/providers/sync_provider.dart';
import '../settings/settings_screen.dart';
import 'trades_hub_screen.dart';

class ShellIndex extends Notifier<int> {
  @override
  int build() => 0;

  void select(int value) => state = value;
}

final shellIndexProvider = NotifierProvider<ShellIndex, int>(ShellIndex.new);

const int kSettingsIndex = 5;

class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key});

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  void _select(int value) =>
      ref.read(shellIndexProvider.notifier).select(value);

  @override
  Widget build(BuildContext context) {
    ref.watch(syncControllerProvider);

    final index = ref.watch(shellIndexProvider);
    final entitlement = ref.watch(entitlementProvider);

    return Scaffold(
      body: Column(
        children: [
          Expanded(
            child: IndexedStack(
              index: index,
              children: [
                const TradesHubScreen(),
                if (entitlement.can(Feature.marketFlows))
                  const MarketScreen()
                else
                  const Paywall(
                    title: 'السوق',
                    what: 'مين اشترى ومين باع في كل جلسة — بيانات وأسهم البورصة المصرية.',
                  ),
                const StocksScreen(),
                const CalculatorScreen(),
                const GoalScreen(),
                const SettingsScreen(),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index > 4 ? 0 : index,
        onDestinationSelected: _select,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long),
            label: 'صفقاتي',
          ),
          NavigationDestination(
            icon: Icon(Icons.insights_outlined),
            selectedIcon: Icon(Icons.insights),
            label: 'السوق',
          ),
          NavigationDestination(
            icon: Icon(Icons.candlestick_chart_outlined),
            selectedIcon: Icon(Icons.candlestick_chart),
            label: 'الأسهم',
          ),
          NavigationDestination(
            icon: Icon(Icons.calculate_outlined),
            selectedIcon: Icon(Icons.calculate),
            label: 'حاسبة الصفقة',
          ),
          NavigationDestination(
            icon: Icon(Icons.flag_outlined),
            selectedIcon: Icon(Icons.flag),
            label: 'الهدف',
          ),
        ],
      ),
    );
  }
}

const Key settingsActionKey = ValueKey('settings-action');

class SettingsAction extends ConsumerWidget {
  const SettingsAction({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return IconButton(
      key: settingsActionKey,
      icon: const Icon(Icons.settings_outlined),
      tooltip: 'الإعدادات',
      onPressed: () => ref.read(shellIndexProvider.notifier).select(kSettingsIndex),
    );
  }
}
