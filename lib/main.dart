import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_ce_flutter/hive_flutter.dart';

import 'app.dart';
import 'core/hive_keys.dart';
import 'features/auth/providers/auth_providers.dart';
import 'features/auth/repositories/auth_repository.dart';
import 'settings/settings_providers.dart';
import 'trades/timeline_entry_adapter.dart';
import 'trades/trade.dart';
import 'trades/trade_adapter.dart';
import 'trades/trades_providers.dart';
import 'watchlist/watchlist_item.dart';
import 'watchlist/watchlist_item_adapter.dart';
import 'watchlist/watchlist_providers.dart';

Future<void> main() async {
  // Order matters: ensureInitialized before path_provider is touched, and the
  // adapter must be registered BEFORE the typed box is opened or open() throws.
  WidgetsFlutterBinding.ensureInitialized();

  try {
    await Hive.initFlutter();
    // TimelineEntry is nested inside Trade, so its adapter must be registered
    // too — Trade's own read() would otherwise fail to decode field 15.
    Hive.registerAdapter(TimelineEntryAdapter());
    Hive.registerAdapter(TradeAdapter());
    Hive.registerAdapter(WatchlistItemAdapter());

    final settingsBox = await Hive.openBox(kSettingsBox);
    final tradesBox = await Hive.openBox<Trade>(kTradesBox);
    final watchlistBox = await Hive.openBox<WatchlistItem>(kWatchlistBox);
    final authBox = await Hive.openBox(kAuthBox);

    runApp(
      ProviderScope(
        overrides: [
          settingsBoxProvider.overrideWithValue(settingsBox),
          tradesBoxProvider.overrideWithValue(tradesBox),
          watchlistBoxProvider.overrideWithValue(watchlistBox),
          authBoxProvider.overrideWithValue(authBox),
          authProvider.overrideWith(() => AuthRepository(authBox)),
        ],
        child: const EgxJournalApp(),
      ),
    );
  } catch (error) {
    runApp(StorageFailureApp(error));
  }
}
