import 'package:flutter/widgets.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../settings/cubit/settings_cubit.dart';
import '../../settings/settings.dart';
import '../../trades/cubit/trades_cubit.dart';
import '../../trades/trade.dart';
import '../../watchlist/cubit/watchlist_cubit.dart';
import '../../watchlist/watchlist_item.dart';
import '../app_clock.dart';
import '../calc/daily_decisions.dart';
import '../calc/journal_analytics.dart';
import '../calc/journal_stats.dart';
import '../calc/portfolio_scenarios.dart';
import '../calc/trade_metrics.dart';

/// How screens read the journal.
///
/// `context.trades` in place of `ref.watch(tradesProvider)` — same length, same
/// rebuild behaviour, and one import instead of one per provider file.
extension AppStateReads on BuildContext {
  /// The journal, newest first. Empty while loading, failed or signed out — so
  /// anything that RENDERS A LIST must go through [TradesBuilder] instead, and
  /// tell "you have none" apart from "we do not know yet".
  ///
  /// This getter is for the callers that only ever compute: the CSV export, the
  /// calculators, the "is this ticker already open" checks.
  List<Trade> get trades => watch<TradesCubit>().trades;

  List<WatchlistItem> get watchlist => watch<WatchlistCubit>().items;

  /// The account's risk rule.
  ///
  /// Non-null, and that is [SettingsGate]'s doing: it holds the whole app on a
  /// spinner until the document has actually been read, so nothing below it can
  /// size a position against a capital that belongs to nobody. Reading this
  /// from above the gate is a programming error and throws rather than handing
  /// back a plausible default.
  Settings get settings {
    final settings = watch<SettingsCubit>().settings;
    if (settings == null) {
      throw StateError(
        'context.settings was read outside SettingsGate. Capital divides into '
        'every position size in the product, so there is no default to fall '
        'back on here — either put this widget below the gate, or read '
        'SettingsCubit directly and handle the loading state yourself.',
      );
    }
    return settings;
  }

  /// Today, date-only. Goes through [AppClock] so tests can pin it.
  DateTime get today => AppClock.today;
}

/// The figures derived from the journal, memoised the way the Riverpod
/// providers were.
///
/// Each of these used to be a `Provider` that recomputed only when trades or
/// settings changed. Calling them straight from `build` would instead recompute
/// on every frame — 6.6 ms for a 700-trade journal in the analytics case, paid
/// during scrolling. The cache below restores exactly that behaviour: one entry
/// per figure, keyed by the IDENTITY of the two inputs, both of which are
/// immutable and replaced wholesale when they change.
extension AppStateDerived on BuildContext {
  JournalStats get journalStats {
    final trades = this.trades;
    final settings = this.settings;
    return _stats.of(
      trades,
      settings,
      () => JournalStats.from(
        trades,
        capital: settings.capital,
        maxRiskPercent: settings.maxRiskPercent,
      ),
    );
  }

  /// The heavier section 11 / 16 figures. Nothing pays for them until the
  /// analytics screen asks.
  JournalAnalytics get journalAnalytics {
    final trades = this.trades;
    final settings = this.settings;
    return _analytics.of(
      trades,
      settings,
      () => JournalAnalytics.from(
        trades,
        capital: settings.capital,
        maxRiskPercent: settings.maxRiskPercent,
      ),
    );
  }

  /// Best/worst case across the open book, plus the one-winner breakdown.
  PortfolioScenarios get portfolioScenarios {
    final trades = this.trades;
    final settings = this.settings;
    return _scenarios.of(
      trades,
      settings,
      () => PortfolioScenarios.from(
        trades,
        defaultTakeProfitPercent: settings.defaultTakeProfitPercent,
        defaultStopLossPercent: settings.defaultStopLossPercent,
      ),
    );
  }

  DailyDecisions get dailyDecisions {
    final trades = this.trades;
    final settings = this.settings;
    final today = this.today;
    return _decisions.of(
      trades,
      settings,
      () => DailyDecisions.from(
        trades,
        capital: settings.capital,
        maxRiskPercent: settings.maxRiskPercent,
        today: today,
        waitingThresholdDays: settings.waitingThresholdDays,
      ),
      // The clock is the third input and it is not an object we can compare by
      // identity, so it is folded into the key. Without it a test that pins the
      // date after a first read would be served yesterday's answer.
      extra: today,
    );
  }

  /// Null rather than throwing when the id is gone: a row can outlive its trade
  /// by one frame during a swipe-to-delete animation.
  TradeMetrics? tradeMetrics(String tradeId) {
    final settings = this.settings;
    for (final trade in trades) {
      if (trade.id == tradeId) {
        return TradeMetrics.of(
          trade,
          capital: settings.capital,
          maxRiskPercent: settings.maxRiskPercent,
        );
      }
    }
    return null;
  }
}

final _stats = _Memo<JournalStats>();
final _analytics = _Memo<JournalAnalytics>();
final _scenarios = _Memo<PortfolioScenarios>();
final _decisions = _Memo<DailyDecisions>();

/// A one-entry cache keyed by input identity.
///
/// One entry is enough because there is one journal and one risk rule on screen
/// at a time; a map keyed the same way would only ever grow.
class _Memo<T> {
  Object? _trades;
  Object? _settings;
  Object? _extra;
  T? _value;

  T of(Object trades, Object settings, T Function() compute, {Object? extra}) {
    final cached = _value;
    if (cached != null &&
        identical(trades, _trades) &&
        identical(settings, _settings) &&
        extra == _extra) {
      return cached;
    }
    _trades = trades;
    _settings = settings;
    _extra = extra;
    return _value = compute();
  }
}
