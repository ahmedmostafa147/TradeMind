import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../billing/cubit/billing_cubit.dart';
import '../billing/entitlements.dart';
import '../billing/widgets/paywall.dart';
import '../calculator/calculator_screen.dart';
import '../dashboard/goal_screen.dart';
import '../features/auth/cubit/auth_cubit.dart';
import '../features/auth/models/user_account.dart';
import '../features/market/screens/market_screen.dart';
import '../features/market/screens/stocks_screen.dart';
import '../settings/settings_screen.dart';
import 'shell_cubit.dart';
import 'trades_hub_screen.dart';

/// The four-destination frame the whole journal lives in.
///
/// It used to `ref.watch(syncControllerProvider)` here — mounting the two-way
/// Hive/Firestore sync by being built. There is one store now, so there is
/// nothing to reconcile and nothing to mount: the cubits follow the account
/// from `main`, and every screen below reads the same stream they do.
class HomeShell extends StatelessWidget {
  const HomeShell({super.key});

  @override
  Widget build(BuildContext context) {
    void select(int value) => context.read<ShellCubit>().select(value);

    final index = context.watch<ShellCubit>().state;
    final entitlement = context.watch<BillingCubit>().state.entitlement;
    final user = context.watch<AuthCubit>().account ?? UserAccount.guest;
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
              onDestinationSelected: select,
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
                    onPressed: context.read<AuthCubit>().logout,
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
        onDestinationSelected: select,
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

class SettingsAction extends StatelessWidget {
  const SettingsAction({super.key});

  @override
  Widget build(BuildContext context) {
    return IconButton(
      key: settingsActionKey,
      icon: const Icon(Icons.settings_outlined),
      tooltip: 'الإعدادات',
      onPressed: () => context.read<ShellCubit>().select(kSettingsIndex),
    );
  }
}
