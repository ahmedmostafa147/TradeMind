/// «لو عايز مبلغ معيّن بعد مدة — هتوصله إمتى؟»
///
/// MIRROR OF site/lib/projection.ts. Same model, same thresholds, same
/// branches — CLAUDE.md §5 requires the two to change in the same commit,
/// because a figure that disagrees between the phone and the browser is worse
/// than one that is missing from both.
///
/// The answer comes from the user's OWN closed trades, never from a return rate
/// they type in. That is the whole point: every compound-interest calculator
/// asks you to guess your edge and then flatters the guess. This one reads the
/// edge off the journal, and when the edge is negative it says so instead of
/// quietly projecting a bigger number of months.
///
///   monthly profit = expectancy per trade × trades per month
///   monthly rate   = monthly profit ÷ capital
///   months         = ln(target ÷ capital) ÷ ln(1 + rate)
///
/// Compounding rather than flat, because the product compounds: the position
/// calculator sizes every trade from capital × risk%, so the money at risk —
/// and the expected profit — grows with capital.
///
/// Pure Dart, zero Flutter imports, like everything else in core/calc.
library;

import 'dart:math' as math;

import '../../trades/trade.dart';
import '../../trades/trade_status.dart';

/// Below this many closed trades the expectancy is noise, and a projection
/// built on it is a confident-looking number with nothing behind it.
const int kMinClosedTradesForProjection = 10;

/// Past this the answer stops being a projection. A book grinding out 0.1% a
/// month against a 10× target genuinely computes to centuries, and printing the
/// figure invites the reader to take it seriously.
const int kMaxProjectionMonths = 600;

enum ProjectionKind { reachable, alreadyThere, notEnoughHistory, noEdge }

class GoalProjection {
  final ProjectionKind kind;

  /// Clamped to [kMaxProjectionMonths]. Only meaningful when [kind] is
  /// [ProjectionKind.reachable].
  final int months;

  /// True when the horizon was clamped — callers must not print [months].
  final bool beyondHorizon;

  final double? expectancy;
  final double? tradesPerMonth;
  final double? monthlyProfit;
  final double? monthlyRate;

  /// How many closed trades the journal actually has, for the "not yet" copy.
  final int closedCount;

  const GoalProjection._({
    required this.kind,
    this.months = 0,
    this.beyondHorizon = false,
    this.expectancy,
    this.tradesPerMonth,
    this.monthlyProfit,
    this.monthlyRate,
    this.closedCount = 0,
  });
}

/// Trades per month, measured over the span the journal actually covers.
///
/// First-to-last exit rather than "trades ÷ months since signup": someone who
/// traded hard for two months, stopped for a year and came back is projected on
/// how they trade, not punished for the gap. The one-month floor stops a burst
/// inside a single week from implying eighty trades a month.
double? tradesPerMonth(List<DateTime> exitDates) {
  if (exitDates.isEmpty) return null;

  var earliest = exitDates.first;
  var latest = exitDates.first;
  for (final date in exitDates) {
    if (date.isBefore(earliest)) earliest = date;
    if (date.isAfter(latest)) latest = date;
  }

  final spanDays = latest.difference(earliest).inMilliseconds / 86400000;
  final spanMonths = (spanDays / 30.44) < 1 ? 1.0 : (spanDays / 30.44);

  return exitDates.length / spanMonths;
}

/// [expectancy] is passed in rather than recomputed so this and the performance
/// screen can never disagree about the figure — it is the same «التوقّع
/// الرياضي» the stats card shows.
GoalProjection projectGoal({
  required List<Trade> trades,
  required double capital,
  required double target,
  required double? expectancy,
}) {
  final exits = <DateTime>[
    for (final trade in trades)
      if (trade.status == TradeStatus.closed && trade.exitDate != null)
        trade.exitDate!,
  ];

  if (target <= capital) {
    return const GoalProjection._(kind: ProjectionKind.alreadyThere);
  }

  if (exits.length < kMinClosedTradesForProjection) {
    return GoalProjection._(
      kind: ProjectionKind.notEnoughHistory,
      closedCount: exits.length,
    );
  }

  final rate = tradesPerMonth(exits);
  if (expectancy == null || rate == null) {
    return GoalProjection._(
      kind: ProjectionKind.notEnoughHistory,
      closedCount: exits.length,
    );
  }

  final monthlyProfit = expectancy * rate;

  // Checked BEFORE the logarithm: ln(1 + r) for r <= -1 is NaN or -infinity,
  // and either would propagate into a rendered month count.
  if (monthlyProfit <= 0) {
    return GoalProjection._(
      kind: ProjectionKind.noEdge,
      expectancy: expectancy,
      tradesPerMonth: rate,
      monthlyProfit: monthlyProfit,
      closedCount: exits.length,
    );
  }

  final monthlyRate = monthlyProfit / capital;
  final raw = math.log(target / capital) / math.log(1 + monthlyRate);
  final months = raw.ceil();

  return GoalProjection._(
    kind: ProjectionKind.reachable,
    months: months > kMaxProjectionMonths ? kMaxProjectionMonths : months,
    beyondHorizon: raw > kMaxProjectionMonths,
    expectancy: expectancy,
    tradesPerMonth: rate,
    monthlyProfit: monthlyProfit,
    monthlyRate: monthlyRate,
    closedCount: exits.length,
  );
}
