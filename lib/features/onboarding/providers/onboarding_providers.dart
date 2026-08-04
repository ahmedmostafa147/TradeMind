import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_ce_flutter/hive_flutter.dart';

import '../../../core/hive_keys.dart';
import '../../../settings/settings_providers.dart';

/// Whether the intro has already been shown.
///
/// Reads the settings box directly rather than going through Settings: this is
/// a one-bit UI flag with no bearing on any calculation, and adding it to the
/// Settings object would put it in the copyWith of every screen that changes a
/// risk percentage.
class OnboardingSeen extends Notifier<bool> {
  Box get _box => ref.read(settingsBoxProvider);

  @override
  bool build() => _box.get(kOnboardingSeenKey, defaultValue: false) as bool;

  /// Marks the tour finished.
  ///
  /// Awaited by the caller before it navigates, so a user who force-quits the
  /// app the instant the last slide is dismissed does not meet the tour again
  /// on the next launch — Hive's write is not synchronous with the setState.
  Future<void> markSeen() async {
    await _box.put(kOnboardingSeenKey, true);
    state = true;
  }

  /// Puts the tour back. Wired to a Settings tile so the screens stay
  /// reachable after first run — otherwise they are code nobody can ever see
  /// again, which is how intro screens rot.
  Future<void> reset() async {
    await _box.put(kOnboardingSeenKey, false);
    state = false;
  }
}

final onboardingSeenProvider = NotifierProvider<OnboardingSeen, bool>(
  OnboardingSeen.new,
);
