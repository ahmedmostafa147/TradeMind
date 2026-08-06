import 'package:firebase_core/firebase_core.dart';
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
  WidgetsFlutterBinding.ensureInitialized();

  try {
    // Firebase is optional: the journal is local-first and must open with or
    // without it. A failure here is swallowed so the app still starts, but it
    // is logged rather than hidden — silently continuing is what made a missing
    // google-services.json look like a working sign-in for so long.
    //
    // `FirebaseAuthService.isAvailable` reads the outcome of this call, and the
    // login sheet tells the user plainly when it failed.
    try {
      await Firebase.initializeApp();
    } catch (error) {
      debugPrint(
        'Firebase init failed — sign-in and cloud backup are disabled. '
        'Add android/app/google-services.json to enable them. ($error)',
      );
    }

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
    // Opened here rather than injected: SyncController reaches for it through
    // Hive.isBoxOpen, so a test that never opens it simply syncs with no
    // recorded ancestor — which the merge already treats as "keep local".
    await Hive.openBox(kSyncStateBox);

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
