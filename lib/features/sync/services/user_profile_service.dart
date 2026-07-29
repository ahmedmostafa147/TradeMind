import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

import '../../../core/app_version.dart';
import '../../auth/models/user_account.dart';

/// Writes the `users/{uid}` profile document.
///
/// WHY THIS EXISTS
/// [FirestoreSyncService] only ever wrote the `trades` and `watchlist`
/// SUBcollections. Firestore does not create a parent document when a
/// subcollection is written — `users/{uid}` showed in the console as a
/// greyed-out placeholder and matched no query. So there was no user list
/// anywhere: not in Firestore, and not reachable from a static site, since
/// enumerating Firebase Auth needs the Admin SDK on a server.
///
/// This is the record the admin dashboard counts and lists.
///
/// It deliberately carries NO trade content — only counters. An admin can see
/// that someone logged 40 trades without being able to read one of them, which
/// is the line the Firestore rules draw and the privacy policy states.
class UserProfileService {
  const UserProfileService._();

  static bool get _available => Firebase.apps.isNotEmpty;

  static bool _rejects(String userId) =>
      !_available || userId.isEmpty || userId == 'guest';

  static DocumentReference<Map<String, dynamic>> _doc(String userId) =>
      FirebaseFirestore.instance.collection('users').doc(userId);

  /// Creates or refreshes the profile. Called on sign-in and on sign-up.
  ///
  /// `createdAt` is written only when the document does not exist yet, so a
  /// later sign-in cannot reset a user's join date — which would quietly
  /// corrupt every retention figure the dashboard shows.
  ///
  /// Best-effort, like the rest of sync: a failure here must never block a
  /// sign-in that Firebase already accepted.
  static Future<void> upsert(UserAccount account) async {
    if (_rejects(account.id)) return;
    try {
      await _doc(account.id).set({
        'email': account.email,
        'displayName': account.name,
        'lastSeenAt': FieldValue.serverTimestamp(),
        'platform': defaultTargetPlatform.name,
        'appVersion': kAppVersion,
        // set() with merge would overwrite createdAt on every sign-in;
        // FieldValue is not conditional, so the guard is the read below.
      }, SetOptions(merge: true));

      final snapshot = await _doc(account.id).get();
      if (snapshot.data()?['createdAt'] == null) {
        await _doc(account.id).set({
          'createdAt': FieldValue.serverTimestamp(),
        }, SetOptions(merge: true));
      }
    } catch (_) {
      // Profile writes are telemetry for the operator, not something the user
      // asked for. Failing one must not surface as a sign-in error.
    }
  }

  /// Updates the activity counters the dashboard sorts and filters on.
  ///
  /// Counts, never content. This is what lets the operator tell an active user
  /// from a dormant one without the rules ever granting a trade read.
  static Future<void> updateCounts(
    String userId, {
    required int tradeCount,
    required int watchlistCount,
  }) async {
    if (_rejects(userId)) return;
    try {
      await _doc(userId).set({
        'tradeCount': tradeCount,
        'watchlistCount': watchlistCount,
        'lastSeenAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));
    } catch (_) {}
  }
}
