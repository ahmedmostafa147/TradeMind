/// Why a sign-in or sign-up attempt failed.
///
/// Typed rather than a raw String so callers can tell "the backend is not
/// reachable" apart from "these credentials are wrong" — the first is worth a
/// retry, the second never is.
enum AuthFailure {
  /// Firebase was never initialised on this build: no google-services.json,
  /// no DefaultFirebaseOptions. Nothing the user can do about it.
  backendUnavailable,

  /// Reached Firebase; it rejected the credentials.
  invalidCredentials,

  /// Sign-up refused because the address is already registered.
  emailAlreadyInUse,

  /// Sign-up refused because the password is too weak.
  weakPassword,

  /// Malformed email address.
  invalidEmail,

  /// Offline, timeout, or anything else transient.
  network,

  /// The user backed out of the Google sheet. Not an error — the UI should
  /// stay silent rather than show a red banner for a deliberate choice.
  cancelled,

  unknown,
}

/// A sign-in/sign-up failure carrying a message ready to show the user.
class AuthException implements Exception {
  final AuthFailure failure;

  /// Arabic, user-facing. Never contains a stack trace or a raw SDK string.
  final String message;

  const AuthException(this.failure, this.message);

  /// Maps a FirebaseAuthException error code onto a typed failure.
  ///
  /// The message deliberately does NOT say which half of the pair was wrong:
  /// telling an anonymous caller that an address exists but the password is
  /// wrong turns the login form into an account-enumeration oracle.
  factory AuthException.fromCode(String? code) => switch (code) {
    'invalid-email' => const AuthException(
      AuthFailure.invalidEmail,
      'صيغة البريد الإلكتروني غير صحيحة.',
    ),
    'email-already-in-use' => const AuthException(
      AuthFailure.emailAlreadyInUse,
      'البريد الإلكتروني ده مسجّل بالفعل. جرّب تسجيل الدخول.',
    ),
    'weak-password' => const AuthException(
      AuthFailure.weakPassword,
      'كلمة السر ضعيفة. لازم تكون ٦ حروف أو أرقام على الأقل.',
    ),
    'user-disabled' => const AuthException(
      AuthFailure.invalidCredentials,
      'الحساب ده موقوف. تواصل مع الدعم.',
    ),
    'too-many-requests' => const AuthException(
      AuthFailure.network,
      'محاولات كتير أوي. استنى شوية وجرّب تاني.',
    ),
    'network-request-failed' => const AuthException(
      AuthFailure.network,
      'مفيش اتصال بالإنترنت. اتأكد من الشبكة وجرّب تاني.',
    ),
    'user-not-found' ||
    'wrong-password' ||
    'invalid-credential' => const AuthException(
      AuthFailure.invalidCredentials,
      'البريد الإلكتروني أو كلمة السر غير صحيحة.',
    ),
    _ => const AuthException(
      AuthFailure.unknown,
      'تعذّر إتمام العملية. جرّب تاني.',
    ),
  };

  static const backendUnavailable = AuthException(
    AuthFailure.backendUnavailable,
    'خدمة الحسابات مش متاحة في النسخة دي. صفقاتك محفوظة على جهازك زي ما هي.',
  );

  static const cancelled = AuthException(
    AuthFailure.cancelled,
    'اتلغى تسجيل الدخول.',
  );

  /// A Google id token that Firebase can consume needs the project's web client
  /// id wired in (see GoogleAuthService). This is the specific, actionable
  /// version of "unknown" for that misconfiguration.
  static const googleMisconfigured = AuthException(
    AuthFailure.unknown,
    'تسجيل جوجل مش متظبط في النسخة دي. استخدم البريد وكلمة السر.',
  );

  @override
  String toString() => message;
}
