import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
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

    // Web and some desktop targets use a different (button-based) flow; this
    // app ships Android, where authenticate() is supported.
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
      // EVERY NON-CANCEL FAILURE USED TO BE REPORTED AS A NETWORK PROBLEM.
      //
      // That is the one message guaranteed to be wrong here: the flow that
      // actually breaks on a fresh install is a CONFIGURATION one — no Android
      // OAuth client for this package, so Credential Manager finds nothing to
      // hand back — and telling the user to check their internet sends them to
      // look at the only thing that was never at fault.
      throw switch (e.code) {
        // A deliberate dismissal. Stays silent; see the caller.
        GoogleSignInExceptionCode.canceled => AuthException.cancelled,

        // The SHA-1 of the signing key is not registered on the Firebase
        // project, or the account cannot mint a token for this app. The picker
        // opens, the user chooses, and nothing comes back.
        GoogleSignInExceptionCode.unknownError
            when (e.description ?? '').contains('No credential available') =>
          AuthException.googleNotRegistered,

        GoogleSignInExceptionCode.clientConfigurationError ||
        GoogleSignInExceptionCode.providerConfigurationError =>
          AuthException.googleMisconfigured,

        // Play services missing or disabled, or no activity to draw on.
        GoogleSignInExceptionCode.uiUnavailable => const AuthException(
          AuthFailure.unknown,
          'مقدرش يفتح شاشة جوجل. اتأكد إن Google Play Services متسطّبة وشغّالة.',
        ),

        GoogleSignInExceptionCode.interrupted => const AuthException(
          AuthFailure.network,
          'اتقطع تسجيل الدخول بجوجل. جرّب تاني.',
        ),

        _ => AuthException(
          AuthFailure.unknown,
          // The SDK's own words are kept: this branch exists for the codes
          // nobody predicted, and swallowing the description there leaves the
          // next person with nothing to search for.
          'تعذّر تسجيل الدخول بجوجل${_detail(e.description)}',
        ),
      };
    } on FirebaseAuthException catch (e) {
      throw AuthException.fromCode(e.code);
    } on AuthException {
      rethrow;
    } catch (_) {
      throw const AuthException(
        AuthFailure.unknown,
        'تعذّر تسجيل الدخول بجوجل. جرّب تاني.',
      );
    }
  }

  /// A short, safe tail for an unexpected SDK message.
  ///
  /// Truncated because these strings can carry a stack trace, and a dialog that
  /// grows to fill the screen is a worse failure than the one it is reporting.
  static String _detail(String? description) {
    final text = description?.trim() ?? '';
    if (text.isEmpty) return '. جرّب تاني.';
    final short = text.length > 120 ? '${text.substring(0, 120)}…' : text;
    return ' — $short';
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
