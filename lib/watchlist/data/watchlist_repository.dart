import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';

import '../../features/sync/services/sync_codec.dart';
import '../watchlist_item.dart';

/// The watchlist, read straight from Firestore. Same shape as
/// [TradeRepository], same reasoning: one store, so nothing to reconcile.
class WatchlistRepository {
  final FirebaseFirestore _db;

  const WatchlistRepository(this._db);

  CollectionReference<Map<String, dynamic>> _collection(String userId) =>
      _db.collection('users').doc(userId).collection('watchlist');

  Stream<List<WatchlistItem>> watch(String userId) =>
      _collection(userId).snapshots().map(_decode);

  Future<List<WatchlistItem>> fetch(String userId) async =>
      _decode(await _collection(userId).get());

  /// Highest priority first, then newest.
  ///
  /// Ordered here rather than in the query for the same reason the journal is:
  /// `List.sort` is not stable and same-day additions collide constantly, so
  /// without the id tie-break the list reshuffles between rebuilds.
  List<WatchlistItem> _decode(QuerySnapshot<Map<String, dynamic>> snapshot) {
    final items = <WatchlistItem>[];
    for (final doc in snapshot.docs) {
      // Skipped, but never silently — §13. One malformed document must not take
      // the whole watchlist down, and an item that vanishes with nothing
      // anywhere explaining why is its own bug.
      try {
        items.add(SyncCodec.watchlistFromMap(doc.data()));
      } catch (error) {
        debugPrint('Skipped an unreadable watchlist item (${doc.id}): $error');
      }
    }
    items.sort((a, b) {
      final byPriority = a.priority.rank.compareTo(b.priority.rank);
      if (byPriority != 0) return byPriority;
      final byDate = b.dateAdded.compareTo(a.dateAdded);
      return byDate != 0 ? byDate : a.id.compareTo(b.id);
    });
    return items;
  }

  Future<void> save(String userId, WatchlistItem item) =>
      _collection(userId).doc(item.id).set(SyncCodec.watchlistToMap(item));

  Future<void> delete(String userId, String itemId) =>
      _collection(userId).doc(itemId).delete();
}
