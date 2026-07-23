import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../trades/trades_providers.dart';
import '../../../watchlist/watchlist_providers.dart';
import '../../auth/providers/auth_providers.dart';
import '../services/firestore_sync_service.dart';

/// Background auto-sync observer linking local trades and watchlist with Firestore.
final syncObserverProvider = Provider<void>((ref) {
  final user = ref.watch(authProvider);
  if (!user.isLoggedIn || user.id == 'guest') return;

  // Listen to trades changes and auto-sync
  ref.listen(tradesProvider, (previous, next) {
    for (final trade in next) {
      FirestoreSyncService.syncTrade(user.id, trade);
    }
  });

  // Listen to watchlist changes and auto-sync
  ref.listen(watchlistProvider, (previous, next) {
    for (final item in next) {
      FirestoreSyncService.syncWatchlistItem(user.id, item);
    }
  });
});
