/// Configuration for the Gemini vision parser.
///
/// The key can come from either place, checked in this order:
///
/// 1. **Settings screen** — pasted at runtime and kept on the device, never in
///    Firestore (see DevicePreferences). Nothing to rebuild, which is why this
///    exists: a `--dart-define`-only key meant that simply running the app left
///    the AI permanently reporting "not set up".
/// 2. **`--dart-define=GEMINI_API_KEY=...`** — baked in at build time, useful
///    for a release build.
///
/// Get a key free at https://aistudio.google.com → "Get API key".
///
/// ⚠️ A key compiled in with --dart-define ships inside the APK and can be
/// extracted from it. Before any public release, move the call behind your own
/// server (or a Firebase Cloud Function) so the key is never in the app.
class GeminiConfig {
  const GeminiConfig._();

  /// Build-time key. Empty unless passed with --dart-define.
  static const String _compiledKey = String.fromEnvironment(
    'GEMINI_API_KEY',
    defaultValue: '',
  );

  /// Runtime key from Settings. Set by the app at startup and whenever the
  /// user saves a new one; takes precedence over the compiled key.
  static String _runtimeKey = '';

  static void setRuntimeKey(String? key) => _runtimeKey = key?.trim() ?? '';

  /// The key actually used for requests.
  static String get apiKey =>
      _runtimeKey.isNotEmpty ? _runtimeKey : _compiledKey;

  /// The vision-capable model.
  static const String model = 'gemini-3.6-flash';

  static bool get isConfigured => apiKey.isNotEmpty;
}
