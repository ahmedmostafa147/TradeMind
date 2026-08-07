/// Configuration for Google Sign-In.
///
/// To turn Google sign-in on, paste the project's **Web client (OAuth) id**
/// here — the one Firebase auto-creates when you enable the Google provider,
/// found under Firebase console → Authentication → Sign-in method → Google →
/// "Web SDK configuration", or in Google Cloud → Credentials as the
/// "Web client (auto created by Google Service)". It looks like:
///
///   1234567890-abcdef...apps.googleusercontent.com
///
/// Why it is needed: on Android, `google_sign_in` returns an id token bound to
/// this **server** client id, and Firebase only accepts a Google credential
/// that carries an id token. Leaving it blank lets the app build and sign in
/// with email/password, but the Google button will report that it is not set
/// up rather than fail cryptically.
///
/// It is not a secret — a web client id is safe to ship in the app.
class GoogleAuthConfig {
  const GoogleAuthConfig._();

  /// The project's web client id, copied from `android/app/google-services.json`
  /// (the `oauth_client` entry with `client_type: 3`).
  ///
  /// Passed to `GoogleSignIn.initialize` explicitly rather than left blank. The
  /// Android plugin CAN fall back to the `default_web_client_id` string the
  /// google-services Gradle plugin generates from that same file — but a
  /// generated resource that silently disappears (a broken merge, a flavour
  /// without the json) fails as `MISSING_SERVER_CLIENT_ID`, which surfaces as a
  /// sign-in that ends with no explanation. Naming it here makes the value
  /// reviewable and the failure impossible.
  static const String serverClientId =
      '680175215-eaj9ea5etm3h5du0il3r7ipmcol4ltc4.apps.googleusercontent.com';

  static bool get isConfigured => serverClientId.isNotEmpty;
}
