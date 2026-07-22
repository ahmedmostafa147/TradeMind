import 'package:egx_trade_journal/core/calc/portfolio_scenarios.dart';
import 'package:egx_trade_journal/trades/trade.dart';
import 'package:egx_trade_journal/trades/trade_status.dart';
import 'package:flutter_test/flutter_test.dart';

Trade makeTrade({
  required String id,
  String? ticker,
  double entry = 10.00,
  double stop = 9.50,
  int qty = 100,
  double? target,
  TradeStatus? status,
  double? exit,
}) => Trade(
  id: id,
  entryDate: DateTime(2026, 3, 1),
  ticker: ticker ?? id.toUpperCase(),
  reason: 'سبب',
  entryPrice: entry,
  stopPrice: stop,
  quantity: qty,
  status: status,
  exitPrice: exit,
  exitDate: exit == null ? null : DateTime(2026, 3, 10),
  takeProfitPrice: target,
);

PortfolioScenarios scenarios(List<Trade> trades, {double tp = 0.05}) =>
    PortfolioScenarios.from(trades, defaultTakeProfitPercent: tp);

void main() {
  group('nothing open', () {
    test('an empty book reports nulls, not zeros', () {
      final s = scenarios([]);
      expect(s.openCount, 0);
      expect(s.totalExpectedProfit, isNull);
      expect(s.totalExpectedLoss, isNull);
      expect(s.bestCase, isNull);
      expect(s.worstCase, isNull);
      expect(s.oneWinner, isEmpty);
      expect(s.hasOneWinnerAnalysis, isFalse);
    });

    test('closed, planned and cancelled trades are not open positions', () {
      final s = scenarios([
        makeTrade(id: 'closed', exit: 11.0),
        makeTrade(id: 'planned', status: TradeStatus.planned, qty: 0),
        makeTrade(id: 'cancelled', status: TradeStatus.cancelled, qty: 0),
      ]);
      expect(s.openCount, 0);
      expect(s.totalExpectedProfit, isNull);
    });

    test('an open position with no shares is not a position', () {
      final s = scenarios([makeTrade(id: 'a', qty: 0)]);
      expect(s.openCount, 0);
    });
  });

  group('best and worst case', () {
    // Two positions, explicit targets.
    // A: entry 10.00, stop 9.50, target 11.00, 100 shares -> +100 / -50
    // B: entry 20.00, stop 19.00, target 22.00, 50 shares  -> +100 / -50
    final trades = [
      makeTrade(id: 'a', entry: 10.00, stop: 9.50, target: 11.00, qty: 100),
      makeTrade(id: 'b', entry: 20.00, stop: 19.00, target: 22.00, qty: 50),
    ];
    final s = scenarios(trades);

    test('all winning sums every target', () {
      expect(s.totalExpectedProfit, closeTo(200.0, 1e-9));
      expect(s.bestCase, s.totalExpectedProfit);
    });

    test('all losing sums every stop and is negative', () {
      expect(s.totalExpectedLoss, closeTo(-100.0, 1e-9));
      expect(s.worstCase, s.totalExpectedLoss);
      expect(s.totalExpectedLoss, isNegative);
    });

    test('the open count is reported', () {
      expect(s.openCount, 2);
    });
  });

  group('one winner analysis', () {
    test('one winner nets its profit against every other stop', () {
      final s = scenarios([
        makeTrade(id: 'a', entry: 10.00, stop: 9.50, target: 11.00, qty: 100),
        makeTrade(id: 'b', entry: 20.00, stop: 19.00, target: 22.00, qty: 50),
      ]);

      // A wins (+100), B stopped (-50) -> +50. Symmetric for B.
      expect(s.oneWinner, hasLength(2));
      for (final outcome in s.oneWinner) {
        expect(outcome.net, closeTo(50.0, 1e-9));
        expect(outcome.coversTheRest, isTrue);
      }
    });

    test('a small winner cannot cover several larger losers', () {
      final s = scenarios([
        // Wins only 10 EGP.
        makeTrade(id: 'small', entry: 10.00, stop: 9.90, target: 10.10, qty: 100),
        makeTrade(id: 'big1', entry: 20.00, stop: 18.00, target: 22.00, qty: 100),
        makeTrade(id: 'big2', entry: 30.00, stop: 28.00, target: 32.00, qty: 100),
      ]);

      final small = s.oneWinner.firstWhere((o) => o.ticker == 'SMALL');
      // +10 against -200 and -200.
      expect(small.net, closeTo(10.0 - 400.0, 1e-9));
      expect(small.coversTheRest, isFalse);

      final big = s.oneWinner.firstWhere((o) => o.ticker == 'BIG1');
      // +200 against -10 and -200.
      expect(big.net, closeTo(200.0 - 210.0, 1e-9));
      expect(big.coversTheRest, isFalse);
    });

    test('a single open position nets exactly its own profit', () {
      final s = scenarios([
        makeTrade(id: 'a', entry: 10.00, stop: 9.50, target: 11.00, qty: 100),
      ]);
      expect(s.oneWinner.single.net, closeTo(100.0, 1e-9));
      expect(
        s.hasOneWinnerAnalysis,
        isFalse,
        reason: 'the comparison only means something with more than one',
      );
    });

    test('outcomes are ordered best first', () {
      final s = scenarios([
        makeTrade(id: 'poor', entry: 10.00, stop: 9.00, target: 10.20, qty: 100),
        makeTrade(id: 'rich', entry: 10.00, stop: 9.90, target: 13.00, qty: 100),
      ]);
      expect(s.oneWinner.first.ticker, 'RICH');
      expect(s.oneWinner.last.ticker, 'POOR');
    });

    test('input order does not change the result', () {
      final trades = [
        makeTrade(id: 'a', entry: 10.00, stop: 9.50, target: 11.00, qty: 100),
        makeTrade(id: 'b', entry: 20.00, stop: 19.00, target: 22.00, qty: 50),
        makeTrade(id: 'c', entry: 5.00, stop: 4.80, target: 5.50, qty: 200),
      ];
      List<double> nets(List<Trade> input) =>
          scenarios(input).oneWinner.map((o) => o.net).toList();
      expect(nets(trades), nets(trades.reversed.toList()));
    });

    test('equal nets are ordered by ticker for stability', () {
      final trades = [
        makeTrade(id: 'z', ticker: 'ZZZZ', entry: 10, stop: 9, target: 11, qty: 100),
        makeTrade(id: 'a', ticker: 'AAAA', entry: 10, stop: 9, target: 11, qty: 100),
      ];
      expect(scenarios(trades).oneWinner.first.ticker, 'AAAA');
    });
  });

  group('targets', () {
    test('an explicit target is used as written', () {
      final s = scenarios([
        makeTrade(id: 'a', entry: 10.00, target: 12.00, qty: 100),
      ], tp: 0.05);
      expect(s.totalExpectedProfit, closeTo(200.0, 1e-9));
    });

    // Without a fallback, positions entered before targets existed would
    // contribute zero profit and silently understate every upside scenario.
    test('a missing target falls back to the default percentage', () {
      final s = scenarios([
        makeTrade(id: 'a', entry: 10.00, qty: 100),
      ], tp: 0.05);
      // 10.00 -> 10.50, so +0.50 x 100.
      expect(s.totalExpectedProfit, closeTo(50.0, 1e-9));
    });

    test('the fallback target is rounded to the piastre', () {
      final s = scenarios([
        makeTrade(id: 'a', entry: 40.40, qty: 100),
      ], tp: 0.05);
      // 42.42, not 42.419999...
      expect(s.totalExpectedProfit, closeTo(202.0, 1e-9));
    });

    test('a target at or below entry is ignored in favour of the default', () {
      final s = scenarios([
        makeTrade(id: 'a', entry: 10.00, target: 9.00, qty: 100),
      ], tp: 0.05);
      expect(s.totalExpectedProfit, closeTo(50.0, 1e-9));
    });

    test('no target and no default contributes no profit but still risks', () {
      final s = scenarios([
        makeTrade(id: 'a', entry: 10.00, stop: 9.50, qty: 100),
      ], tp: 0);
      expect(s.totalExpectedProfit, 0.0);
      expect(s.totalExpectedLoss, closeTo(-50.0, 1e-9));
    });
  });

  test('a stop above entry produces a positive "loss", not a crash', () {
    // Bad data, but it must not throw or produce NaN.
    final s = scenarios([
      makeTrade(id: 'a', entry: 10.00, stop: 11.00, target: 12.00, qty: 100),
    ]);
    expect(s.totalExpectedLoss, closeTo(100.0, 1e-9));
    expect(s.totalExpectedLoss!.isFinite, isTrue);
  });
}
