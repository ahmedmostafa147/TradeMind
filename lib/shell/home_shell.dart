import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../billing/billing_providers.dart';
import '../billing/entitlements.dart';
import '../billing/widgets/paywall.dart';
import '../calculator/calculator_screen.dart';
import '../dashboard/goal_screen.dart';
import '../features/auth/providers/auth_providers.dart';
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
    final user = ref.watch(authProvider);
    final isDesktop = (kIsWeb || TargetPlatform.windows == defaultTargetPlatform) &&
        MediaQuery.of(context).size.width >= 900;

    final body = IndexedStack(
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
    );

    if (isDesktop) {
      final initial = user.name.isNotEmpty
          ? user.name.substring(0, 1)
          : (user.email.isNotEmpty ? user.email.substring(0, 1) : 'أ');

      return Scaffold(
        body: Row(
          children: [
            NavigationRail(
              selectedIndex: index > 4 ? 0 : index,
              onDestinationSelected: _select,
              labelType: NavigationRailLabelType.all,
              leading: Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: CircleAvatar(
                  radius: 20,
                  backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                  child: Text(initial),
                ),
              ),
              trailing: Expanded(
                child: Align(
                  alignment: Alignment.bottomCenter,
                  child: IconButton(
                    icon: const Icon(Icons.logout_rounded),
                    tooltip: 'تسجيل الخروج',
                    onPressed: () => ref.read(authProvider.notifier).logout(),
                  ),
                ),
              ),
              destinations: const [
                NavigationRailDestination(
                  icon: Icon(Icons.receipt_long_outlined),
                  selectedIcon: Icon(Icons.receipt_long),
                  label: Text('صفقاتي'),
                ),
                NavigationRailDestination(
                  icon: Icon(Icons.insights_outlined),
                  selectedIcon: Icon(Icons.insights),
                  label: Text('السوق'),
                ),
                NavigationRailDestination(
                  icon: Icon(Icons.candlestick_chart_outlined),
                  selectedIcon: Icon(Icons.candlestick_chart),
                  label: Text('الأسهم'),
                ),
                NavigationRailDestination(
                  icon: Icon(Icons.calculate_outlined),
                  selectedIcon: Icon(Icons.calculate),
                  label: Text('حاسبة الصفقة'),
                ),
                NavigationRailDestination(
                  icon: Icon(Icons.track_changes_outlined),
                  selectedIcon: Icon(Icons.track_changes),
                  label: Text('الهدف'),
                ),
              ],
            ),
            const VerticalDivider(thickness: 1, width: 1),
            Expanded(child: body),
          ],
        ),
      );
    }

    return Scaffold(
      body: body,
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
            icon: Icon(Icons.track_changes_outlined),
            selectedIcon: Icon(Icons.track_changes),
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
