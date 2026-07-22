import 'package:egx_trade_journal/core/calc/journal_stats.dart';
import 'package:egx_trade_journal/trades/trade.dart';
import 'package:egx_trade_journal/trades/trade_status.dart';
import 'package:flutter_test/flutter_test.dart';

Trade makeTrade({
  required String id,
  TradeStatus status = TradeStatus.open,
  int qty = 680,
  double? exit,
  DateTime? exitDate,
  bool favorite = false,
  List<String> checklist = const [],
}) => Trade(
  id: id,
  entryDate: DateTime(2026, 3, 1),
  ticker: 'COMI',
  reason: 'سبب',
  entryPrice: 10.00,
  stopPrice: 9.50,
  quantity: qty,
  exitPrice: exit,
  exitDate: exit == null ? null : (exitDate ?? DateTime(2026, 3, 10)),
  status: status,
  isFavorite: favorite,
  completedChecklistItems: checklist,
);

JournalStats statsOf(List<Trade> trades) =>
    JournalStats.from(trades, capital: 17000, maxRiskPercent: 0.02);

void main() {
  test('a trade defaults to open, matching phase-1 behaviour', () {
    expect(makeTrade(id: 'a').status, TradeStatus.open);
  });

  test('only open and closed count as executed', () {
    expect(TradeStatus.open.isExecuted, isTrue);
    expect(TradeStatus.closed.isExecuted, isTrue);
    expect(TradeStatus.planned.isExecuted, isFalse);
    expect(TradeStatus.cancelled.isExecuted, isFalse);
  });

  test('fromName falls back rather than throwing on unknown input', () {
    expect(
      TradeStatus.fromName('closed', fallback: TradeStatus.open),
      TradeStatus.closed,
    );
    expect(
      TradeStatus.fromName(null, fallback: TradeStatus.open),
      TradeStatus.open,
    );
    expect(
      TradeStatus.fromName('from_a_future_build', fallback: TradeStatus.open),
      TradeStatus.open,
    );
  });

  group('dashboard counts each status separately', () {
    final stats = statsOf([
      makeTrade(id: 'p1', status: TradeStatus.planned, qty: 0),
      makeTrade(id: 'p2', status: TradeStatus.planned, qty: 0),
      makeTrade(id: 'o1'),
      makeTrade(
        id: 'c1',
        status: TradeStatus.closed,
        exit: 11.20,
        exitDate: DateTime(2026, 3, 5),
      ),
      makeTrade(id: 'x1', status: TradeStatus.cancelled, qty: 0),
    ]);

    test('each bucket is counted', () {
      expect(stats.plannedCount, 2);
      expect(stats.openCount, 1);
      expect(stats.closedCount, 1);
      expect(stats.cancelledCount, 1);
    });

    // The regression that matters: before status existed, anything without an
    // exit was "open". Planned and cancelled ideas must not inflate that.
    test('planned and cancelled ideas do not inflate the open count', () {
      expect(stats.openCount, 1, reason: 'only the genuinely open position');
    });

    test('unexecuted ideas contribute nothing to performance', () {
      expect(stats.totalPnl, closeTo(816.0, 1e-9));
      expect(stats.winRate, 1.0, reason: '1 of 1 closed trades won');
      expect(stats.equityCurve.length, 2, reason: 'capital + one closed trade');
    });
  });

  test('a trade marked closed but missing its exit counts as open', () {
    // Otherwise it would vanish from every total: no P&L, no curve point, and
    // a closedCount that the equity curve cannot account for.
    final stats = statsOf([makeTrade(id: 'bad', status: TradeStatus.closed)]);
    expect(stats.closedCount, 0);
    expect(stats.openCount, 1);
    expect(stats.equityCurve, isEmpty);
  });

  group('favorites and checklist aggregates', () {
    test('favorites are counted across every status', () {
      final stats = statsOf([
        makeTrade(id: 'a', favorite: true),
        makeTrade(id: 'b', status: TradeStatus.planned, favorite: true, qty: 0),
        makeTrade(id: 'c'),
      ]);
      expect(stats.favoriteCount, 2);
    });

    test('average checklist completion ignores trades without one', () {
      final stats = statsOf([
        makeTrade(id: 'a', checklist: const ['trend', 'levels', 'volume']),
        makeTrade(id: 'b', checklist: const [
          'trend',
          'levels',
          'volume',
          'risk',
          'size',
          'news',
        ]),
        makeTrade(id: 'c'), // no checklist — excluded, not counted as zero
      ]);
      expect(stats.averageChecklistCompletion, closeTo(0.75, 1e-12));
    });

    test('is null when no trade has a checklist', () {
      final stats = statsOf([makeTrade(id: 'a')]);
      expect(stats.averageChecklistCompletion, isNull);
    });

    test('empty journal reports zero counts and null completion', () {
      final stats = statsOf([]);
      expect(stats.plannedCount, 0);
      expect(stats.cancelledCount, 0);
      expect(stats.favoriteCount, 0);
      expect(stats.averageChecklistCompletion, isNull);
    });
  });
}
