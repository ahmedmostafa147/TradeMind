import 'package:egx_trade_journal/core/calc/journal_analytics.dart';
import 'package:egx_trade_journal/trades/trade.dart';
import 'package:egx_trade_journal/trades/trade_status.dart';
import 'package:flutter_test/flutter_test.dart';

/// Entry 10.00, stop 9.50, qty 680 unless overridden — so risk is 340.00 and
/// every R multiple is (exit - 10.00) * 680 / 340 = (exit - 10.00) * 2.
Trade makeTrade({
  required String id,
  String ticker = 'COMI',
  double entry = 10.00,
  double stop = 9.50,
  int qty = 680,
  double? exit,
  DateTime? entryDate,
  DateTime? exitDate,
  List<String> tags = const [],
  TradeStatus? status,
}) => Trade(
  id: id,
  entryDate: entryDate ?? DateTime(2026, 3, 1),
  ticker: ticker,
  reason: 'سبب',
  entryPrice: entry,
  stopPrice: stop,
  quantity: qty,
  exitPrice: exit,
  exitDate: exit == null ? null : (exitDate ?? DateTime(2026, 3, 10)),
  tags: tags,
  status: status,
);

JournalAnalytics analyse(List<Trade> trades, {double capital = 17000}) =>
    JournalAnalytics.from(trades, capital: capital, maxRiskPercent: 0.02);

void main() {
  group('empty and unexecuted journals never divide by zero', () {
    test('an empty journal reports nulls, not zeros', () {
      final a = analyse([]);
      expect(a.averageHoldingDays, isNull);
      expect(a.bestTrade, isNull);
      expect(a.worstTrade, isNull);
      expect(a.mostTradedTicker, isNull);
      expect(a.averagePositionValue, isNull);
      expect(a.averageRiskPct, isNull);
      expect(a.expectancy, isNull);
      expect(a.profitFactor, isNull);
      expect(a.medianR, isNull);
      expect(a.averageR, isNull);
      expect(a.bestWeekday, isNull);
      expect(a.bestMonth, isNull);
      expect(a.largestGain, isNull);
      expect(a.largestLoss, isNull);
      expect(a.longestWinStreak, 0);
      expect(a.longestLossStreak, 0);
      expect(a.monthlyPnl, isEmpty);
      expect(a.weeklyPnl, isEmpty);
      expect(a.tagStats, isEmpty);
    });

    test('planned and cancelled ideas alone count as an empty journal', () {
      final a = analyse([
        makeTrade(id: 'p', status: TradeStatus.planned, qty: 0),
        makeTrade(id: 'x', status: TradeStatus.cancelled, qty: 0),
      ]);
      expect(a.averagePositionValue, isNull);
      expect(a.mostTradedTicker, isNull);
      expect(a.expectancy, isNull);
    });

    test('open trades yield position stats but no closed-trade stats', () {
      final a = analyse([makeTrade(id: 'o')]);
      expect(a.averagePositionValue, 6800.0);
      expect(a.averageRiskPct, closeTo(0.02, 1e-12));
      expect(a.mostTradedTicker, 'COMI');
      expect(a.expectancy, isNull);
      expect(a.profitFactor, isNull);
      expect(a.medianR, isNull);
      expect(a.bestTrade, isNull);
    });

    test('zero capital leaves risk unknown without crashing', () {
      final a = analyse([makeTrade(id: 'o')], capital: 0);
      expect(a.averageRiskPct, isNull);
      expect(a.averagePositionValue, 6800.0);
    });
  });

  group('profit factor', () {
    test('is gross profit over gross loss', () {
      // +816 and +340 against -272.
      final a = analyse([
        makeTrade(id: 'w1', exit: 11.20, exitDate: DateTime(2026, 3, 5)),
        makeTrade(id: 'w2', exit: 10.50, exitDate: DateTime(2026, 3, 6)),
        makeTrade(id: 'l1', exit: 9.60, exitDate: DateTime(2026, 3, 7)),
      ]);
      expect(a.profitFactor, closeTo(1156.0 / 272.0, 1e-9));
    });

    test('is null with no losses, rather than infinity', () {
      final a = analyse([
        makeTrade(id: 'w1', exit: 11.20, exitDate: DateTime(2026, 3, 5)),
      ]);
      expect(a.profitFactor, isNull);
    });

    test('is zero when there are only losses', () {
      final a = analyse([
        makeTrade(id: 'l1', exit: 9.60, exitDate: DateTime(2026, 3, 5)),
      ]);
      expect(a.profitFactor, 0.0);
    });
  });

  group('expectancy', () {
    test('is the mean P&L per closed trade', () {
      final a = analyse([
        makeTrade(id: 'w1', exit: 11.20, exitDate: DateTime(2026, 3, 5)),
        makeTrade(id: 'l1', exit: 9.60, exitDate: DateTime(2026, 3, 6)),
      ]);
      expect(a.expectancy, closeTo((816.0 - 272.0) / 2, 1e-9));
    });

    // Guards the documented identity: if the two forms ever diverge, one of
    // them is wrong.
    test('matches the classic (winRate x avgWin) - (lossRate x |avgLoss|)', () {
      final trades = [
        makeTrade(id: 'w1', exit: 11.20, exitDate: DateTime(2026, 3, 5)),
        makeTrade(id: 'w2', exit: 10.50, exitDate: DateTime(2026, 3, 6)),
        makeTrade(id: 'l1', exit: 9.60, exitDate: DateTime(2026, 3, 7)),
        makeTrade(id: 'b1', exit: 10.00, exitDate: DateTime(2026, 3, 8)),
      ];
      final a = analyse(trades);

      const closedCount = 4;
      final winRate = 2 / closedCount;
      final lossRate = 1 / closedCount;
      final classic =
          winRate * a.averageProfit! - lossRate * a.averageLoss!.abs();

      expect(a.expectancy, closeTo(classic, 1e-9));
    });
  });

  group('median R', () {
    test('is the middle value for an odd count', () {
      final a = analyse([
        makeTrade(id: 'a', exit: 11.20, exitDate: DateTime(2026, 3, 5)),
        makeTrade(id: 'b', exit: 10.50, exitDate: DateTime(2026, 3, 6)),
        makeTrade(id: 'c', exit: 9.60, exitDate: DateTime(2026, 3, 7)),
      ]);
      // R values 2.4, 1.0, -0.8 → sorted -0.8, 1.0, 2.4
      expect(a.medianR, closeTo(1.0, 1e-9));
    });

    test('averages the two middle values for an even count', () {
      final a = analyse([
        makeTrade(id: 'a', exit: 11.20, exitDate: DateTime(2026, 3, 5)),
        makeTrade(id: 'b', exit: 10.50, exitDate: DateTime(2026, 3, 6)),
        makeTrade(id: 'c', exit: 9.60, exitDate: DateTime(2026, 3, 7)),
        makeTrade(id: 'd', exit: 10.20, exitDate: DateTime(2026, 3, 8)),
      ]);
      // R values 2.4, 1.0, -0.8, 0.4 → sorted -0.8, 0.4, 1.0, 2.4
      expect(a.medianR, closeTo((0.4 + 1.0) / 2, 1e-9));
    });

    test('differs from the mean on a skewed journal', () {
      final a = analyse([
        makeTrade(id: 'a', exit: 30.00, exitDate: DateTime(2026, 3, 5)),
        makeTrade(id: 'b', exit: 9.60, exitDate: DateTime(2026, 3, 6)),
        makeTrade(id: 'c', exit: 9.60, exitDate: DateTime(2026, 3, 7)),
      ]);
      // One 40R outlier drags the mean far above the median.
      expect(a.medianR, closeTo(-0.8, 1e-9));
      expect(a.averageR! > a.medianR!, isTrue);
    });

    test('skips trades whose R is undefined', () {
      final a = analyse([
        makeTrade(id: 'zero', qty: 0, exit: 11.20, exitDate: DateTime(2026, 3, 5)),
        makeTrade(id: 'a', exit: 11.20, exitDate: DateTime(2026, 3, 6)),
      ]);
      expect(a.medianR, closeTo(2.4, 1e-9));
    });
  });

  group('streaks', () {
    test('finds the longest run of each kind, ordered by exit date', () {
      final a = analyse([
        makeTrade(id: 'a', exit: 11.20, exitDate: DateTime(2026, 3, 1)),
        makeTrade(id: 'b', exit: 11.20, exitDate: DateTime(2026, 3, 2)),
        makeTrade(id: 'c', exit: 11.20, exitDate: DateTime(2026, 3, 3)),
        makeTrade(id: 'd', exit: 9.60, exitDate: DateTime(2026, 3, 4)),
        makeTrade(id: 'e', exit: 9.60, exitDate: DateTime(2026, 3, 5)),
        makeTrade(id: 'f', exit: 11.20, exitDate: DateTime(2026, 3, 6)),
      ]);
      expect(a.longestWinStreak, 3);
      expect(a.longestLossStreak, 2);
    });

    test('input order does not change the answer', () {
      final trades = [
        makeTrade(id: 'a', exit: 11.20, exitDate: DateTime(2026, 3, 1)),
        makeTrade(id: 'b', exit: 9.60, exitDate: DateTime(2026, 3, 2)),
        makeTrade(id: 'c', exit: 9.60, exitDate: DateTime(2026, 3, 3)),
      ];
      expect(
        analyse(trades).longestLossStreak,
        analyse(trades.reversed.toList()).longestLossStreak,
      );
    });

    test('a scratch trade ends both runs', () {
      final a = analyse([
        makeTrade(id: 'a', exit: 11.20, exitDate: DateTime(2026, 3, 1)),
        makeTrade(id: 'b', exit: 10.00, exitDate: DateTime(2026, 3, 2)),
        makeTrade(id: 'c', exit: 11.20, exitDate: DateTime(2026, 3, 3)),
      ]);
      expect(a.longestWinStreak, 1);
      expect(a.longestLossStreak, 0);
    });
  });

  group('best and worst trade', () {
    final a = analyse([
      makeTrade(id: 'w', ticker: 'COMI', exit: 11.20, exitDate: DateTime(2026, 3, 5)),
      makeTrade(id: 'l', ticker: 'HRHO', exit: 9.60, exitDate: DateTime(2026, 3, 6)),
      makeTrade(id: 'm', ticker: 'SWDY', exit: 10.20, exitDate: DateTime(2026, 3, 7)),
    ]);

    test('identifies both with their ticker', () {
      expect(a.bestTrade!.tradeId, 'w');
      expect(a.bestTrade!.ticker, 'COMI');
      expect(a.bestTrade!.pnl, closeTo(816.0, 1e-9));
      expect(a.worstTrade!.tradeId, 'l');
      expect(a.worstTrade!.pnl, closeTo(-272.0, 1e-9));
    });

    test('largest gain and loss mirror them', () {
      expect(a.largestGain, closeTo(816.0, 1e-9));
      expect(a.largestLoss, closeTo(-272.0, 1e-9));
    });

    test('largest gain is null when every trade lost', () {
      final losses = analyse([
        makeTrade(id: 'l', exit: 9.60, exitDate: DateTime(2026, 3, 5)),
      ]);
      expect(losses.largestGain, isNull);
      expect(losses.largestLoss, closeTo(-272.0, 1e-9));
      expect(losses.worstTrade, isNotNull);
    });
  });

  group('holding period', () {
    test('averages days between entry and exit', () {
      final a = analyse([
        makeTrade(
          id: 'a',
          entryDate: DateTime(2026, 3, 1),
          exit: 11.20,
          exitDate: DateTime(2026, 3, 11), // 10 days
        ),
        makeTrade(
          id: 'b',
          entryDate: DateTime(2026, 3, 1),
          exit: 11.20,
          exitDate: DateTime(2026, 3, 5), // 4 days
        ),
      ]);
      expect(a.averageHoldingDays, closeTo(7.0, 1e-9));
    });

    test('a same-day trade counts as zero days, not as missing', () {
      final a = analyse([
        makeTrade(
          id: 'a',
          entryDate: DateTime(2026, 3, 1),
          exit: 11.20,
          exitDate: DateTime(2026, 3, 1),
        ),
      ]);
      expect(a.averageHoldingDays, 0.0);
    });

    test('an exit dated before the entry is excluded, not counted negative', () {
      final a = analyse([
        makeTrade(
          id: 'bad',
          entryDate: DateTime(2026, 3, 10),
          exit: 11.20,
          exitDate: DateTime(2026, 3, 1),
        ),
        makeTrade(
          id: 'good',
          entryDate: DateTime(2026, 3, 1),
          exit: 11.20,
          exitDate: DateTime(2026, 3, 5),
        ),
      ]);
      expect(a.averageHoldingDays, closeTo(4.0, 1e-9));
    });
  });

  group('most traded ticker', () {
    test('counts executed trades of every status', () {
      final a = analyse([
        makeTrade(id: 'a', ticker: 'COMI'),
        makeTrade(id: 'b', ticker: 'COMI', exit: 11.20),
        makeTrade(id: 'c', ticker: 'HRHO'),
      ]);
      expect(a.mostTradedTicker, 'COMI');
      expect(a.mostTradedTickerCount, 2);
    });

    test('ignores planned ideas', () {
      final a = analyse([
        makeTrade(id: 'a', ticker: 'HRHO'),
        makeTrade(id: 'p1', ticker: 'COMI', status: TradeStatus.planned, qty: 0),
        makeTrade(id: 'p2', ticker: 'COMI', status: TradeStatus.planned, qty: 0),
      ]);
      expect(a.mostTradedTicker, 'HRHO');
    });

    test('breaks ties alphabetically for a stable answer', () {
      final a = analyse([
        makeTrade(id: 'a', ticker: 'ZZZZ'),
        makeTrade(id: 'b', ticker: 'AAAA'),
      ]);
      expect(a.mostTradedTicker, 'AAAA');
    });
  });

  group('weekday and month breakdowns', () {
    test('sums P&L per weekday of exit', () {
      // 2026-03-02 is a Monday, 2026-03-03 a Tuesday.
      final a = analyse([
        makeTrade(id: 'a', exit: 11.20, exitDate: DateTime(2026, 3, 2)),
        makeTrade(id: 'b', exit: 9.60, exitDate: DateTime(2026, 3, 3)),
      ]);
      expect(DateTime(2026, 3, 2).weekday, DateTime.monday);
      expect(a.bestWeekday, DateTime.monday);
      expect(a.bestWeekdayPnl, closeTo(816.0, 1e-9));
      expect(a.worstWeekday, DateTime.tuesday);
      expect(a.worstWeekdayPnl, closeTo(-272.0, 1e-9));
    });

    test('aggregates calendar months across years', () {
      final a = analyse([
        makeTrade(id: 'a', exit: 11.20, exitDate: DateTime(2025, 3, 5)),
        makeTrade(id: 'b', exit: 11.20, exitDate: DateTime(2026, 3, 5)),
        makeTrade(id: 'c', exit: 9.60, exitDate: DateTime(2026, 4, 5)),
      ]);
      expect(a.bestMonth, 3);
      expect(a.bestMonthPnl, closeTo(1632.0, 1e-9));
      expect(a.worstMonth, 4);
    });

    test('a single trade is both the best and the worst', () {
      final a = analyse([
        makeTrade(id: 'a', exit: 11.20, exitDate: DateTime(2026, 3, 2)),
      ]);
      expect(a.bestWeekday, a.worstWeekday);
      expect(a.bestMonth, a.worstMonth);
    });
  });

  group('period series', () {
    test('monthly buckets are ordered and carry trade counts', () {
      final a = analyse([
        makeTrade(id: 'a', exit: 11.20, exitDate: DateTime(2026, 4, 5)),
        makeTrade(id: 'b', exit: 9.60, exitDate: DateTime(2026, 3, 5)),
        makeTrade(id: 'c', exit: 10.50, exitDate: DateTime(2026, 3, 20)),
      ]);
      expect(a.monthlyPnl.length, 2);
      expect(a.monthlyPnl.first.start, DateTime(2026, 3));
      expect(a.monthlyPnl.first.tradeCount, 2);
      expect(a.monthlyPnl.first.pnl, closeTo(-272.0 + 340.0, 1e-9));
      expect(a.monthlyPnl.last.start, DateTime(2026, 4));
    });

    test('weeks start on Saturday, matching the EGX trading week', () {
      // 2026-03-01 is a Sunday; its week starts Saturday 2026-02-28.
      expect(DateTime(2026, 3, 1).weekday, DateTime.sunday);
      final a = analyse([
        makeTrade(id: 'a', exit: 11.20, exitDate: DateTime(2026, 3, 1)),
        makeTrade(id: 'b', exit: 10.50, exitDate: DateTime(2026, 3, 5)),
      ]);
      // Sunday and the following Thursday belong to one trading week.
      expect(a.weeklyPnl.length, 1);
      expect(a.weeklyPnl.first.start, DateTime(2026, 2, 28));
      expect(a.weeklyPnl.first.tradeCount, 2);
    });

    test('a Saturday exit starts its own week', () {
      expect(DateTime(2026, 3, 7).weekday, DateTime.saturday);
      final a = analyse([
        makeTrade(id: 'a', exit: 11.20, exitDate: DateTime(2026, 3, 5)),
        makeTrade(id: 'b', exit: 11.20, exitDate: DateTime(2026, 3, 7)),
      ]);
      expect(a.weeklyPnl.length, 2);
      expect(a.weeklyPnl.last.start, DateTime(2026, 3, 7));
    });
  });

  group('tags', () {
    final a = analyse([
      makeTrade(
        id: 'a',
        exit: 11.20,
        exitDate: DateTime(2026, 3, 5),
        tags: const ['بريك أوت', 'سوينج'],
      ),
      makeTrade(
        id: 'b',
        exit: 9.60,
        exitDate: DateTime(2026, 3, 6),
        tags: const ['أخبار'],
      ),
      makeTrade(
        id: 'c',
        exit: 10.50,
        exitDate: DateTime(2026, 3, 7),
        tags: const ['بريك أوت'],
      ),
    ]);

    test('totals P&L and trade count per tag', () {
      final breakout = a.tagStats.firstWhere((t) => t.tag == 'بريك أوت');
      expect(breakout.tradeCount, 2);
      expect(breakout.winCount, 2);
      expect(breakout.totalPnl, closeTo(816.0 + 340.0, 1e-9));
    });

    test('identifies the most profitable and most losing tags', () {
      expect(a.mostProfitableTag!.tag, 'بريك أوت');
      expect(a.mostLosingTag!.tag, 'أخبار');
      expect(a.mostLosingTag!.totalPnl, closeTo(-272.0, 1e-9));
    });

    test('a multi-tag trade contributes to each of its tags', () {
      final swing = a.tagStats.firstWhere((t) => t.tag == 'سوينج');
      expect(swing.tradeCount, 1);
      expect(swing.totalPnl, closeTo(816.0, 1e-9));
    });

    test('duplicate and blank tags on one trade are ignored', () {
      final dup = analyse([
        makeTrade(
          id: 'a',
          exit: 11.20,
          exitDate: DateTime(2026, 3, 5),
          tags: const ['سوينج', 'سوينج', '  ', ''],
        ),
      ]);
      expect(dup.tagStats.length, 1);
      expect(dup.tagStats.single.tradeCount, 1);
    });

    test('an untagged journal has no tag stats', () {
      final untagged = analyse([
        makeTrade(id: 'a', exit: 11.20, exitDate: DateTime(2026, 3, 5)),
      ]);
      expect(untagged.tagStats, isEmpty);
      expect(untagged.mostProfitableTag, isNull);
      expect(untagged.mostLosingTag, isNull);
    });
  });

  group('recommendation sources', () {
    Trade sourced(String id, String? source, double exit, DateTime exitDate) =>
        Trade(
          id: id,
          entryDate: DateTime(2026, 3, 1),
          ticker: 'COMI',
          reason: 'سبب',
          entryPrice: 10.00,
          stopPrice: 9.50,
          quantity: 680,
          exitPrice: exit,
          exitDate: exitDate,
          source: source,
        );

    test('totals P&L per source', () {
      final a = analyse([
        sourced('a', 'قناة أ', 11.20, DateTime(2026, 3, 5)),
        sourced('b', 'قناة أ', 10.50, DateTime(2026, 3, 6)),
        sourced('c', 'قناة ب', 9.60, DateTime(2026, 3, 7)),
      ]);

      expect(a.sourceStats, hasLength(2));
      expect(a.bestSource!.tag, 'قناة أ');
      expect(a.bestSource!.totalPnl, closeTo(816.0 + 340.0, 1e-9));
      expect(a.bestSource!.tradeCount, 2);
      expect(a.bestSource!.winCount, 2);
      expect(a.worstSource!.tag, 'قناة ب');
      expect(a.worstSource!.totalPnl, closeTo(-272.0, 1e-9));
    });

    test('trades without a source are simply not attributed', () {
      final a = analyse([
        sourced('a', 'قناة أ', 11.20, DateTime(2026, 3, 5)),
        sourced('b', null, 11.20, DateTime(2026, 3, 6)),
        sourced('c', '   ', 11.20, DateTime(2026, 3, 7)),
      ]);

      expect(a.sourceStats, hasLength(1));
      expect(a.sourceStats.single.tradeCount, 1);
      // The journal total still counts all three.
      expect(a.expectancy, isNotNull);
    });

    test('an unsourced journal reports nothing rather than an empty label', () {
      final a = analyse([
        sourced('a', null, 11.20, DateTime(2026, 3, 5)),
      ]);
      expect(a.sourceStats, isEmpty);
      expect(a.bestSource, isNull);
      expect(a.worstSource, isNull);
    });

    // Unlike tags, a trade carries exactly one source, so these totals must
    // reconcile with the journal's own total across attributed trades.
    test('source totals sum to the journal total when all are attributed', () {
      final a = analyse([
        sourced('a', 'قناة أ', 11.20, DateTime(2026, 3, 5)),
        sourced('b', 'قناة ب', 9.60, DateTime(2026, 3, 6)),
      ]);
      final summed = a.sourceStats.fold<double>(
        0,
        (total, stat) => total + stat.totalPnl,
      );
      expect(summed, closeTo(816.0 - 272.0, 1e-9));
    });
  });

  group('averages over executed trades', () {
    test('position value and risk average across open and closed alike', () {
      final a = analyse([
        makeTrade(id: 'a', qty: 680),
        makeTrade(id: 'b', qty: 340, exit: 11.20),
      ]);
      expect(a.averagePositionValue, closeTo((6800.0 + 3400.0) / 2, 1e-9));
      expect(
        a.averageRiskPct,
        closeTo((340.0 / 17000 + 170.0 / 17000) / 2, 1e-12),
      );
    });

    test('average profit and loss are signed and separate', () {
      final a = analyse([
        makeTrade(id: 'w1', exit: 11.20, exitDate: DateTime(2026, 3, 5)),
        makeTrade(id: 'w2', exit: 10.50, exitDate: DateTime(2026, 3, 6)),
        makeTrade(id: 'l1', exit: 9.60, exitDate: DateTime(2026, 3, 7)),
      ]);
      expect(a.averageProfit, closeTo((816.0 + 340.0) / 2, 1e-9));
      expect(a.averageLoss, closeTo(-272.0, 1e-9));
      expect(a.averageLoss, isNegative);
    });
  });
}
