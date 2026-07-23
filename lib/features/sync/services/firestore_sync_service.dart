import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';

import '../../../trades/trade.dart';
import '../../../watchlist/watchlist_item.dart';
import 'sync_codec.dart';

/// Cloud backup for the journal.
///
/// Both directions live here. The upload-only version this replaces could never
/// have protected anyone: with no download path, reinstalling the app lost
/// everything no matter how faithfully it had been backed up.
class FirestoreSyncService {
  const FirestoreSyncService._();

  static bool get _available => Firebase.apps.isNotEmpty;

  static FirebaseFirestore get _db => FirebaseFirestore.instance;

  /// A user id that owns no cloud data. Guarding on it keeps guest records out
  /// of Firestore entirely.
  static bool _rejects(String userId) =>
      !_available || userId.isEmpty || userId == 'guest';

  static CollectionReference<Map<String, dynamic>> _trades(String userId) =>
      _db.collection('users').doc(userId).collection('trades');

  static CollectionReference<Map<String, dynamic>> _watchlist(String userId) =>
      _db.collection('users').doc(userId).collection('watchlist');

  // ---------------------------------------------------------------------------
  // Upload
  // ---------------------------------------------------------------------------

  /// Writes every trade in one batch.
  ///
  /// Batched rather than a write per record: the previous per-item loop fired
  /// one request for every trade on every change to any trade, which is both
  /// slow and a direct multiplier on the Firestore bill.
  static Future<void> pushTrades(String userId, List<Trade> trades) async {
    if (_rejects(userId) || trades.isEmpty) return;
    try {
      final batch = _db.batch();
      for (final trade in trades) {
        batch.set(
          _trades(userId).doc(trade.id),
          {
            ...SyncCodec.tradeToMap(trade),
            'updatedAt': FieldValue.serverTimestamp(),
          },
          SetOptions(merge: true),
        );
      }
      await batch.commit();
    } catch (_) {
      // Backup is best-effort; the local journal remains the source of truth.
    }
  }

  static Future<void> pushWatchlist(
    String userId,
    List<WatchlistItem> items,
  ) async {
    if (_rejects(userId) || items.isEmpty) return;
    try {
      final batch = _db.batch();
      for (final item in items) {
        batch.set(
          _watchlist(userId).doc(item.id),
          {
            ...SyncCodec.watchlistToMap(item),
            'updatedAt': FieldValue.serverTimestamp(),
          },
          SetOptions(merge: true),
        );
      }
      await batch.commit();
    } catch (_) {}
  }

  static Future<void> deleteTrade(String userId, String tradeId) async {
    if (_rejects(userId)) return;
    try {
      await _trades(userId).doc(tradeId).delete();
    } catch (_) {}
  }

  static Future<void> deleteWatchlistItem(String userId, String itemId) async {
    if (_rejects(userId)) return;
    try {
      await _watchlist(userId).doc(itemId).delete();
    } catch (_) {}
  }

  // ---------------------------------------------------------------------------
  // Download — the half that makes the backup worth having
  // ---------------------------------------------------------------------------

  /// Every trade stored for this user. Returns empty on any failure, which the
  /// caller must treat as "nothing to restore", never as "delete local data".
  static Future<List<Trade>> pullTrades(String userId) async {
    if (_rejects(userId)) return const [];
    try {
      final snapshot = await _trades(userId).get();
      return [
        for (final doc in snapshot.docs) ?_decodeTrade(doc.data()),
      ];
    } catch (_) {
      return const [];
    }
  }

  static Future<List<WatchlistItem>> pullWatchlist(String userId) async {
    if (_rejects(userId)) return const [];
    try {
      final snapshot = await _watchlist(userId).get();
      return [
        for (final doc in snapshot.docs) ?_decodeWatchlistItem(doc.data()),
      ];
    } catch (_) {
      return const [];
    }
  }

  /// One malformed document must not abort the whole restore, so decoding is
  /// per-record and a failure drops just that record.
  static Trade? _decodeTrade(Map<String, dynamic> data) {
    try {
      return SyncCodec.tradeFromMap(data);
    } catch (_) {
      return null;
    }
  }

  static WatchlistItem? _decodeWatchlistItem(Map<String, dynamic> data) {
    try {
      return SyncCodec.watchlistFromMap(data);
    } catch (_) {
      return null;
    }
  }
}
