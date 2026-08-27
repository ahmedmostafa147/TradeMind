import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// The handful of values that belong to this device rather than to the account.
///
/// ── WHY THIS EXISTS IN A PROJECT THAT JUST DELETED ITS LOCAL STORE ─────────
///
/// Hive went because the journal had two sources of truth and needed code to
/// decide which one won. None of that applies here. Nothing below is user data,
/// nothing below is worth syncing, and two of the three would be actively worse
/// on the network:
///
///   · **Theme** is a property of the screen you are looking at, not of the
///     account. Syncing it means picking dark on a phone at night and finding
///     the desktop dark at noon. Reading it from the network also means a round
///     trip BEFORE FIRST PAINT — a white flash on every cold start, on every
///     launch, forever.
///
///   · **Onboarding seen** answers "has this install shown the tour". Its whole
///     job is to be a property of the install.
///
///   · **The Gemini key** is the one that is not a preference at all. It stays
///     local because the published privacy policy says it does, and because it
///     is a third-party credential the USER pays for. Something that never
///     leaves the device it was typed on cannot be exposed by a mistake in our
///     rules, our backups, or our admin console. The cost is that it does not
///     sync between devices, and the settings screen says so out loud rather
///     than letting the user discover it.
///
/// `SharedPreferences` and not a database on purpose: this is five primitives.
class DevicePreferences {
  final SharedPreferences _prefs;

  const DevicePreferences(this._prefs);

  static Future<DevicePreferences> open() async =>
      DevicePreferences(await SharedPreferences.getInstance());

  // Key names match the ones the Hive settings box used, so nothing has to be
  // renamed twice if a value ever moves again.
  static const String _themeMode = 'themeMode';
  static const String _onboardingSeen = 'onboardingSeen';
  static const String _geminiKey = 'geminiApiKey';
  static const String _enableChecklist = 'enableChecklist';
  static const String _enableConfirmations = 'enableConfirmations';

  /// Defaults to [ThemeMode.system]. An index written by a newer build — or a
  /// corrupt one — falls back rather than throwing on a range error.
  ThemeMode get themeMode {
    final raw = _prefs.getInt(_themeMode);
    if (raw == null || raw < 0 || raw >= ThemeMode.values.length) {
      return ThemeMode.system;
    }
    return ThemeMode.values[raw];
  }

  Future<void> setThemeMode(ThemeMode mode) =>
      _prefs.setInt(_themeMode, mode.index);

  /// Absent means "never ran", which is what makes the tour show exactly once —
  /// on a fresh install and never again, not even after a sign-out. Signing out
  /// is not a reason to be taught the app a second time.
  bool get onboardingSeen => _prefs.getBool(_onboardingSeen) ?? false;

  Future<void> setOnboardingSeen(bool seen) =>
      _prefs.setBool(_onboardingSeen, seen);

  String get geminiKey => (_prefs.getString(_geminiKey) ?? '').trim();

  /// An empty key REMOVES the entry instead of storing "". A credential store
  /// holding an empty credential is a value that reads as "set" to anything
  /// checking for presence.
  Future<void> setGeminiKey(String key) async {
    final clean = key.trim();
    if (clean.isEmpty) {
      await _prefs.remove(_geminiKey);
    } else {
      await _prefs.setString(_geminiKey, clean);
    }
  }

  /// Both default ON. Showing the checklist and asking before a delete are the
  /// safe answers, and a missing preference must not quietly turn a safeguard
  /// off — deleting a trade is not recoverable.
  bool get enableChecklist => _prefs.getBool(_enableChecklist) ?? true;

  Future<void> setEnableChecklist(bool value) =>
      _prefs.setBool(_enableChecklist, value);

  bool get enableConfirmations => _prefs.getBool(_enableConfirmations) ?? true;

  Future<void> setEnableConfirmations(bool value) =>
      _prefs.setBool(_enableConfirmations, value);
}
