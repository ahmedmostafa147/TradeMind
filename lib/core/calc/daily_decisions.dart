import '../../trades/trade.dart';
import '../../trades/trade_status.dart';
import 'trade_metrics.dart';

/// One open or planned trade paired with everything the action card shows, so
/// the UI never recomputes metrics per rebuild.
class DecisionItem {
  final Trade trade;
  final TradeMetrics metrics;

  /// Whole days since entry. Never negative.
  final int daysSinceEntry;

  /// Whole days since the last timeline event, or since entry when there are
  /// none. Null for trades where it carries no meaning.
  final int? daysSinceUpdate;

  const DecisionItem({
    required this.trade,
    required this.metrics,
    required this.daysSinceEntry,
    required this.daysSinceUpdate,
  });
}

/// Everything the «قرار اليوم» screen needs, computed in one pass.
///
/// Pure Dart — no Flutter, no Hive, no intl — so every rule below is a plain
/// unit test. `today` is injected rather than read from the clock so the
/// day-threshold rules are deterministic under test.
class DailyDecisions {
  /// Risk above the configured limit. Rendered first: it is the only category
  /// that means "you are breaking your own rule right now".
  final List<DecisionItem> overRisk;

  /// Every open position.
  final List<DecisionItem> open;

  /// Planned ideas, newest first.
  final List<DecisionItem> planned;

  /// Trades that want a written note.
  ///
  /// Deliberately NOT "anything untouched for 7 days" — that would keep every
  /// finished, fully-documented trade on the list forever and bury the day's
  /// actual work. Two cases only:
  ///   * an open position with no timeline update in [staleNoteDays]
  ///   * a trade closed within [recentlyClosedDays] that still has no lesson
  /// Writing the note removes it from the list, which is the point.
  final List<DecisionItem> needsReview;

  /// Open positions held longer than the configured threshold.
  final List<DecisionItem> waitingTooLong;

  /// Closed within the last [recentlyClosedDays].
  final List<DecisionItem> recentlyClosed;

  const DailyDecisions._({
    required this.overRisk,
    required this.open,
    required this.planned,
    required this.needsReview,
    required this.waitingTooLong,
    required this.recentlyClosed,
  });

  static const int staleNoteDays = 7;
  static const int recentlyClosedDays = 7;

  int get openCount => open.length;
  int get plannedCount => planned.length;
  int get overRiskCount => overRisk.length;
  int get needsReviewCount => needsReview.length;
  int get waitingTooLongCount => waitingTooLong.length;
  int get closedThisWeekCount => recentlyClosed.length;

  /// True when there is genuinely nothing to act on. Note that
  /// [recentlyClosed] does not count — a closed trade with its lesson written
  /// is a record, not a task.
  bool get isEmpty =>
      overRisk.isEmpty &&
      open.isEmpty &&
      planned.isEmpty &&
      needsReview.isEmpty &&
      waitingTooLong.isEmpty;

  factory DailyDecisions.from(
    List<Trade> trades, {
    required double capital,
    required double maxRiskPercent,
    required DateTime today,
    required int waitingThresholdDays,
  }) {
    final day = DateTime(today.year, today.month, today.day);

    final overRisk = <DecisionItem>[];
    final open = <DecisionItem>[];
    final planned = <DecisionItem>[];
    final needsReview = <DecisionItem>[];
    final waitingTooLong = <DecisionItem>[];
    final recentlyClosed = <DecisionItem>[];

    for (final trade in trades) {
      final metrics = TradeMetrics.of(
        trade,
        capital: capital,
        maxRiskPercent: maxRiskPercent,
      );

      final daysSinceEntry = _daysBetween(trade.entryDate, day);
      final lastTouch = _lastTouch(trade);
      final daysSinceUpdate = _daysBetween(lastTouch, day);

      final item = DecisionItem(
        trade: trade,
        metrics: metrics,
        daysSinceEntry: daysSinceEntry,
        daysSinceUpdate: daysSinceUpdate,
      );

      switch (trade.status) {
        case TradeStatus.planned:
          planned.add(item);
          // A planned idea can still be sized past the limit — flag it before
          // the money is committed, which is the whole point of the app.
          if (metrics.overRisk) overRisk.add(item);

        case TradeStatus.cancelled:
          // Abandoned. Never an action item.
          break;

        case TradeStatus.open:
          open.add(item);
          if (metrics.overRisk) overRisk.add(item);
          if (daysSinceUpdate >= staleNoteDays) needsReview.add(item);
          if (daysSinceEntry > waitingThresholdDays) waitingTooLong.add(item);

        case TradeStatus.closed:
          // Guard the same inconsistency JournalStats handles: marked closed
          // but missing its exit date. Treat it as still open rather than
          // silently dropping it from every section.
          final exitDate = trade.exitDate;
          if (exitDate == null || trade.isOpen) {
            open.add(item);
            if (metrics.overRisk) overRisk.add(item);
            if (daysSinceUpdate >= staleNoteDays) needsReview.add(item);
            if (daysSinceEntry > waitingThresholdDays) waitingTooLong.add(item);
            break;
          }
          final daysSinceExit = _daysBetween(exitDate, day);
          if (daysSinceExit <= recentlyClosedDays) {
            recentlyClosed.add(item);
            if (!_hasLesson(trade)) needsReview.add(item);
          }
      }
    }

    // Highest risk first — the worst breach is the most urgent.
    overRisk.sort(
      (a, b) => (b.metrics.riskPct ?? 0).compareTo(a.metrics.riskPct ?? 0),
    );
    // Oldest first: a position held longest has waited longest for a decision.
    open.sort((a, b) => b.daysSinceEntry.compareTo(a.daysSinceEntry));
    planned.sort((a, b) => a.daysSinceEntry.compareTo(b.daysSinceEntry));
    needsReview.sort(
      (a, b) => (b.daysSinceUpdate ?? 0).compareTo(a.daysSinceUpdate ?? 0),
    );
    waitingTooLong.sort((a, b) => b.daysSinceEntry.compareTo(a.daysSinceEntry));
    recentlyClosed.sort(
      (a, b) => b.trade.exitDate!.compareTo(a.trade.exitDate!),
    );

    return DailyDecisions._(
      overRisk: List.unmodifiable(overRisk),
      open: List.unmodifiable(open),
      planned: List.unmodifiable(planned),
      needsReview: List.unmodifiable(needsReview),
      waitingTooLong: List.unmodifiable(waitingTooLong),
      recentlyClosed: List.unmodifiable(recentlyClosed),
    );
  }

  static bool _hasLesson(Trade trade) =>
      (trade.notes ?? '').trim().isNotEmpty || trade.timeline.isNotEmpty;

  /// The most recent timeline entry, falling back to the entry date.
  static DateTime _lastTouch(Trade trade) {
    var latest = trade.entryDate;
    for (final entry in trade.timeline) {
      if (entry.date.isAfter(latest)) latest = entry.date;
    }
    return latest;
  }

  /// Whole days from [from] to [to], floored at zero.
  ///
  /// Clamped because a future-dated entry would otherwise produce a negative
  /// age and quietly drop the trade out of every threshold comparison.
  static int _daysBetween(DateTime from, DateTime to) {
    final start = DateTime(from.year, from.month, from.day);
    final days = to.difference(start).inDays;
    return days < 0 ? 0 : days;
  }
}
