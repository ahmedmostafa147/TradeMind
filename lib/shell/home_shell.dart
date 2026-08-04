import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../calculator/calculator_screen.dart';
import '../features/sync/providers/sync_provider.dart';
import '../features/updates/providers/posts_providers.dart';
import '../features/updates/screens/updates_screen.dart';
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

  /// Position of «المستجدات» in both lists below. Named rather than written as
  /// a bare 2 in `_select`, because the two lists have to stay in step and a
  /// loose index is the easiest thing to forget when a destination is added.
  static const int _updatesIndex = 2;

  /// Switches tab, and marks the feed read when that tab is the updates one.
  ///
  /// This belongs to the shell because only the shell knows which screen the
  /// user is actually looking at: IndexedStack builds all four children at
  /// launch, so the screen itself cannot tell being mounted from being opened.
  /// Doing it there marked every post read before the user had seen the badge.
  void _select(int value) {
    setState(() => _index = value);
    if (value == _updatesIndex) {
      // Deliberately not awaited: the badge clears from the notifier's own
      // state change, and holding a tab switch on a disk write would make the
      // bar feel like it stuck.
      ref.read(lastSeenPostsProvider.notifier).markSeen();
    }
  }

  @override
  Widget build(BuildContext context) {
    // The shell is what keeps the sync controller alive. A Riverpod provider
    // nothing watches is never constructed, so this single line is the
    // difference between the cloud backup running and it being dead code —
    // which is what it was: the observer existed but was never referenced, so
    // no trade was ever uploaded.
    ref.watch(syncControllerProvider);

    final unseen = ref.watch(unseenPostsProvider);

    return Scaffold(
      // IndexedStack, not a rebuild-on-switch: it preserves scroll position and
      // half-typed calculator input across tab changes.
      body: IndexedStack(
        index: _index,
        children: const [
          TradesHubScreen(),
          CalculatorScreen(),
          UpdatesScreen(),
          SettingsScreen(),
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
            icon: Icon(Icons.calculate_outlined),
            selectedIcon: Icon(Icons.calculate),
            label: 'حاسبة الصفقة',
          ),
          NavigationDestination(
            // The count rides on the unselected icon only. Once the tab is
            // open the screen marks everything seen, so a badge over the
            // selected icon would be stating something already false.
            icon: Badge(
              isLabelVisible: unseen > 0,
              label: Text('$unseen'),
              child: const Icon(Icons.campaign_outlined),
            ),
            selectedIcon: const Icon(Icons.campaign),
            label: 'المستجدات',
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
