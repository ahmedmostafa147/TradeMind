// `hide Settings` because cloud_firestore exports a `Settings` of its own — the
// SDK's cache/host configuration — and this file means the app's risk rule.
import 'package:cloud_firestore/cloud_firestore.dart' hide Settings;
import 'package:firebase_core/firebase_core.dart';

import '../../../settings/settings.dart';
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

  /// A subcollection holding exactly one document, rather than three fields on
  /// the profile — the profile is the one document an admin may read, and
  /// capital is a user's portfolio size. See the note in firestore.rules.
  static CollectionReference<Map<String, dynamic>> _settings(String userId) =>
      _db.collection('users').doc(userId).collection('settings');

  /// The single settings document's id. Fixed, so the write is an idempotent
  /// overwrite instead of accumulating one document per save.
  static const String _riskSettingsDoc = 'risk';

  // ---------------------------------------------------------------------------
  // Upload
  // ---------------------------------------------------------------------------

  /// Writes every trade in one batch.
  ///
  /// Batched rather than a write per record: the previous per-item loop fired
  /// one request for every trade on every change to any trade, which is both
  /// slow and a direct multiplier on the Firestore bill.
  /// Returns whether the write actually landed, so the caller can decide
  /// whether to record these records as agreed with the cloud. It used to
  /// swallow the failure and return void, which was fine when the only
  /// consequence was "the backup is a bit behind" — it is not fine now that a
  /// successful push is what advances the merge's ancestor.
  static Future<bool> pushTrades(String userId, List<Trade> trades) async {
    if (_rejects(userId)) return false;
    if (trades.isEmpty) return true;
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
      return true;
    } catch (_) {
      // Backup is best-effort; the local journal remains the source of truth.
      return false;
    }
  }

  static Future<bool> pushWatchlist(
    String userId,
    List<WatchlistItem> items,
  ) async {
    if (_rejects(userId)) return false;
    if (items.isEmpty) return true;
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
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Uploads the risk rule. Best-effort like the rest of the upload path.
  ///
  /// `merge: false` — the whole document is three values written together, and
  /// merging would leave a field the rules have since tightened sitting in a
  /// document the next write believes it replaced.
  static Future<void> pushRiskSettings(String userId, Settings settings) async {
    if (_rejects(userId)) return;
    try {
      await _settings(userId)
          .doc(_riskSettingsDoc)
          .set(SyncCodec.riskSettingsToMap(settings));
    } catch (_) {
      // The local Hive copy stays authoritative for this device either way.
    }
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

  /// Erases everything stored for [userId].
  ///
  /// This is the one method here that **throws on failure** instead of treating
  /// the cloud as best-effort. Everywhere else a swallowed error costs a backup
  /// the local journal can rebuild; here it would leave a user who asked to be
  /// forgotten with their trades still on the server while the app said they
  /// were gone. The caller deletes the identity only after this returns, so a
  /// throw keeps the account — and therefore the only credential that can reach
  /// this data — alive to try again.
  ///
  /// Documents go in batches because Firestore caps one batch at 500 writes.
  static Future<void> deleteAllData(String userId) async {
    if (_rejects(userId)) return;

    // `settings` is in this list because the privacy policy promises the whole
    // account goes, and capital is personal financial data. Leaving it behind
    // would strand a document nobody can ever reach again — its only reader is
    // an owner who is about to stop existing.
    for (final collection in [
      _trades(userId),
      _watchlist(userId),
      _settings(userId),
    ]) {
      final snapshot = await collection.get();
      const chunkSize = 400;
      for (var i = 0; i < snapshot.docs.length; i += chunkSize) {
        final batch = _db.batch();
        for (final doc in snapshot.docs.skip(i).take(chunkSize)) {
          batch.delete(doc.reference);
        }
        await batch.commit();
      }
    }
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

  /// The account's risk rule, applied onto [current].
  ///
  /// Returns [current] untouched when there is nothing stored yet — an account
  /// that predates this feature, or a read that failed. Never the class
  /// defaults: resetting a configured capital to 17,000 because a request timed
  /// out would change every discipline score on the device.
  static Future<Settings> pullRiskSettings(
    String userId, {
    required Settings current,
  }) async {
    if (_rejects(userId)) return current;
    try {
      final snapshot = await _settings(userId).doc(_riskSettingsDoc).get();
      final data = snapshot.data();
      if (data == null) return current;
      return SyncCodec.riskSettingsFromMap(data, onto: current);
    } catch (_) {
      return current;
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
