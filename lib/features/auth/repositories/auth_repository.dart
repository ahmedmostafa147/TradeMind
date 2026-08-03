import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_ce/hive.dart';

import '../../sync/services/firestore_sync_service.dart';
import '../../sync/services/user_profile_service.dart';
import '../models/user_account.dart';
import '../services/auth_exception.dart';
import '../services/firebase_auth_service.dart';
import '../services/google_auth_service.dart';

/// Owns the signed-in session: Firebase for identity, Hive for persistence.
///
/// A session is only ever created from a credential Firebase returned. There is
/// deliberately no local fallback that marks the user signed in when the
/// backend cannot be reached — the previous version had one, and because
/// Firebase is unconfigured on this build it meant *any* email and *any*
/// password produced a real, persisted session. If sign-in cannot be verified
/// this class throws and the user stays a guest.
class AuthRepository extends Notifier<UserAccount> {
  final Box _box;

  AuthRepository(Box box) : _box = box;

  static const _sessionKey = 'current_user';

  @override
  UserAccount build() {
    final data = _box.get(_sessionKey) as Map?;
    return UserAccount.fromMap(data);
  }

  /// Registers a new account. Throws [AuthException] if it fails.
  Future<void> signUp({
    required String name,
    required String email,
    required String password,
  }) async {
    final credential = await FirebaseAuthService.signUp(
      email: email,
      password: password,
      displayName: name,
    );

    final user = credential.user;
    if (user == null) {
      throw const AuthException(
        AuthFailure.unknown,
        'تم إنشاء الحساب بس تعذّر بدء الجلسة. جرّب تسجيل الدخول.',
      );
    }

    await _persist(
      UserAccount(
        id: user.uid,
        name: name,
        email: email.trim(),
        isLoggedIn: true,
        lastLogin: DateTime.now(),
      ),
    );
  }

  /// Signs in an existing account. Throws [AuthException] if it fails.
  Future<void> login({
    required String email,
    required String password,
    String? nameFallback,
  }) async {
    final credential = await FirebaseAuthService.signIn(
      email: email,
      password: password,
    );

    final user = credential.user;
    if (user == null) {
      throw const AuthException(
        AuthFailure.unknown,
        'تعذّر بدء الجلسة. جرّب تاني.',
      );
    }

    await _persist(
      UserAccount(
        id: user.uid,
        name: _displayName(user.displayName, nameFallback, email),
        email: user.email ?? email.trim(),
        isLoggedIn: true,
        lastLogin: DateTime.now(),
      ),
    );
  }

  /// Signs in with Google. Throws [AuthException] if it fails or is cancelled.
  Future<void> loginWithGoogle() async {
    final credential = await GoogleAuthService.signIn();

    final user = credential.user;
    if (user == null) {
      throw const AuthException(
        AuthFailure.unknown,
        'تعذّر بدء الجلسة. جرّب تاني.',
      );
    }

    await _persist(
      UserAccount(
        id: user.uid,
        name: _displayName(user.displayName, null, user.email ?? ''),
        email: user.email ?? '',
        isLoggedIn: true,
        lastLogin: DateTime.now(),
      ),
    );
  }

  /// Ends the session. Always clears local state, even if a remote sign-out
  /// fails — otherwise a network blip would leave the user stuck signed in.
  Future<void> logout() async {
    await FirebaseAuthService.signOut();
    await GoogleAuthService.signOut();
    await _box.delete(_sessionKey);
    state = UserAccount.guest;
  }

  /// Permanently deletes the account and everything stored against it.
  ///
  /// Google Play requires any app offering account creation to offer deletion
  /// too, in-app and from the web. This is the in-app half.
  ///
  /// Order matters and is not interchangeable: cloud data first, identity
  /// second. The Firestore rules key every document to the caller's own uid, so
  /// deleting the account first would strip the only credential that can reach
  /// the data and strand it on the server permanently. If the data delete
  /// throws, the account survives and the user can retry.
  ///
  /// "Cloud data" is BOTH halves: the `trades` and `watchlist` subcollections,
  /// and the `users/{uid}` profile document that holds the email, the display
  /// name and the activity counters. The profile used to be left behind — the
  /// account vanished, the journal vanished, and a document with the user's
  /// email stayed in Firestore forever, still listed in the operator's
  /// dashboard. That contradicted section 6 of the published privacy policy,
  /// the site's own /delete page, and Play's account-deletion requirement.
  ///
  /// [wipeLocalJournal] clears the on-device boxes as well. It is the caller's
  /// explicit choice, defaulted off: the local journal is not part of the
  /// account, may predate it, and is the user's only copy once the cloud one
  /// is gone.
  Future<void> deleteAccount({
    required bool wipeLocalJournal,
    required Future<void> Function() clearLocalJournal,
  }) async {
    final userId = state.id;

    await FirestoreSyncService.deleteAllData(userId);
    await UserProfileService.delete(userId);
    await FirebaseAuthService.deleteAccount();

    // Only after the identity is actually gone — an early wipe would destroy
    // the user's data on a delete that then failed.
    if (wipeLocalJournal) await clearLocalJournal();

    await GoogleAuthService.signOut();
    await _box.delete(_sessionKey);
    state = UserAccount.guest;
  }

  /// Persists the session, then records the profile the operator dashboard
  /// lists from.
  ///
  /// Hooked here rather than inside each of signUp/login/loginWithGoogle
  /// because this is the one funnel all three already pass through — a fourth
  /// sign-in path added later gets the profile write for free, instead of
  /// silently creating a user who never appears in any list.
  ///
  /// Deliberately not awaited: the write is best-effort telemetry for the
  /// operator, and holding the UI on a Firestore round trip would make every
  /// sign-in feel slower for something the user did not ask for.
  /// UserProfileService swallows its own failures.
  Future<void> _persist(UserAccount account) async {
    await _box.put(_sessionKey, account.toMap());
    state = account;
    unawaited(UserProfileService.upsert(account));
  }

  /// First non-blank of: the Firebase profile name, the name typed on the
  /// form, the email's local part. Falls back to a label rather than an empty
  /// string, which callers render as `name[0]`.
  static String _displayName(String? profile, String? typed, String email) {
    for (final candidate in [profile, typed, email.trim().split('@').first]) {
      final value = candidate?.trim() ?? '';
      if (value.isNotEmpty) return value;
    }
    return UserAccount.fallbackName;
  }
}
