import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';

import 'auth_exception.dart';
import 'google_auth_config.dart';

/// Google sign-in, on top of `google_sign_in` v7 and Firebase Auth.
///
/// v7 replaced the old `signIn()` future with `authenticate()` and a mandatory
/// one-time `initialize()`; both are handled here so the rest of the app just
/// calls [signIn] and gets back a Firebase [UserCredential] or an
/// [AuthException].
class GoogleAuthService {
  const GoogleAuthService._();

  /// Guards the one-time [GoogleSignIn.initialize]. Calling authenticate before
  /// initialize throws, and initialize is not meant to run twice, so the first
  /// call wins and later calls await the same future.
  static Future<void>? _initialization;

  static bool get _firebaseReady => Firebase.apps.isNotEmpty;

  static Future<void> _ensureInitialized() {
    return _initialization ??= GoogleSignIn.instance.initialize(
      // Empty string would be a different request than "unset"; pass null so
      // the platform falls back to google-services.json when the id is blank.
      serverClientId: GoogleAuthConfig.isConfigured
          ? GoogleAuthConfig.serverClientId
          : null,
    );
  }

  /// Runs the Google flow and exchanges the result for a Firebase session.
  ///
  /// Throws [AuthException] for every failure the UI must react to:
  /// * [AuthFailure.backendUnavailable] — Firebase not configured on this build;
  /// * [AuthFailure.cancelled] — the user dismissed the sheet (shown silently);
  /// * [AuthFailure.unknown] — no id token, i.e. the web client id is missing.
  static Future<UserCredential> signIn() async {
    if (!_firebaseReady) throw AuthException.backendUnavailable;

    if (!GoogleSignIn.instance.supportsAuthenticate()) {
      throw AuthException.googleMisconfigured;
    }

    try {
      await _ensureInitialized();

      final account = await GoogleSignIn.instance.authenticate();
      final idToken = account.authentication.idToken;

      // No id token almost always means the server (web) client id is not set,
      // so Firebase would reject the credential with a far less clear error.
      if (idToken == null || idToken.isEmpty) {
        throw AuthException.googleMisconfigured;
      }

      final credential = GoogleAuthProvider.credential(idToken: idToken);
      return await FirebaseAuth.instance.signInWithCredential(credential);
    } on GoogleSignInException catch (e) {
      // EVERY DIAGNOSTIC HERE IS BEHIND kDebugMode, and none of them carries an
      // address, a uid or a token.
      //
      // `debugPrint` is NOT stripped from a release build — it writes to logcat
      // in production, where any app holding READ_LOGS, and adb over a cable,
      // can read it. A step-by-step trace of this method printing the signing-in
      // account's email and the resulting uid was exactly that: the identity of
      // every user who ever signed in, in the clear, on their own device.
      _debug('GoogleSignInException: ${e.code}');
      throw switch (e.code) {
        GoogleSignInExceptionCode.canceled => AuthException.cancelled,
        _ => const AuthException(
          AuthFailure.network,
          'تعذّر تسجيل الدخول بجوجل. اتأكد من النت وجرّب تاني.',
        ),
      };
    } on FirebaseAuthException catch (e) {
      _debug('FirebaseAuthException: ${e.code}');
      throw AuthException.fromCode(e.code);
    } on AuthException {
      rethrow;
    } catch (e) {
      _debug('unexpected: ${e.runtimeType}');
      throw const AuthException(
        AuthFailure.unknown,
        'تعذّر تسجيل الدخول بجوجل. جرّب تاني.',
      );
    }
  }

  /// Failure codes only, and only in debug. See the note in [signIn].
  static void _debug(String message) {
    if (kDebugMode) debugPrint('[GoogleAuth] $message');
  }

  /// Clears the Google session so the next sign-in shows the account chooser.
  /// Safe to call when Google was never used.
  static Future<void> signOut() async {
    if (_initialization == null) return;
    try {
      await GoogleSignIn.instance.signOut();
    } catch (_) {
      // Firebase sign-out and local session clearing happen regardless.
    }
  }
}
