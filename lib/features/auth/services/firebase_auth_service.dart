import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';

import 'auth_exception.dart';

/// Firebase Authentication wrapper.
///
/// Every method either returns a credential Firebase actually verified, or
/// throws [AuthException]. It never returns a "sort of signed in" result: the
/// caller uses the return value to decide whether a session exists, so a
/// half-success here would become a real unauthenticated session upstream.
class FirebaseAuthService {
  const FirebaseAuthService._();

  /// Whether `Firebase.initializeApp()` succeeded during startup.
  ///
  /// `main()` swallows an initialisation failure so the journal still opens
  /// offline. That leaves `FirebaseAuth.instance` throwing on every call, so
  /// each entry point checks this first and reports a clear reason instead.
  static bool get isAvailable => Firebase.apps.isNotEmpty;

  static FirebaseAuth get _auth => FirebaseAuth.instance;

  static User? get currentUser => isAvailable ? _auth.currentUser : null;

  static Stream<User?> get authStateChanges =>
      isAvailable ? _auth.authStateChanges() : const Stream<User?>.empty();

  /// Creates an account. Throws [AuthException] on any failure.
  static Future<UserCredential> signUp({
    required String email,
    required String password,
    required String displayName,
  }) async {
    if (!isAvailable) throw AuthException.backendUnavailable;
    try {
      final credential = await _auth.createUserWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      await credential.user?.updateDisplayName(displayName);
      return credential;
    } on FirebaseAuthException catch (e) {
      throw AuthException.fromCode(e.code);
    } on AuthException {
      rethrow;
    } catch (_) {
      throw const AuthException(
        AuthFailure.unknown,
        'تعذّر إنشاء الحساب. جرّب تاني.',
      );
    }
  }

  /// Signs in. Throws [AuthException] on any failure.
  static Future<UserCredential> signIn({
    required String email,
    required String password,
  }) async {
    if (!isAvailable) throw AuthException.backendUnavailable;
    try {
      return await _auth.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
    } on FirebaseAuthException catch (e) {
      throw AuthException.fromCode(e.code);
    } on AuthException {
      rethrow;
    } catch (_) {
      throw const AuthException(
        AuthFailure.unknown,
        'تعذّر تسجيل الدخول. جرّب تاني.',
      );
    }
  }

  /// Sends a password reset email to [email]. Throws [AuthException] on failure.
  static Future<void> sendPasswordResetEmail(String email) async {
    if (!isAvailable) throw AuthException.backendUnavailable;
    try {
      await _auth.sendPasswordResetEmail(email: email.trim());
    } on FirebaseAuthException catch (e) {
      throw AuthException.fromCode(e.code);
    } on AuthException {
      rethrow;
    } catch (_) {
      throw const AuthException(
        AuthFailure.unknown,
        'تعذّر إرسال رابط إعادة التعيين. جرّب تاني.',
      );
    }
  }

  /// Signs out. Safe to call when Firebase never initialised.
  static Future<void> signOut() async {
    if (!isAvailable) return;
    try {
      await _auth.signOut();
    } catch (_) {
      // Local session is cleared by the caller regardless.
    }
  }

  /// Permanently deletes the signed-in account.
  ///
  /// Unlike [signOut] this never swallows a failure. A silent failure here
  /// would tell the user their account was erased while the identity — and
  /// their claim on the Firestore subtree keyed to it — is still live, which
  /// is the opposite of what Play's deletion requirement exists to guarantee.
  ///
  /// Firebase rejects deletion on a stale session with `requires-recent-login`,
  /// which surfaces as [AuthFailure.requiresRecentLogin] for the user to fix.
  static Future<void> deleteAccount() async {
    if (!isAvailable) throw AuthException.backendUnavailable;

    final user = _auth.currentUser;
    if (user == null) {
      throw const AuthException(
        AuthFailure.invalidCredentials,
        'مفيش حساب مسجّل دخول عشان يتمسح.',
      );
    }

    try {
      await user.delete();
    } on FirebaseAuthException catch (e) {
      throw AuthException.fromCode(e.code);
    } on AuthException {
      rethrow;
    } catch (_) {
      throw const AuthException(
        AuthFailure.unknown,
        'تعذّر حذف الحساب. جرّب تاني.',
      );
    }
  }
}
