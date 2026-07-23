import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../trades/trade.dart';
import '../../../watchlist/watchlist_item.dart';

/// Cloud Firestore synchronization service for backing up user trades & data.
class FirestoreSyncService {
  static FirebaseFirestore get _db => FirebaseFirestore.instance;

  /// Syncs single trade to Firestore user collection.
  static Future<void> syncTrade(String userId, Trade trade) async {
    if (userId.isEmpty || userId == 'guest') return;
    try {
      await _db
          .collection('users')
          .doc(userId)
          .collection('trades')
          .doc(trade.id)
          .set({
        'id': trade.id,
        'ticker': trade.ticker,
        'reason': trade.reason,
        'entryPrice': trade.entryPrice,
        'stopPrice': trade.stopPrice,
        'quantity': trade.quantity,
        'entryDate': trade.entryDate.toIso8601String(),
        'exitPrice': trade.exitPrice,
        'exitDate': trade.exitDate?.toIso8601String(),
        'notes': trade.notes,
        'status': trade.status.name,
        'tags': trade.tags,
        'isFavorite': trade.isFavorite,
        'takeProfitPrice': trade.takeProfitPrice,
        'source': trade.source,
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));
    } catch (_) {}
  }

  /// Delete trade from Firestore.
  static Future<void> deleteTrade(String userId, String tradeId) async {
    if (userId.isEmpty || userId == 'guest') return;
    try {
      await _db
          .collection('users')
          .doc(userId)
          .collection('trades')
          .doc(tradeId)
          .delete();
    } catch (_) {}
  }

  /// Sync watchlist item to Firestore.
  static Future<void> syncWatchlistItem(
      String userId, WatchlistItem item) async {
    if (userId.isEmpty || userId == 'guest') return;
    try {
      await _db
          .collection('users')
          .doc(userId)
          .collection('watchlist')
          .doc(item.id)
          .set({
        'id': item.id,
        'ticker': item.ticker,
        'targetBuyPrice': item.targetBuyPrice,
        'stopPrice': item.stopPrice,
        'reason': item.reason,
        'priority': item.priority.name,
        'dateAdded': item.dateAdded.toIso8601String(),
        'source': item.source,
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));
    } catch (_) {}
  }

  /// Delete watchlist item from Firestore.
  static Future<void> deleteWatchlistItem(
      String userId, String itemId) async {
    if (userId.isEmpty || userId == 'guest') return;
    try {
      await _db
          .collection('users')
          .doc(userId)
          .collection('watchlist')
          .doc(itemId)
          .delete();
    } catch (_) {}
  }
}
