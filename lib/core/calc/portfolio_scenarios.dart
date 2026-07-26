import '../../trades/trade.dart';
import '../../trades/trade_status.dart';
import 'risk_math.dart';

/// What the book returns if exactly one position reaches its target and every
/// other one is stopped out.
class OneWinnerOutcome {
  final String tradeId;
  final String ticker;

  /// This trade's profit at target, minus every other open trade's loss at
  /// stop.
  final double net;

  /// True when a single winner is enough to leave the book in profit — the
  /// question this whole analysis exists to answer.
  bool get coversTheRest => net > 0;

  const OneWinnerOutcome({
    required this.tradeId,
    required this.ticker,
    required this.net,
  });
}

/// Best/worst case across every currently open position.
///
/// Pure Dart. Every figure is null when there is nothing open, so the card
/// renders "—" rather than a misleading zero.
class PortfolioScenarios {
  final int openCount;

  /// Every open trade reaches its target.
  final double? totalExpectedProfit;

  /// Every open trade is stopped out. Negative.
  final double? totalExpectedLoss;

  /// One outcome per open trade, best first.
  final List<OneWinnerOutcome> oneWinner;

  const PortfolioScenarios._({
    required this.openCount,
    required this.totalExpectedProfit,
    required this.totalExpectedLoss,
    required this.oneWinner,
  });

  /// Identical to [totalExpectedProfit] / [totalExpectedLoss] — named for the
  /// card that shows them as "best" and "worst" case.
  double? get bestCase => totalExpectedProfit;
  double? get worstCase => totalExpectedLoss;

  /// Only meaningful with more than one position open.
  bool get hasOneWinnerAnalysis => oneWinner.length > 1;

  static const PortfolioScenarios empty = PortfolioScenarios._(
    openCount: 0,
    totalExpectedProfit: null,
    totalExpectedLoss: null,
    oneWinner: [],
  );

  /// [defaultTakeProfitPercent] and [defaultStopLossPercent] are fractions,
  /// used only for open trades carrying no usable target or stop of their own.
  ///
  /// Both sides need a fallback, and for a while only the profit side had one.
  /// The loss side trusted `stopPrice` verbatim, which produced two wrong
  /// answers on a trade whose stop was never set properly:
  ///
  ///   * stop 0 (a recommendation imported without one) made the loss the
  ///     entire position — 100 shares at 10.00 showed −1,000 rather than the
  ///     real risk, so "if every trade loses" read as a wipeout;
  ///   * a stop above entry produced a POSITIVE number, printing a profit on
  ///     the line labelled "if every trade loses".
  ///
  /// A stop is now only believed when it sits below entry, exactly as a target
  /// is only believed above it.
  factory PortfolioScenarios.from(
    List<Trade> trades, {
    required double defaultTakeProfitPercent,
    required double defaultStopLossPercent,
  }) {
    final open = [
      for (final trade in trades)
        if (trade.status == TradeStatus.open && trade.quantity > 0) trade,
    ];
    if (open.isEmpty) return empty;

    final profits = <double>[];
    final losses = <double>[];
    var totalProfit = 0.0;
    var totalLoss = 0.0;

    for (final trade in open) {
      final target = _targetOf(trade, defaultTakeProfitPercent);
      final profit = target == null
          ? 0.0
          : _finite((target - trade.entryPrice) * trade.quantity);

      // Negative: a stop below entry produces a loss. Null when the trade has
      // no usable stop and no default to fall back on, in which case it
      // contributes nothing rather than a fabricated number.
      final stop = _stopOf(trade, defaultStopLossPercent);
      final loss = stop == null
          ? 0.0
          : _finite((stop - trade.entryPrice) * trade.quantity);

      profits.add(profit);
      losses.add(loss);
      totalProfit += profit;
      totalLoss += loss;
    }

    final outcomes = <OneWinnerOutcome>[
      for (var i = 0; i < open.length; i++)
        OneWinnerOutcome(
          tradeId: open[i].id,
          ticker: open[i].ticker,
          // This one wins; every other one is stopped out. Subtracting its own
          // loss from the total is what removes it from the losing set.
          net: profits[i] + (totalLoss - losses[i]),
        ),
    ]..sort((a, b) {
      final byNet = b.net.compareTo(a.net);
      // Ticker tie-break keeps the order stable across rebuilds, since
      // List.sort is not stable and equal nets are common.
      return byNet != 0 ? byNet : a.ticker.compareTo(b.ticker);
    });

    return PortfolioScenarios._(
      openCount: open.length,
      totalExpectedProfit: totalProfit,
      totalExpectedLoss: totalLoss,
      oneWinner: List.unmodifiable(outcomes),
    );
  }

  /// The trade's own target, falling back to the configured default applied to
  /// its entry price.
  static double? _targetOf(Trade trade, double defaultPercent) {
    final stored = trade.takeProfitPrice;
    if (stored != null && stored.isFinite && stored > trade.entryPrice) {
      return stored;
    }
    if (!defaultPercent.isFinite || defaultPercent <= 0) return null;
    return roundToPiastre(trade.entryPrice * (1 + defaultPercent));
  }

  /// The trade's own stop, falling back to the configured default below its
  /// entry price.
  ///
  /// The mirror of [_targetOf], and it has to be: a stored value is only a stop
  /// if it is below entry and above zero. Zero is what a trade imported without
  /// a stop carries, and taking it literally values the loss at the whole
  /// position.
  static double? _stopOf(Trade trade, double defaultPercent) {
    final stored = trade.stopPrice;
    if (stored.isFinite && stored > 0 && stored < trade.entryPrice) {
      return stored;
    }
    if (!defaultPercent.isFinite || defaultPercent <= 0) return null;
    // roundToPiastre is nullable — a non-finite entry price has no rounding.
    final fallback = roundToPiastre(trade.entryPrice * (1 - defaultPercent));
    if (fallback == null || fallback <= 0) return null;
    return fallback;
  }

  static double _finite(double value) => value.isFinite ? value : 0.0;
}
