import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';

/// What is left of the sync service: deletion, and billing.
///
/// ── IT USED TO CARRY THE JOURNAL IN BOTH DIRECTIONS ────────────────────────
///
/// Push and pull for trades, the watchlist and the risk settings all lived
/// here, because the journal lived in a Hive box AND in Firestore and something
/// had to reconcile them. There is one store now, and the repositories in
/// `lib/*/data/` read and write it directly — so those eight methods went with
/// the merge they existed to feed.
///
/// The two jobs that remain are the two that were never about syncing:
///
///   · **[deleteAllData]** — erasing an account has to reach every
///     subcollection under `users/{uid}`, including ones no repository owns.
///     `test/account_deletion_test.dart` holds it to that list.
///   · **the billing document** — read once per launch rather than watched, and
///     written only by the trial's one self-service create.
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

  /// Subscription state. One document, `subscription`.
  static CollectionReference<Map<String, dynamic>> _billing(String userId) =>
      _db.collection('users').doc(userId).collection('billing');

  // ---------------------------------------------------------------------------
  // Upload
  // ---------------------------------------------------------------------------

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
    //
    // `billing` is here for the same promise, and Firestore does not cascade:
    // deleting users/{uid} leaves every subcollection under it intact and
    // unreachable. It would also be the one record of a deleted account that
    // an admin could still read, which the policy does not allow for.
    for (final collection in [
      _trades(userId),
      _watchlist(userId),
      _settings(userId),
      _billing(userId),
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

  /// The subscription document, or null when there is none yet.
  ///
  /// Returns the raw fields rather than an [Entitlement] so the pure decision
  /// in `lib/billing/entitlements.dart` stays the only place that interprets
  /// them — the browser reads the same three values and must reach the same
  /// answer.
  static Future<Map<String, dynamic>?> pullSubscription(String userId) async {
    if (_rejects(userId)) return null;
    try {
      final snapshot = await _billing(userId).doc('subscription').get();
      return snapshot.exists ? snapshot.data() : null;
    } catch (_) {
      return null;
    }
  }

  /// Whether the billing document can be READ at all.
  ///
  /// «مش موجود» and «مرفوض» both arrive at [pullSubscription] as null, and the
  /// difference between them is the difference between a fresh account and a
  /// deployment where `firestore.rules` was never pushed. In the second case
  /// EVERY account reads as free, no trial ever starts, and all four paid
  /// surfaces lock themselves — silently, because the denial is caught. This
  /// separates the two so the settings screen can say which one it is.
  ///
  /// Returns null when there is nothing to test against (no Firebase app, or a
  /// guest), so callers can tell "not applicable" from "denied".
  static Future<bool?> canReadSubscription(String userId) async {
    if (_rejects(userId)) return null;
    try {
      await _billing(userId).doc('subscription').get();
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Asks for the fourteen-day trial. Succeeds exactly once per account.
  ///
  /// The rules decide whether the ask is honest — the document must not exist,
  /// the plan must be `trial`, and `trialStartedAt` must equal the SERVER's
  /// clock. So a rejected write here is not an error worth surfacing: it means
  /// the trial was already granted, which is the state the caller wanted.
  static Future<void> startTrial(String userId) async {
    if (_rejects(userId)) return;
    try {
      await _billing(userId).doc('subscription').set({
        'plan': 'trial',
        'trialStartedAt': FieldValue.serverTimestamp(),
      });
    } catch (_) {
      // Already granted, or offline. Both are handled by the next read.
    }
  }
}
