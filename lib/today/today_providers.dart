import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/calc/daily_decisions.dart';
import '../settings/settings_providers.dart';
import '../trades/trades_providers.dart';

/// Injected so tests can pin "today". In the app it is simply the clock.
final todayProvider = Provider<DateTime>((ref) {
  final now = DateTime.now();
  return DateTime(now.year, now.month, now.day);
});

final dailyDecisionsProvider = Provider<DailyDecisions>((ref) {
  final settings = ref.watch(settingsProvider);
  return DailyDecisions.from(
    ref.watch(tradesProvider),
    capital: settings.capital,
    maxRiskPercent: settings.maxRiskPercent,
    today: ref.watch(todayProvider),
    waitingThresholdDays: settings.waitingThresholdDays,
  );
});
