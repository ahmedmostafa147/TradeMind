import 'package:cloud_firestore/cloud_firestore.dart';

import '../features/sync/services/sync_codec.dart';
import '../trades/trade.dart';

/// The journal, read straight from Firestore. One store, no second copy.
///
/// ── WHY THIS REPLACES A HIVE BOX AND A THREE-WAY MERGE ─────────────────────
///
/// The journal used to live in a Hive box AND in Firestore, which meant the two
/// could disagree, which meant there had to be code to decide who wins. That
/// code was real: a recorded-ancestor merge with content fingerprints, because
/// `updatedAt` could not be trusted — it was rewritten on every sync, and a
/// client with a wrong clock would have pinned its own edits as newest forever.
/// It came with a documented hole nobody could close: a record deleted on the
/// phone came back, because "deleted" and "this device has never seen it" are
/// indistinguishable without tombstones.
///
/// None of that has anything to say once there is a single store. There is no
/// divergence to reconcile, so there is no winner to pick, and a delete is a
/// delete. The merge, the fingerprints and the `syncState` box are removed with
/// this, not ported.
///
/// ── WHAT IT COSTS, STATED PLAINLY ──────────────────────────────────────────
///
/// Every read is now a Firestore read. The Firestore SDK keeps its own on-device
/// cache and it stays ON: that is not a second store — it is the same documents,
/// with the server still the only source of truth — and turning it off would
/// turn a weak signal into a blank journal instead of the last known one.
class TradeRepository {
  final FirebaseFirestore _db;

  const TradeRepository(this._db);

  CollectionReference<Map<String, dynamic>> _collection(String userId) =>
      _db.collection('users').doc(userId).collection('trades');

  /// The live journal. Emits on every change, local or remote.
  ///
  /// Sorting happens here rather than in the query, and deliberately: entry
  /// dates are date-only so ties are common, `List.sort` is not stable, and a
  /// list that reshuffles between rebuilds is a bug users report as "my trades
  /// keep jumping". The id tie-break makes the order total. Ordering server-side
  /// would also force a composite index for a list that is never paginated.
  Stream<List<Trade>> watch(String userId) =>
      _collection(userId).snapshots().map(_decode);

  /// One read, for the paths that are not listening — CSV export, account
  /// deletion, anything that runs once and finishes.
  Future<List<Trade>> fetch(String userId) async =>
      _decode(await _collection(userId).get());

  List<Trade> _decode(QuerySnapshot<Map<String, dynamic>> snapshot) {
    final trades = <Trade>[];
    for (final doc in snapshot.docs) {
      // A document that cannot be decoded is SKIPPED, not thrown on. One
      // malformed record — a field written by a future build, a half-finished
      // write — must not take the whole journal down with it, because the
      // journal is the product.
      try {
        // `keepScreenshots: true` because THIS DEVICE IS NOW THE ONLY READER
        // OF ITS OWN JOURNAL.
        //
        // The flag defaults to false and the codec says why: the paths are
        // absolute locations inside one phone's documents directory, so
        // restoring them onto a different phone yields paths to nothing. That
        // default was right while the sync RESTORED into a Hive box that
        // already held the real paths — dropping them there kept the local
        // copy and lost nothing.
        //
        // With the box gone there is no local copy to fall back on, so
        // dropping them here would delete every chart attachment on the next
        // read, and quietly cost 20 points of discipline score per trade.
        //
        // The cost of keeping them is the case the old default guarded: on a
        // SECOND device the paths resolve to nothing and the score counts
        // attachments that are not there. That is a real regression, it is
        // the multi-device half of a feature that is already single-device,
        // and it is the strongest argument yet for moving attachments to
        // Firebase Storage — which is deferred by the owner, not forgotten.
        trades.add(SyncCodec.tradeFromMap(doc.data(), keepScreenshots: true));
      } catch (_) {
        continue;
      }
    }
    trades.sort((a, b) {
      final byDate = b.entryDate.compareTo(a.entryDate);
      return byDate != 0 ? byDate : b.id.compareTo(a.id);
    });
    return trades;
  }

  /// Creates or replaces one trade, keyed by `trade.id`.
  ///
  /// `merge: false` — a full replace, unlike the old sync path. That path merged
  /// because the browser wrote a partial map and a merge protected the fields it
  /// did not know about (§5: `screenshotPaths` was read and never written, and a
  /// merge kept the phone's copy alive). Here the map is the whole record from
  /// the same codec both surfaces use, so a merge would only preserve fields no
  /// current writer produces — which is how a schema quietly grows garbage.
  Future<void> save(String userId, Trade trade) =>
      _collection(userId).doc(trade.id).set(SyncCodec.tradeToMap(trade));

  /// Deletes one trade, and it stays deleted.
  ///
  /// Worth saying out loud because it was not true before: with a local box in
  /// the picture, a delete on the phone was undone by the next sync.
  Future<void> delete(String userId, String tradeId) =>
      _collection(userId).doc(tradeId).delete();
}
