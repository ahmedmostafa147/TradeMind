import 'package:flutter/foundation.dart';

/// «النهارده», in one place.
///
/// «قرار اليوم» decides what needs attention by comparing entry dates against
/// today, so a test that cannot pin the date can only assert on trades seeded
/// relative to the real clock — which silently changes meaning as the calendar
/// moves. The Riverpod version injected it as `todayProvider` and the tests
/// overrode it; this keeps that seam without a container.
class AppClock {
  const AppClock._();

  static DateTime Function() _now = DateTime.now;

  /// Midnight today. Date-only on purpose: everything comparing against it is
  /// counting days, and a time component turns "same day" into "same instant".
  static DateTime get today {
    final now = _now();
    return DateTime(now.year, now.month, now.day);
  }

  /// Pins the clock for a test. Pass null to hand it back to the real one.
  @visibleForTesting
  static set nowOverride(DateTime Function()? now) => _now = now ?? DateTime.now;
}
