import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_ce/hive.dart';

import '../core/hive_keys.dart';
import '../features/ai_parser/services/gemini_config.dart';
import 'settings.dart';

/// Overridden in main() with the box opened before runApp. Throwing here is the
/// idiomatic Riverpod way to require an override — it turns a missing override
/// into an immediate, obvious failure rather than a silent empty state.
final settingsBoxProvider = Provider<Box>(
  (ref) => throw UnimplementedError('settingsBoxProvider must be overridden'),
);

final settingsProvider = NotifierProvider<SettingsNotifier, Settings>(
  SettingsNotifier.new,
);

class SettingsNotifier extends Notifier<Settings> {
  Box get _box => ref.read(settingsBoxProvider);

  @override
  Settings build() {
    final box = ref.watch(settingsBoxProvider);
    return Settings(
      capital: _readDouble(box, kCapitalKey, Settings.defaultCapital),
      maxRiskPercent: _readDouble(
        box,
        kMaxRiskKey,
        Settings.defaultMaxRiskPercent,
      ),
      enableChecklist: _readBool(box, kEnableChecklistKey, true),
      enableConfirmations: _readBool(box, kEnableConfirmationsKey, true),
      waitingThresholdDays: _readInt(
        box,
        kWaitingThresholdKey,
        Settings.defaultWaitingThresholdDays,
      ),
      defaultTakeProfitPercent: _readDouble(
        box,
        kDefaultTakeProfitKey,
        Settings.fallbackTakeProfitPercent,
      ),
      defaultStopLossPercent: _readDouble(
        box,
        kDefaultStopLossKey,
        Settings.fallbackStopLossPercent,
      ),
    );
  }

  static bool _readBool(Box box, String key, bool fallback) {
    final raw = box.get(key);
    return raw is bool ? raw : fallback;
  }

  static int _readInt(Box box, String key, int fallback) {
    final raw = box.get(key);
    return (raw is int && raw > 0) ? raw : fallback;
  }

  /// Hive gives back dynamic; a value written by an older build (or a corrupt
  /// record) could be an int or garbage, and a bad read here would poison every
  /// downstream calculation. Fall back to the default rather than crashing.
  static double _readDouble(Box box, String key, double fallback) {
    final raw = box.get(key);
    if (raw is double && raw.isFinite) return raw;
    if (raw is int) return raw.toDouble();
    return fallback;
  }

  /// Takes the account's risk rule and makes it this device's.
  ///
  /// Called by [SyncController.restore] right after sign-in, and only with a
  /// value that already fell back to the current settings for anything the
  /// server did not have — so an account with nothing stored leaves this a
  /// no-op rather than resetting the device to the class defaults.
  ///
  /// Remote wins here, unlike the journal, where restore is additive and the
  /// server is never an authority. A trade is a record and losing one is data
  /// loss; capital is a single current value, and the alternative to letting it
  /// converge is what this whole change exists to fix — two numbers for one
  /// account, and no way to tell which is right.
  Future<void> adoptRemote(Settings remote) async {
    await _box.put(kCapitalKey, remote.capital);
    await _box.put(kMaxRiskKey, remote.maxRiskPercent);
    await _box.put(kWaitingThresholdKey, remote.waitingThresholdDays);
    state = state.copyWith(
      capital: remote.capital,
      maxRiskPercent: remote.maxRiskPercent,
      waitingThresholdDays: remote.waitingThresholdDays,
    );
  }

  Future<void> setCapital(double value) async {
    if (!value.isFinite || value <= 0) return;
    await _box.put(kCapitalKey, value);
    state = state.copyWith(capital: value);
  }

  /// Takes a FRACTION (0.02), not a percent. The Settings screen owns the
  /// /100 conversion so the unit is unambiguous everywhere below this line.
  Future<void> setMaxRiskPercent(double fraction) async {
    if (!fraction.isFinite || fraction <= 0 || fraction > 1) return;
    await _box.put(kMaxRiskKey, fraction);
    state = state.copyWith(maxRiskPercent: fraction);
  }

  Future<void> setEnableChecklist(bool value) async {
    await _box.put(kEnableChecklistKey, value);
    state = state.copyWith(enableChecklist: value);
  }

  Future<void> setEnableConfirmations(bool value) async {
    await _box.put(kEnableConfirmationsKey, value);
    state = state.copyWith(enableConfirmations: value);
  }

  Future<void> setWaitingThresholdDays(int days) async {
    if (days <= 0) return;
    await _box.put(kWaitingThresholdKey, days);
    state = state.copyWith(waitingThresholdDays: days);
  }

  /// Takes a FRACTION, like [setMaxRiskPercent]. The Settings screen owns the
  /// percent conversion so the unit is unambiguous below this line.
  Future<void> setDefaultTakeProfitPercent(double fraction) async {
    if (!fraction.isFinite || fraction <= 0 || fraction > 1) return;
    await _box.put(kDefaultTakeProfitKey, fraction);
    state = state.copyWith(defaultTakeProfitPercent: fraction);
  }

  Future<void> setDefaultStopLossPercent(double fraction) async {
    if (!fraction.isFinite || fraction <= 0 || fraction >= 1) return;
    await _box.put(kDefaultStopLossKey, fraction);
    state = state.copyWith(defaultStopLossPercent: fraction);
  }
}

/// The Gemini API key, entered in Settings.
///
/// Kept out of [Settings] — like [themeModeProvider] — so that model keeps
/// matching the spec's field list. Reading it also pushes the value into
/// [GeminiConfig], which is what the parser service reads, so the key is live
/// as soon as the provider is first built.
final geminiKeyProvider = NotifierProvider<GeminiKeyNotifier, String>(
  GeminiKeyNotifier.new,
);

class GeminiKeyNotifier extends Notifier<String> {
  @override
  String build() {
    final raw = ref.watch(settingsBoxProvider).get(kGeminiKeyKey);
    final key = raw is String ? raw.trim() : '';
    GeminiConfig.setRuntimeKey(key);
    return key;
  }

  Future<void> set(String key) async {
    final clean = key.trim();
    // State first so the UI reflects the change immediately; the disk write
    // follows. Also pushed into GeminiConfig, which is plain static state and
    // has no way to observe the provider.
    state = clean;
    GeminiConfig.setRuntimeKey(clean);
    if (clean.isEmpty) {
      await ref.read(settingsBoxProvider).delete(kGeminiKeyKey);
    } else {
      await ref.read(settingsBoxProvider).put(kGeminiKeyKey, clean);
    }
  }
}

/// Kept out of [Settings] so that model matches the spec's field list exactly.
final themeModeProvider = NotifierProvider<ThemeModeNotifier, ThemeMode>(
  ThemeModeNotifier.new,
);

class ThemeModeNotifier extends Notifier<ThemeMode> {
  @override
  ThemeMode build() {
    final raw = ref.watch(settingsBoxProvider).get(kThemeModeKey);
    if (raw is int && raw >= 0 && raw < ThemeMode.values.length) {
      return ThemeMode.values[raw];
    }
    return ThemeMode.system;
  }

  Future<void> set(ThemeMode mode) async {
    await ref.read(settingsBoxProvider).put(kThemeModeKey, mode.index);
    state = mode;
  }
}
