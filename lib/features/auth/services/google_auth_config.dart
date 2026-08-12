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

  /// Web client ID for trademind-6222c Firebase project.
  static const String serverClientId =
      '680175215-eaj9ea5etm3h5du0il3r7ipmcol4ltc4.apps.googleusercontent.com';

  static bool get isConfigured => serverClientId.isNotEmpty;
}
