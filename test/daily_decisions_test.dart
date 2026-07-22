import 'package:egx_trade_journal/core/calc/daily_decisions.dart';
import 'package:egx_trade_journal/trades/timeline_entry.dart';
import 'package:egx_trade_journal/trades/trade.dart';
import 'package:egx_trade_journal/trades/trade_status.dart';
import 'package:flutter_test/flutter_test.dart';

/// Fixed "today" so every day-threshold rule is deterministic.
final today = DateTime(2026, 6, 1);

Trade makeTrade({
  required String id,
  String ticker = 'COMI',
  TradeStatus? status,
  double entry = 10.00,
  double stop = 9.50,
  int qty = 680,
  double? exit,
  DateTime? entryDate,
  DateTime? exitDate,
  String? notes,
  List<TimelineEntry> timeline = const [],
}) => Trade(
  id: id,
  entryDate: entryDate ?? today.subtract(const Duration(days: 1)),
  ticker: ticker,
  reason: 'سبب',
  entryPrice: entry,
  stopPrice: stop,
  quantity: qty,
  exitPrice: exit,
  exitDate: exit == null ? null : (exitDate ?? today),
  notes: notes,
  status: status,
  timeline: timeline,
);

DailyDecisions decide(
  List<Trade> trades, {
  double capital = 17000,
  int threshold = 30,
}) => DailyDecisions.from(
  trades,
  capital: capital,
  maxRiskPercent: 0.02,
  today: today,
  waitingThresholdDays: threshold,
);

void main() {
  group('empty state', () {
    test('no trades means no actions', () {
      final d = decide([]);
      expect(d.isEmpty, isTrue);
      expect(d.openCount, 0);
      expect(d.plannedCount, 0);
      expect(d.overRiskCount, 0);
    });

    test('a documented recently-closed trade is not an outstanding action', () {
      final d = decide([
        makeTrade(id: 'c', exit: 11.20, exitDate: today, notes: 'الدرس'),
      ]);
      expect(d.recentlyClosed, hasLength(1));
      expect(
        d.isEmpty,
        isTrue,
        reason: 'a finished, written-up trade is a record, not a task',
      );
    });

    test('cancelled ideas are never actions', () {
      final d = decide([
        makeTrade(id: 'x', status: TradeStatus.cancelled, qty: 0),
      ]);
      expect(d.isEmpty, isTrue);
      expect(d.open, isEmpty);
      expect(d.planned, isEmpty);
      expect(d.needsReview, isEmpty);
    });
  });

  group('over risk', () {
    test('a breach is listed', () {
      // 700 shares at 0.50 risk on 17,000 is 2.06% against a 2% limit.
      final d = decide([makeTrade(id: 'a', qty: 700)]);
      expect(d.overRiskCount, 1);
    });

    test('exactly at the limit is NOT a breach', () {
      final d = decide([makeTrade(id: 'a', qty: 680)]);
      expect(
        d.overRiskCount,
        0,
        reason: 'the phase-1 rule holds: flag only when strictly greater',
      );
    });

    test('a planned idea sized past the limit is flagged before entry', () {
      final d = decide([
        makeTrade(id: 'p', status: TradeStatus.planned, qty: 700),
      ]);
      expect(d.overRiskCount, 1);
      expect(d.plannedCount, 1);
    });

    test('worst breach comes first', () {
      final d = decide([
        makeTrade(id: 'small', qty: 700),
        makeTrade(id: 'huge', qty: 2000),
      ]);
      expect(d.overRisk.first.trade.id, 'huge');
    });

    test('closed trades are not flagged — the risk is already realised', () {
      final d = decide([makeTrade(id: 'c', qty: 2000, exit: 11.20)]);
      expect(d.overRiskCount, 0);
    });
  });

  group('needs review', () {
    test('an open trade untouched for 7 days is listed', () {
      final d = decide([
        makeTrade(
          id: 'stale',
          entryDate: today.subtract(const Duration(days: 7)),
        ),
      ]);
      expect(d.needsReviewCount, 1);
      expect(d.needsReview.single.daysSinceUpdate, 7);
    });

    test('six days is not yet stale', () {
      final d = decide([
        makeTrade(id: 'a', entryDate: today.subtract(const Duration(days: 6))),
      ]);
      expect(d.needsReviewCount, 0);
    });

    test('a recent timeline entry resets the clock', () {
      final d = decide([
        makeTrade(
          id: 'a',
          entryDate: today.subtract(const Duration(days: 40)),
          timeline: [
            TimelineEntry(
              date: today.subtract(const Duration(days: 2)),
              text: 'حركت الاستوب',
            ),
          ],
        ),
      ]);
      expect(d.needsReviewCount, 0);
      expect(d.needsReview, isEmpty);
    });

    test('a recently closed trade with no lesson is listed', () {
      final d = decide([
        makeTrade(id: 'c', exit: 11.20, exitDate: today, notes: null),
      ]);
      expect(d.needsReviewCount, 1);
    });

    test('writing the lesson removes it from the list', () {
      final d = decide([
        makeTrade(id: 'c', exit: 11.20, exitDate: today, notes: 'الدرس'),
      ]);
      expect(d.needsReviewCount, 0);
    });

    test('whitespace is not a lesson', () {
      final d = decide([
        makeTrade(id: 'c', exit: 11.20, exitDate: today, notes: '   '),
      ]);
      expect(d.needsReviewCount, 1);
    });

    // The whole reason this rule deviates from the literal spec: an old,
    // fully-documented trade must not sit on the action list forever.
    test('an old closed trade never appears, documented or not', () {
      final d = decide([
        makeTrade(
          id: 'ancient',
          entryDate: DateTime(2025, 1, 1),
          exit: 11.20,
          exitDate: DateTime(2025, 1, 10),
          notes: null,
        ),
      ]);
      expect(d.needsReviewCount, 0);
      expect(d.recentlyClosed, isEmpty);
      expect(d.isEmpty, isTrue);
    });

    test('a timeline entry counts as a lesson for a closed trade', () {
      final d = decide([
        makeTrade(
          id: 'c',
          exit: 11.20,
          exitDate: today,
          timeline: [TimelineEntry(date: today, text: 'بعت')],
        ),
      ]);
      expect(d.needsReviewCount, 0);
    });
  });

  group('waiting too long', () {
    test('older than the threshold is listed', () {
      final d = decide([
        makeTrade(id: 'a', entryDate: today.subtract(const Duration(days: 31))),
      ]);
      expect(d.waitingTooLongCount, 1);
      expect(d.waitingTooLong.single.daysSinceEntry, 31);
    });

    test('exactly at the threshold is not yet waiting too long', () {
      final d = decide([
        makeTrade(id: 'a', entryDate: today.subtract(const Duration(days: 30))),
      ]);
      expect(d.waitingTooLongCount, 0);
    });

    test('the threshold is configurable', () {
      final trades = [
        makeTrade(id: 'a', entryDate: today.subtract(const Duration(days: 10))),
      ];
      expect(decide(trades, threshold: 30).waitingTooLongCount, 0);
      expect(decide(trades, threshold: 7).waitingTooLongCount, 1);
    });

    test('planned ideas do not age into this list', () {
      final d = decide([
        makeTrade(
          id: 'p',
          status: TradeStatus.planned,
          qty: 0,
          entryDate: today.subtract(const Duration(days: 90)),
        ),
      ]);
      expect(d.waitingTooLongCount, 0);
    });
  });

  group('recently closed', () {
    test('within seven days is listed', () {
      final d = decide([
        makeTrade(
          id: 'c',
          exit: 11.20,
          exitDate: today.subtract(const Duration(days: 7)),
          notes: 'الدرس',
        ),
      ]);
      expect(d.closedThisWeekCount, 1);
    });

    test('eight days ago is not', () {
      final d = decide([
        makeTrade(
          id: 'c',
          exit: 11.20,
          exitDate: today.subtract(const Duration(days: 8)),
          notes: 'الدرس',
        ),
      ]);
      expect(d.closedThisWeekCount, 0);
    });

    test('newest first', () {
      final d = decide([
        makeTrade(
          id: 'older',
          exit: 11.20,
          exitDate: today.subtract(const Duration(days: 5)),
          notes: 'x',
        ),
        makeTrade(id: 'newer', exit: 11.20, exitDate: today, notes: 'x'),
      ]);
      expect(d.recentlyClosed.first.trade.id, 'newer');
    });
  });

  group('robustness', () {
    // Same inconsistency JournalStats guards: marked closed, no exit date.
    test('a trade marked closed without an exit is treated as open', () {
      final d = decide([makeTrade(id: 'bad', status: TradeStatus.closed)]);
      expect(d.openCount, 1);
      expect(d.closedThisWeekCount, 0);
    });

    test('a future-dated entry reports zero days, not negative', () {
      final d = decide([
        makeTrade(id: 'a', entryDate: today.add(const Duration(days: 5))),
      ]);
      expect(d.open.single.daysSinceEntry, 0);
      expect(d.waitingTooLongCount, 0);
      expect(d.needsReviewCount, 0);
    });

    test('zero capital leaves risk unknown and flags nothing', () {
      final d = decide([makeTrade(id: 'a', qty: 2000)], capital: 0);
      expect(d.overRiskCount, 0);
      expect(d.openCount, 1);
    });

    test('open positions are listed oldest first', () {
      final d = decide([
        makeTrade(id: 'new', entryDate: today.subtract(const Duration(days: 1))),
        makeTrade(id: 'old', entryDate: today.subtract(const Duration(days: 9))),
      ]);
      expect(d.open.first.trade.id, 'old');
    });
  });

  group('summary counts', () {
    final d = decide([
      makeTrade(id: 'o1'),
      makeTrade(id: 'o2', qty: 700),
      makeTrade(
        id: 'o3',
        entryDate: today.subtract(const Duration(days: 40)),
      ),
      makeTrade(id: 'p1', status: TradeStatus.planned, qty: 0),
      makeTrade(id: 'p2', status: TradeStatus.planned, qty: 0),
      makeTrade(id: 'c1', exit: 11.20, exitDate: today, notes: 'الدرس'),
      makeTrade(id: 'x1', status: TradeStatus.cancelled, qty: 0),
    ]);

    test('each bucket counts independently', () {
      expect(d.openCount, 3);
      expect(d.plannedCount, 2);
      expect(d.overRiskCount, 1);
      expect(d.closedThisWeekCount, 1);
      expect(d.waitingTooLongCount, 1);
      // o3 is 40 days old with no updates, so it needs review too.
      expect(d.needsReviewCount, 1);
      expect(d.isEmpty, isFalse);
    });

    test('a trade can appear in more than one bucket', () {
      final stale = d.needsReview.single.trade.id;
      expect(stale, 'o3');
      expect(d.waitingTooLong.single.trade.id, 'o3');
    });
  });
}
