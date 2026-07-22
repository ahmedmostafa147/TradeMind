import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/calc/journal_analytics.dart';
import '../core/calc/journal_stats.dart';
import '../core/calc/portfolio_scenarios.dart';
import '../settings/settings_providers.dart';
import '../trades/trades_providers.dart';

/// Recomputed whenever trades or settings change. Watching settingsProvider is
/// what makes a capital edit refresh every stat with no extra wiring.
final journalStatsProvider = Provider<JournalStats>((ref) {
  final settings = ref.watch(settingsProvider);
  return JournalStats.from(
    ref.watch(tradesProvider),
    capital: settings.capital,
    maxRiskPercent: settings.maxRiskPercent,
  );
});

/// Best/worst case across the open book, plus the one-winner breakdown.
final portfolioScenariosProvider = Provider<PortfolioScenarios>((ref) {
  final settings = ref.watch(settingsProvider);
  return PortfolioScenarios.from(
    ref.watch(tradesProvider),
    defaultTakeProfitPercent: settings.defaultTakeProfitPercent,
  );
});

/// The heavier section 11 / 16 figures. Kept as its own provider so the trade
/// list and dashboard summary do not recompute it, and so it is evaluated
/// lazily — nothing pays for it until the analytics screen is opened.
final journalAnalyticsProvider = Provider<JournalAnalytics>((ref) {
  final settings = ref.watch(settingsProvider);
  return JournalAnalytics.from(
    ref.watch(tradesProvider),
    capital: settings.capital,
    maxRiskPercent: settings.maxRiskPercent,
  );
});
