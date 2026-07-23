/// Configuration for the Gemini vision parser.
///
/// Paste your Google AI Studio key here to turn the real image analysis on.
/// Get one free at https://aistudio.google.com → "Get API key". Leaving it
/// blank keeps the AI button visible but honestly reporting that it is not set
/// up, instead of pretending to read the image.
///
/// ⚠️ A key committed here ships inside the APK and can be extracted from it.
/// For a personal build that is acceptable; before any public release, move the
/// call behind your own server (or a Firebase Cloud Function) so the key is
/// never in the app. Also lock the key down in Google AI Studio to the
/// Generative Language API only.
class GeminiConfig {
  const GeminiConfig._();

  /// Empty means "not configured". Pass via --dart-define=GEMINI_API_KEY=your_key
  static const String apiKey =
      String.fromEnvironment('GEMINI_API_KEY', defaultValue: '');

  /// The vision-capable model. Flash is the cheapest that reads images well.
  static const String model = 'gemini-3.6-flash';

  static bool get isConfigured => apiKey.isNotEmpty;
}
