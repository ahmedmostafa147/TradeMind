import '../../trades/trade.dart';
import 'risk_math.dart';
import 'trade_metrics.dart';

/// P&L for one calendar bucket (a month or a week).
class PeriodPnl {
  /// First day of the bucket — 1st of the month, or the Saturday that starts
  /// the week.
  final DateTime start;
  final double pnl;
  final int tradeCount;

  const PeriodPnl({
    required this.start,
    required this.pnl,
    required this.tradeCount,
  });
}

/// Aggregate performance of every closed trade carrying one tag.
class TagStat {
  final String tag;
  final double totalPnl;
  final int tradeCount;
  final int winCount;

  const TagStat({
    required this.tag,
    required this.totalPnl,
    required this.tradeCount,
    required this.winCount,
  });
}

/// The single best or worst closed trade.
class TradeExtreme {
  final String tradeId;
  final String ticker;
  final double pnl;
  final DateTime exitDate;

  const TradeExtreme({
    required this.tradeId,
    required this.ticker,
    required this.pnl,
    required this.exitDate,
  });
}

/// Everything the dashboard's extended section and the analytics screen need.
///
/// Computed in one pass over the journal. Like [JournalStats], every
/// unavailable figure is null rather than 0 — an empty journal has no "best
/// weekday", and reporting 0.0 would read as a real result.
///
/// Planned and cancelled ideas are excluded throughout: they never risked
/// money, so including them would distort every average.
class JournalAnalytics {
  // ---- section 11
  final double? averageHoldingDays;
  final int longestWinStreak;
  final int longestLossStreak;
  final TradeExtreme? bestTrade;
  final TradeExtreme? worstTrade;
  final String? mostTradedTicker;
  final int mostTradedTickerCount;
  final double? averagePositionValue;
  final double? averageRiskPct;
  final List<PeriodPnl> monthlyPnl;
  final List<PeriodPnl> weeklyPnl;

  // ---- section 16
  /// 1 = Monday … 7 = Sunday, matching DateTime.weekday.
  final int? bestWeekday;
  final double? bestWeekdayPnl;
  final int? worstWeekday;
  final double? worstWeekdayPnl;

  /// 1 = January … 12 = December, aggregated across years.
  final int? bestMonth;
  final double? bestMonthPnl;
  final int? worstMonth;
  final double? worstMonthPnl;

  final double? averageProfit;
  final double? averageLoss;
  final double? largestGain;
  final double? largestLoss;
  final double? averageR;
  final double? medianR;

  /// Expected P&L per closed trade, in EGP. Identical to the classic
  /// (P(win) × avgWin) − (P(loss) × |avgLoss|) — breakeven trades contribute
  /// zero to the numerator while still counting in the denominator, so the two
  /// forms agree exactly. Computed as the mean because that form cannot
  /// divide by zero twice.
  final double? expectancy;

  /// Gross profit ÷ gross loss. Null when there are no losses at all: the
  /// ratio is unbounded, and showing "∞" or a huge number would be misleading.
  final double? profitFactor;

  // ---- section 5
  final List<TagStat> tagStats;
  final TagStat? mostProfitableTag;
  final TagStat? mostLosingTag;

  /// Performance grouped by who recommended the trade. Unlike tags, a trade
  /// has exactly one source, so these totals do sum to the journal total —
  /// across the trades that carry a source at all.
  final List<TagStat> sourceStats;
  final TagStat? bestSource;
  final TagStat? worstSource;

  const JournalAnalytics._({
    required this.averageHoldingDays,
    required this.longestWinStreak,
    required this.longestLossStreak,
    required this.bestTrade,
    required this.worstTrade,
    required this.mostTradedTicker,
    required this.mostTradedTickerCount,
    required this.averagePositionValue,
    required this.averageRiskPct,
    required this.monthlyPnl,
    required this.weeklyPnl,
    required this.bestWeekday,
    required this.bestWeekdayPnl,
    required this.worstWeekday,
    required this.worstWeekdayPnl,
    required this.bestMonth,
    required this.bestMonthPnl,
    required this.worstMonth,
    required this.worstMonthPnl,
    required this.averageProfit,
    required this.averageLoss,
    required this.largestGain,
    required this.largestLoss,
    required this.averageR,
    required this.medianR,
    required this.expectancy,
    required this.profitFactor,
    required this.tagStats,
    required this.mostProfitableTag,
    required this.mostLosingTag,
    required this.sourceStats,
    required this.bestSource,
    required this.worstSource,
  });

  static const JournalAnalytics empty = JournalAnalytics._(
    averageHoldingDays: null,
    longestWinStreak: 0,
    longestLossStreak: 0,
    bestTrade: null,
    worstTrade: null,
    mostTradedTicker: null,
    mostTradedTickerCount: 0,
    averagePositionValue: null,
    averageRiskPct: null,
    monthlyPnl: [],
    weeklyPnl: [],
    bestWeekday: null,
    bestWeekdayPnl: null,
    worstWeekday: null,
    worstWeekdayPnl: null,
    bestMonth: null,
    bestMonthPnl: null,
    worstMonth: null,
    worstMonthPnl: null,
    averageProfit: null,
    averageLoss: null,
    largestGain: null,
    largestLoss: null,
    averageR: null,
    medianR: null,
    expectancy: null,
    profitFactor: null,
    tagStats: [],
    mostProfitableTag: null,
    mostLosingTag: null,
    sourceStats: [],
    bestSource: null,
    worstSource: null,
  );

  factory JournalAnalytics.from(
    List<Trade> trades, {
    required double capital,
    required double maxRiskPercent,
  }) {
    final executed = <Trade>[];
    final closed = <Trade>[];

    for (final trade in trades) {
      if (!trade.isExecuted) continue;
      executed.add(trade);
      if (!trade.isOpen && trade.exitDate != null) closed.add(trade);
    }

    if (executed.isEmpty) return empty;

    // Same ordering rule as the equity curve: exit date, then id, because
    // date-only values tie constantly and List.sort is not stable.
    closed.sort((a, b) {
      final byDate = a.exitDate!.compareTo(b.exitDate!);
      return byDate != 0 ? byDate : a.id.compareTo(b.id);
    });

    // ---- one pass over executed trades
    var positionValueSum = 0.0;
    var riskPctSum = 0.0;
    var riskPctCount = 0;
    final tickerCounts = <String, int>{};

    for (final trade in executed) {
      final metrics = TradeMetrics.of(
        trade,
        capital: capital,
        maxRiskPercent: maxRiskPercent,
      );
      positionValueSum += metrics.positionValue;
      final riskPct = metrics.riskPct;
      if (riskPct != null) {
        riskPctSum += riskPct;
        riskPctCount++;
      }
      final ticker = trade.ticker.trim();
      if (ticker.isNotEmpty) {
        tickerCounts[ticker] = (tickerCounts[ticker] ?? 0) + 1;
      }
    }

    // ---- one pass over closed trades
    var holdingDaysSum = 0.0;
    var holdingDaysCount = 0;
    var grossProfit = 0.0;
    var grossLoss = 0.0; // signed, stays <= 0
    var winSum = 0.0;
    var winCount = 0;
    var lossSum = 0.0;
    var lossCount = 0;
    var totalPnl = 0.0;
    var winStreak = 0;
    var lossStreak = 0;
    var longestWinStreak = 0;
    var longestLossStreak = 0;

    final rValues = <double>[];
    final byWeekday = <int, double>{};
    final byMonth = <int, double>{};
    final byMonthBucket = <DateTime, _Bucket>{};
    final byWeekBucket = <DateTime, _Bucket>{};
    final tagTotals = <String, _TagAccumulator>{};
    final sourceTotals = <String, _TagAccumulator>{};

    TradeExtreme? best;
    TradeExtreme? worst;

    for (final trade in closed) {
      final metrics = TradeMetrics.of(
        trade,
        capital: capital,
        maxRiskPercent: maxRiskPercent,
      );
      final pnl = metrics.pnl;
      if (pnl == null) continue;
      final exitDate = trade.exitDate!;

      totalPnl += pnl;

      // Bad data (an exit dated before the entry) would otherwise pull the
      // average holding period negative.
      final heldDays = exitDate.difference(trade.entryDate).inDays;
      if (heldDays >= 0) {
        holdingDaysSum += heldDays;
        holdingDaysCount++;
      }

      if (pnl > 0) {
        grossProfit += pnl;
        winSum += pnl;
        winCount++;
        winStreak++;
        lossStreak = 0;
      } else if (pnl < 0) {
        grossLoss += pnl;
        lossSum += pnl;
        lossCount++;
        lossStreak++;
        winStreak = 0;
      } else {
        // A scratch trade is neither a win nor a loss, so it ends both runs.
        winStreak = 0;
        lossStreak = 0;
      }
      if (winStreak > longestWinStreak) longestWinStreak = winStreak;
      if (lossStreak > longestLossStreak) longestLossStreak = lossStreak;

      if (best == null || pnl > best.pnl) {
        best = TradeExtreme(
          tradeId: trade.id,
          ticker: trade.ticker,
          pnl: pnl,
          exitDate: exitDate,
        );
      }
      if (worst == null || pnl < worst.pnl) {
        worst = TradeExtreme(
          tradeId: trade.id,
          ticker: trade.ticker,
          pnl: pnl,
          exitDate: exitDate,
        );
      }

      final r = metrics.rMultiple;
      if (r != null) rValues.add(r);

      byWeekday[exitDate.weekday] = (byWeekday[exitDate.weekday] ?? 0) + pnl;
      byMonth[exitDate.month] = (byMonth[exitDate.month] ?? 0) + pnl;

      final monthStart = DateTime(exitDate.year, exitDate.month);
      (byMonthBucket[monthStart] ??= _Bucket()).add(pnl);

      final weekStart = _startOfWeek(exitDate);
      (byWeekBucket[weekStart] ??= _Bucket()).add(pnl);

      // A trade with several tags contributes to each of them, so tag totals
      // deliberately sum to more than the journal's own total.
      for (final tag in trade.tags.map((t) => t.trim()).toSet()) {
        if (tag.isEmpty) continue;
        (tagTotals[tag] ??= _TagAccumulator()).add(pnl);
      }

      final source = trade.source?.trim();
      if (source != null && source.isNotEmpty) {
        (sourceTotals[source] ??= _TagAccumulator()).add(pnl);
      }
    }

    final closedCount = closed.length;

    String? topTicker;
    var topTickerCount = 0;
    for (final entry in tickerCounts.entries) {
      // Alphabetical tie-break keeps the answer stable across rebuilds.
      if (entry.value > topTickerCount ||
          (entry.value == topTickerCount &&
              topTicker != null &&
              entry.key.compareTo(topTicker) < 0)) {
        topTicker = entry.key;
        topTickerCount = entry.value;
      }
    }

    final weekdayBest = _extremeOf(byWeekday, highest: true);
    final weekdayWorst = _extremeOf(byWeekday, highest: false);
    final monthBest = _extremeOf(byMonth, highest: true);
    final monthWorst = _extremeOf(byMonth, highest: false);

    // Most profitable first; the alphabetical tie-break keeps the order stable
    // across rebuilds.
    List<TagStat> rank(Map<String, _TagAccumulator> totals) =>
        totals.entries
            .map(
              (e) => TagStat(
                tag: e.key,
                totalPnl: e.value.total,
                tradeCount: e.value.count,
                winCount: e.value.wins,
              ),
            )
            .toList()
          ..sort((a, b) {
            final byPnl = b.totalPnl.compareTo(a.totalPnl);
            return byPnl != 0 ? byPnl : a.tag.compareTo(b.tag);
          });

    final tagStats = rank(tagTotals);
    final sourceStats = rank(sourceTotals);

    return JournalAnalytics._(
      averageHoldingDays: holdingDaysCount == 0
          ? null
          : holdingDaysSum / holdingDaysCount,
      longestWinStreak: longestWinStreak,
      longestLossStreak: longestLossStreak,
      bestTrade: best,
      worstTrade: worst,
      mostTradedTicker: topTicker,
      mostTradedTickerCount: topTickerCount,
      averagePositionValue: safeDiv(
        positionValueSum,
        executed.length.toDouble(),
      ),
      averageRiskPct: riskPctCount == 0 ? null : riskPctSum / riskPctCount,
      monthlyPnl: _toPeriods(byMonthBucket),
      weeklyPnl: _toPeriods(byWeekBucket),
      bestWeekday: weekdayBest?.key,
      bestWeekdayPnl: weekdayBest?.value,
      worstWeekday: weekdayWorst?.key,
      worstWeekdayPnl: weekdayWorst?.value,
      bestMonth: monthBest?.key,
      bestMonthPnl: monthBest?.value,
      worstMonth: monthWorst?.key,
      worstMonthPnl: monthWorst?.value,
      averageProfit: winCount == 0 ? null : winSum / winCount,
      averageLoss: lossCount == 0 ? null : lossSum / lossCount,
      largestGain: best?.pnl != null && best!.pnl > 0 ? best.pnl : null,
      largestLoss: worst?.pnl != null && worst!.pnl < 0 ? worst.pnl : null,
      averageR: rValues.isEmpty
          ? null
          : rValues.reduce((a, b) => a + b) / rValues.length,
      medianR: _median(rValues),
      expectancy: closedCount == 0 ? null : totalPnl / closedCount,
      // grossLoss is negative or zero; no losses means the ratio is unbounded.
      profitFactor: grossLoss == 0 ? null : grossProfit / grossLoss.abs(),
      tagStats: List.unmodifiable(tagStats),
      mostProfitableTag: tagStats.isEmpty ? null : tagStats.first,
      mostLosingTag: tagStats.isEmpty ? null : tagStats.last,
      sourceStats: List.unmodifiable(sourceStats),
      bestSource: sourceStats.isEmpty ? null : sourceStats.first,
      worstSource: sourceStats.isEmpty ? null : sourceStats.last,
    );
  }

  /// EGX trades Sunday–Thursday, so weeks are bucketed from Saturday rather
  /// than the ISO Monday — otherwise a single trading week would split across
  /// two buckets.
  static DateTime _startOfWeek(DateTime date) {
    final day = DateTime(date.year, date.month, date.day);
    // DateTime.weekday runs Monday=1..Sunday=7. Adding one before the modulo
    // rotates Saturday to 0, so Sat→0, Sun→1, Mon→2 … Fri→6, and a whole
    // Sunday-to-Thursday trading week collapses to one bucket.
    final offset = (day.weekday + 1) % 7;
    return day.subtract(Duration(days: offset));
  }

  static List<PeriodPnl> _toPeriods(Map<DateTime, _Bucket> buckets) {
    final keys = buckets.keys.toList()..sort();
    return List.unmodifiable([
      for (final key in keys)
        PeriodPnl(
          start: key,
          pnl: buckets[key]!.total,
          tradeCount: buckets[key]!.count,
        ),
    ]);
  }

  static MapEntry<int, double>? _extremeOf(
    Map<int, double> totals, {
    required bool highest,
  }) {
    MapEntry<int, double>? result;
    for (final entry in totals.entries) {
      if (result == null ||
          (highest ? entry.value > result.value : entry.value < result.value) ||
          // Lowest key wins a tie, so the answer does not depend on map order.
          (entry.value == result.value && entry.key < result.key)) {
        result = entry;
      }
    }
    return result;
  }

  static double? _median(List<double> values) {
    if (values.isEmpty) return null;
    final sorted = [...values]..sort();
    final middle = sorted.length ~/ 2;
    if (sorted.length.isOdd) return sorted[middle];
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
}

class _Bucket {
  double total = 0;
  int count = 0;

  void add(double pnl) {
    total += pnl;
    count++;
  }
}

class _TagAccumulator {
  double total = 0;
  int count = 0;
  int wins = 0;

  void add(double pnl) {
    total += pnl;
    count++;
    if (pnl > 0) wins++;
  }
}
