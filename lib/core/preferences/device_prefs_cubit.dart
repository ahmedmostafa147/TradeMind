import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../features/ai_parser/services/gemini_config.dart';
import 'device_preferences.dart';

/// The three device-held values that the UI has to rebuild on.
///
/// One state object rather than three cubits: they share one store, they are
/// all primitives, and splitting them would put three providers above the app
/// for five lines of logic each — the file-count-as-architecture §2 warns off.
///
/// The two habit toggles live in [DevicePreferences] as well but are NOT here:
/// they are read back through `Settings`, so the settings screen keeps one
/// place to look for every field on that object instead of two.
@immutable
class DevicePrefs {
  final ThemeMode themeMode;
  final bool onboardingSeen;
  final String geminiKey;

  const DevicePrefs({
    required this.themeMode,
    required this.onboardingSeen,
    required this.geminiKey,
  });

  DevicePrefs copyWith({
    ThemeMode? themeMode,
    bool? onboardingSeen,
    String? geminiKey,
  }) => DevicePrefs(
    themeMode: themeMode ?? this.themeMode,
    onboardingSeen: onboardingSeen ?? this.onboardingSeen,
    geminiKey: geminiKey ?? this.geminiKey,
  );
}

/// Reads and writes the values that belong to this install.
///
/// Constructed from an already-open [DevicePreferences], so the first frame has
/// the real theme in hand. That is not a convenience — reading the theme from
/// anywhere asynchronous means a frame painted in the wrong brightness on every
/// single launch, which is the one thing a theme setting must never do.
class DevicePrefsCubit extends Cubit<DevicePrefs> {
  final DevicePreferences _prefs;

  DevicePrefsCubit(this._prefs)
    : super(
        DevicePrefs(
          themeMode: _prefs.themeMode,
          onboardingSeen: _prefs.onboardingSeen,
          geminiKey: _prefs.geminiKey,
        ),
      ) {
    // The parser service reads plain static state and has no way to observe a
    // cubit, so the stored key is pushed into it once at startup and again on
    // every save below.
    GeminiConfig.setRuntimeKey(state.geminiKey);
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    emit(state.copyWith(themeMode: mode));
    await _prefs.setThemeMode(mode);
  }

  /// Awaited by the caller before it navigates, so a user who force-quits the
  /// instant the last slide is dismissed does not meet the tour again.
  Future<void> markOnboardingSeen() async {
    emit(state.copyWith(onboardingSeen: true));
    await _prefs.setOnboardingSeen(true);
  }

  /// Puts the tour back. Wired to a settings tile so the screens stay reachable
  /// after first run — otherwise they are code nobody can ever see again.
  Future<void> resetOnboarding() async {
    emit(state.copyWith(onboardingSeen: false));
    await _prefs.setOnboardingSeen(false);
  }

  Future<void> setGeminiKey(String key) async {
    final clean = key.trim();
    emit(state.copyWith(geminiKey: clean));
    GeminiConfig.setRuntimeKey(clean);
    await _prefs.setGeminiKey(clean);
  }
}
