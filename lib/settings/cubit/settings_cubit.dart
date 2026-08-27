import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/preferences/device_preferences.dart';
import '../../core/state/account_scoped_cubit.dart';
import '../data/settings_repository.dart';
import '../settings.dart';

/// The risk rule, assembled from the account and the device.
///
/// ── WHY THIS HAS A LOADING STATE, AND WHY IT MATTERS MORE HERE ─────────────
///
/// Every other cubit's loading state protects a list from rendering as empty.
/// This one protects ARITHMETIC. Capital and the risk ceiling divide into every
/// position size, every risk percentage and every over-risk warning in the
/// product, so a screen that computes against the class defaults while the real
/// values are still in flight does not show a spinner's worth of nothing — it
/// shows a confident, wrong number, and it shows it in the one place the user
/// is trusting the app to be right.
///
/// So there is no "reasonable placeholder" here on purpose. A caller gets a
/// [Settings] only once the account's document has actually been read.
sealed class SettingsState {
  const SettingsState();
}

class SettingsLoading extends SettingsState {
  const SettingsLoading();
}

class SettingsLoaded extends SettingsState {
  final Settings settings;

  const SettingsLoaded(this.settings);
}

class SettingsFailure extends SettingsState {
  final Object error;

  const SettingsFailure(this.error);
}

class SettingsSignedOut extends SettingsState {
  const SettingsSignedOut();
}

class SettingsCubit extends AccountScopedCubit<SettingsState> {
  final SettingsRepository _repository;
  final DevicePreferences _device;

  SettingsCubit(this._repository, this._device)
    : super(const SettingsLoading());

  @override
  SettingsState get loadingState => const SettingsLoading();

  @override
  SettingsState get signedOutState => const SettingsSignedOut();

  @override
  StreamSubscription<void> subscribe(String userId) =>
      _repository.watch(userId, defaults: _withDevicePreferences(const Settings())).listen(
        (settings) => emit(SettingsLoaded(_withDevicePreferences(settings))),
        onError: (Object error) => emit(SettingsFailure(error)),
      );

  /// Folds the two device-held toggles onto whatever came from the account.
  ///
  /// They are applied AFTER the remote read, not before, so a document that
  /// happens to carry them — written by an older build, or a future one — can
  /// never override this device's own answer.
  Settings _withDevicePreferences(Settings remote) => remote.copyWith(
    enableChecklist: _device.enableChecklist,
    enableConfirmations: _device.enableConfirmations,
  );

  /// The settings, or null while loading, failed or signed out.
  ///
  /// Nullable rather than falling back to `const Settings()`, and that is the
  /// whole point of this class: a caller has to decide what to do without a
  /// risk rule, instead of silently sizing a position against a capital of
  /// 17,000 that belongs to nobody.
  Settings? get settings =>
      state is SettingsLoaded ? (state as SettingsLoaded).settings : null;

  Future<void> _saveRemote(Settings next) async {
    final id = userId;
    if (id == null) return;
    // Emitted before the write so the UI moves on the same frame as the tap.
    // The stream confirms it a tick later; if the write fails the next snapshot
    // puts the old value back, which is the correct outcome and a visible one.
    emit(SettingsLoaded(next));
    await _repository.save(id, next);
  }

  Future<void> setCapital(double value) async {
    final current = settings;
    if (current == null || !value.isFinite || value <= 0) return;
    await _saveRemote(current.copyWith(capital: value));
  }

  /// Takes a FRACTION (0.02), never a percent (2.0). The settings screen owns
  /// the conversion so the unit is unambiguous everywhere below this line.
  Future<void> setMaxRiskPercent(double fraction) async {
    final current = settings;
    if (current == null || !fraction.isFinite || fraction <= 0 || fraction > 1) {
      return;
    }
    await _saveRemote(current.copyWith(maxRiskPercent: fraction));
  }

  Future<void> setWaitingThresholdDays(int days) async {
    final current = settings;
    if (current == null || days <= 0) return;
    await _saveRemote(current.copyWith(waitingThresholdDays: days));
  }

  /// A fraction, like [setMaxRiskPercent].
  Future<void> setDefaultTakeProfitPercent(double fraction) async {
    final current = settings;
    if (current == null || !fraction.isFinite || fraction <= 0 || fraction > 1) {
      return;
    }
    await _saveRemote(current.copyWith(defaultTakeProfitPercent: fraction));
  }

  Future<void> setDefaultStopLossPercent(double fraction) async {
    final current = settings;
    if (current == null || !fraction.isFinite || fraction <= 0 || fraction >= 1) {
      return;
    }
    await _saveRemote(current.copyWith(defaultStopLossPercent: fraction));
  }

  // ── device-held, and deliberately not written to the account ─────────────

  Future<void> setEnableChecklist(bool value) async {
    await _device.setEnableChecklist(value);
    final current = settings;
    if (current != null) {
      emit(SettingsLoaded(current.copyWith(enableChecklist: value)));
    }
  }

  Future<void> setEnableConfirmations(bool value) async {
    await _device.setEnableConfirmations(value);
    final current = settings;
    if (current != null) {
      emit(SettingsLoaded(current.copyWith(enableConfirmations: value)));
    }
  }

  ThemeMode get themeMode => _device.themeMode;

  Future<void> setThemeMode(ThemeMode mode) => _device.setThemeMode(mode);
}
