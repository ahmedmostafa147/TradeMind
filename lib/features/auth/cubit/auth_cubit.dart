import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart' show User;
import 'package:flutter/foundation.dart' show visibleForTesting;
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../sync/services/firestore_sync_service.dart';
import '../../sync/services/user_profile_service.dart';
import '../models/user_account.dart';
import '../services/auth_exception.dart';
import '../services/firebase_auth_service.dart';
import '../services/google_auth_service.dart';

/// ── WHY THERE IS A THIRD STATE ─────────────────────────────────────────────
///
/// The Hive version answered "is anyone signed in" with a synchronous disk
/// read, so there were only ever two answers and the gate could decide on the
/// first frame. Firebase restores its session asynchronously, so there is now a
/// moment where the answer is genuinely not known yet.
///
/// Rendering the sign-in screen during that moment would flash a login form at
/// somebody who has been signed in for months, every single launch. [AuthRestoring]
/// exists so the gate can wait instead of guessing.
sealed class AuthState {
  const AuthState();
}

/// Before Firebase has reported. Not "signed out".
class AuthRestoring extends AuthState {
  const AuthRestoring();
}

class AuthSignedIn extends AuthState {
  final UserAccount account;

  const AuthSignedIn(this.account);
}

class AuthSignedOut extends AuthState {
  const AuthSignedOut();
}

/// Owns the signed-in session.
///
/// ── WHAT CHANGED WITH HIVE ─────────────────────────────────────────────────
///
/// The session used to be mirrored into a Hive box and read back on launch.
/// That copy is gone, and nothing was lost with it: Firebase Auth persists its
/// own session to disk and restores it offline, so the mirror was a second
/// record of the same fact — and a second record that could disagree. It could,
/// and the disagreement had teeth: the box said signed in, so the gate opened,
/// while Firebase said otherwise and every read was refused.
///
/// A session is still only ever created from a credential Firebase actually
/// returned. There is deliberately no local fallback that marks a user signed
/// in when the backend cannot be reached — an early version had one, and
/// because Firebase was unconfigured on that build it meant *any* email and
/// *any* password produced a real, persisted session.
class AuthCubit extends Cubit<AuthState> {
  StreamSubscription<User?>? _subscription;

  /// The name typed on the sign-up form, held only until Firebase's own profile
  /// catches up. `updateDisplayName` lands after the auth event that follows a
  /// sign-up, so without this the first frame greets a new user as "مستخدم".
  String? _typedName;

  AuthCubit() : super(const AuthRestoring()) {
    if (!FirebaseAuthService.isAvailable) {
      // An empty stream would leave the gate spinning forever. There is nothing
      // to restore, and saying so is the honest answer.
      emit(const AuthSignedOut());
      return;
    }
    _subscription = FirebaseAuthService.authStateChanges.listen(_onUser);
  }

  /// A cubit pinned to one state, for widget tests.
  ///
  /// Every method on [FirebaseAuthService] short-circuits on
  /// `Firebase.apps.isNotEmpty`, which is never true under `flutter test`, so
  /// the real constructor can only ever report "signed out" there — and the
  /// auth gate would then render the sign-in screen over every test in the
  /// suite. This is the seam the Hive box used to provide by being writable.
  @visibleForTesting
  AuthCubit.stub(super.state);

  void _onUser(User? user) {
    if (user == null) {
      emit(const AuthSignedOut());
      return;
    }
    emit(AuthSignedIn(_toAccount(user)));
  }

  /// The signed-in account, or null while restoring or signed out.
  UserAccount? get account =>
      state is AuthSignedIn ? (state as AuthSignedIn).account : null;

  /// Registers a new account. Throws [AuthException] if it fails.
  ///
  /// No state is emitted here: the auth stream reports the new session a tick
  /// later, and emitting as well would make this class a second writer of the
  /// same fact — the exact shape of the bug the Hive mirror used to be.
  Future<void> signUp({
    required String name,
    required String email,
    required String password,
  }) async {
    _typedName = name;
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

    _recordProfile(_toAccount(user, email: email));
  }

  /// Signs in an existing account. Throws [AuthException] if it fails.
  Future<void> login({
    required String email,
    required String password,
    String? nameFallback,
  }) async {
    _typedName = nameFallback;
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

    _recordProfile(_toAccount(user, email: email));
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

    _recordProfile(_toAccount(user));
  }

  /// Sends a password reset email.
  Future<void> sendPasswordResetEmail(String email) =>
      FirebaseAuthService.sendPasswordResetEmail(email);

  /// Ends the session. The auth stream reports it.
  Future<void> logout() async {
    _typedName = null;
    await FirebaseAuthService.signOut();
    await GoogleAuthService.signOut();
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
  /// "Cloud data" is BOTH halves: the `trades`, `watchlist`, `settings` and
  /// `billing` subcollections, and the `users/{uid}` profile document that holds
  /// the email, the display name and the activity counters. The profile used to
  /// be left behind — the account vanished, the journal vanished, and a document
  /// with the user's email stayed in Firestore forever, still listed in the
  /// operator's dashboard. That contradicted section 6 of the published privacy
  /// policy, the site's own /delete page, and Play's account-deletion
  /// requirement. `test/account_deletion_test.dart` reads this method's source
  /// and holds the order.
  ///
  /// THE OLD `wipeLocalJournal` FLAG IS GONE, and its absence is the point:
  /// there is no second copy on the device any more, so there is no longer a
  /// separate decision to make. Offering the checkbox now would ask the user to
  /// choose about something that does not exist.
  Future<void> deleteAccount() async {
    final userId = account?.id ?? '';

    await FirestoreSyncService.deleteAllData(userId);
    await UserProfileService.delete(userId);
    await FirebaseAuthService.deleteAccount();

    await GoogleAuthService.signOut();
  }

  /// Records the profile the operator dashboard lists from.
  ///
  /// Hooked into the one funnel all three sign-in paths already pass through,
  /// so a fourth path added later gets the write for free instead of silently
  /// creating a user who never appears in any list.
  ///
  /// Deliberately not awaited: it is best-effort telemetry for the operator,
  /// and holding the UI on a Firestore round trip would make every sign-in feel
  /// slower for something the user did not ask for. UserProfileService swallows
  /// its own failures.
  void _recordProfile(UserAccount account) =>
      unawaited(UserProfileService.upsert(account));

  UserAccount _toAccount(User user, {String? email}) => UserAccount(
    id: user.uid,
    name: _displayName(user.displayName, _typedName, user.email ?? email ?? ''),
    email: user.email ?? email?.trim() ?? '',
    isLoggedIn: true,
    lastLogin: DateTime.now(),
  );

  /// First non-blank of: the Firebase profile name, the name typed on the form,
  /// the email's local part. Falls back to a label rather than an empty string,
  /// which callers render as `name[0]`.
  static String _displayName(String? profile, String? typed, String email) {
    for (final candidate in [profile, typed, email.trim().split('@').first]) {
      final value = candidate?.trim() ?? '';
      if (value.isNotEmpty) return value;
    }
    return UserAccount.fallbackName;
  }

  @override
  Future<void> close() async {
    await _subscription?.cancel();
    return super.close();
  }
}
