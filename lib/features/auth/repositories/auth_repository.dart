import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_ce/hive.dart';

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

  Future<void> _persist(UserAccount account) async {
    await _box.put(_sessionKey, account.toMap());
    state = account;
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
