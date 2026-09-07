import 'package:flutter/foundation.dart';

/// «إشارات» — the quantitative screen for one EGX session.
///
/// MIRROR OF site/lib/egx-signals.ts. The documents are written by the analysis
/// notebook into `egxSignals/{YYYY-MM-DD}` and read by both clients, so the two
/// decoders must accept exactly the same shape.
///
/// Both clients are READ-ONLY on this collection, and so is everything else:
/// firestore.rules denies every client write. The only writer holds a service
/// account, which bypasses rules.
///
/// WHAT THE NUMBERS ARE, AND WHAT THEY ARE NOT
/// Every probability here was MEASURED, not modelled: for each candidate the
/// notebook finds days in that stock's own history when it looked as it looks
/// now, drops overlapping cases so one move is never counted twice, then walks
/// each case forward and asks which came first — the target or the stop. So a
/// [probability] of 34 means thirty-four of a hundred comparable past setups
/// reached the target before the stop, over [Signals.horizon] sessions. It is
/// not a forecast, and the UI must never render it as one.
///
/// [probabilityLow]/[probabilityHigh] are the 95% Wilson interval. They are
/// wide — often twenty points — because the sample has a hard ceiling: three
/// years of daily data, de-overlapped at a ten-session horizon, allows at most
/// seventy-two independent cases before any filtering. Showing the point
/// estimate without the interval would overstate what is known, so both are
/// required fields and neither is optional in this decoder.
@immutable
class EgxSignals {
  /// Session date, `YYYY-MM-DD`. Also the document id.
  final String date;

  /// When the notebook produced this. Distinct from [date]: a run after the
  /// close carries the same session date as one during it.
  final DateTime? generatedAt;

  /// Whether EGX was trading when the run happened. False means every price
  /// here is the previous close, which the UI has to say out loud — an entry
  /// condition checked against a stale price is not an entry condition.
  final bool marketOpen;

  final MarketState market;

  /// Ten-session candidates, already in the notebook's canonical order:
  /// positive expectancy first, then unproven, then negative.
  final List<Candidate> candidates;

  /// One-session table. Usually short, and often empty after commission —
  /// an empty list is a real answer here, not a failure.
  final List<NextSession> nextSession;

  /// Sixty-session list, scored on trend durability and fundamentals.
  final List<InvestmentPick> investment;

  /// Chance of each move size in the next session, per stock.
  final List<BigMove> bigMoves;

  /// Realised results of past published candidates. Null until enough
  /// snapshots have resolved. This is the only honest scorecard the system
  /// has, and it should be shown even when — especially when — it is worse
  /// than the historical study suggested.
  final Performance? performance;

  const EgxSignals({
    required this.date,
    required this.generatedAt,
    required this.marketOpen,
    required this.market,
    required this.candidates,
    required this.nextSession,
    required this.investment,
    required this.bigMoves,
    required this.performance,
  });

  /// Returns null only when the document has no usable session date — the one
  /// field nothing downstream can work without.
  ///
  /// Every LIST decodes per-record: a malformed row is dropped and the rest of
  /// the screen still renders, the same rule MarketFlows and the journal's
  /// restore path follow. A single bad candidate must not blank the tab.
  static EgxSignals? fromMap(Map<String, dynamic> map) {
    final date = map['date'];
    if (date is! String || date.isEmpty) return null;

    return EgxSignals(
      date: date,
      generatedAt: _toDate(map['generatedAt']),
      marketOpen: map['marketOpen'] == true,
      market: MarketState.fromMap(map['market']),
      candidates: _list(map['candidates'], Candidate.fromMap),
      nextSession: _list(map['nextSession'], NextSession.fromMap),
      investment: _list(map['investment'], InvestmentPick.fromMap),
      bigMoves: _list(map['bigMoves'], BigMove.fromMap),
      performance: Performance.fromMap(map['performance']),
    );
  }
}

/// The market backdrop. Never blocks decoding — a session with no market block
/// is still worth showing, so this falls back to zeros rather than null.
@immutable
class MarketState {
  final double score;
  final String environment;
  final int up;
  final int down;
  final double breadthPct;

  /// Total turnover in EGP.
  final double totalValue;
  final double pctAboveEma50;

  const MarketState({
    required this.score,
    required this.environment,
    required this.up,
    required this.down,
    required this.breadthPct,
    required this.totalValue,
    required this.pctAboveEma50,
  });

  static MarketState fromMap(Object? raw) {
    final m = raw is Map ? raw : const {};
    return MarketState(
      score: _toDouble(m['score']) ?? 0,
      environment: m['environment'] as String? ?? '',
      up: _toInt(m['up']) ?? 0,
      down: _toInt(m['down']) ?? 0,
      breadthPct: _toDouble(m['breadthPct']) ?? 0,
      totalValue: _toDouble(m['totalValue']) ?? 0,
      pctAboveEma50: _toDouble(m['pctAboveEma50']) ?? 0,
    );
  }
}

/// A ten-session candidate with its full trade plan.
@immutable
class Candidate {
  final int rank;
  final String symbol;
  final String name;
  final String industry;
  final double close;
  final double changePct;
  final double score;
  final double rsi;

  /// Enter only above this. Below it the setup has not triggered.
  final double entry;
  final double stop;
  final double stopPct;

  /// Where the stop came from — «EMA50», «قاع شهر». Shown so a level can be
  /// argued with instead of trusted.
  final String stopBasis;

  final double target1;
  final double target1Pct;
  final String target1Basis;

  /// True when reaching the first target means printing a new 52-week high.
  /// Materially harder than reaching an interior level, and invisible unless
  /// said, because the basis string alone can read as an ordinary high.
  final bool target1IsYearHigh;

  final double target2;
  final double target2Pct;
  final double riskReward;

  /// Null when the stock's history holds too few comparable cases to say
  /// anything. The UI must render that as «غير كافٍ», never as zero — a
  /// missing measurement and a measured zero are different claims.
  final double? probability;
  final double? probabilityLow;
  final double? probabilityHigh;

  /// How much of [probability] is available in the very first session. Usually
  /// a small fraction of it, which is the point: the headline number spans the
  /// whole horizon and reads as if it were about tomorrow.
  final double? probabilityTomorrow;

  /// Median sessions to the target among the cases that reached it. Says
  /// nothing about the ones that did not.
  final int? medianDays;

  /// Expected value per trade, in percent.
  final double? expectedValue;

  /// Expected value recomputed with the hit rate at the LOW end of the
  /// interval. [survivesStress] is that value being positive — the honest
  /// test of whether the data can rule out a losing trade.
  final double? expectedValueLow;
  final bool survivesStress;

  final int cases;

  /// «عالية» / «متوسطة» / «منخفضة» — a label for sample size, not for
  /// conviction.
  final String confidence;

  const Candidate({
    required this.rank,
    required this.symbol,
    required this.name,
    required this.industry,
    required this.close,
    required this.changePct,
    required this.score,
    required this.rsi,
    required this.entry,
    required this.stop,
    required this.stopPct,
    required this.stopBasis,
    required this.target1,
    required this.target1Pct,
    required this.target1Basis,
    required this.target1IsYearHigh,
    required this.target2,
    required this.target2Pct,
    required this.riskReward,
    required this.probability,
    required this.probabilityLow,
    required this.probabilityHigh,
    required this.probabilityTomorrow,
    required this.medianDays,
    required this.expectedValue,
    required this.expectedValueLow,
    required this.survivesStress,
    required this.cases,
    required this.confidence,
  });

  /// Null when the row lacks a symbol or a price — with either missing there is
  /// nothing to render and nothing to act on.
  static Candidate? fromMap(Object? raw) {
    if (raw is! Map) return null;
    final symbol = raw['symbol'];
    final close = _toDouble(raw['close']);
    if (symbol is! String || symbol.isEmpty || close == null) return null;

    return Candidate(
      rank: _toInt(raw['rank']) ?? 0,
      symbol: symbol,
      name: raw['name'] as String? ?? symbol,
      industry: raw['industry'] as String? ?? '',
      close: close,
      changePct: _toDouble(raw['changePct']) ?? 0,
      score: _toDouble(raw['score']) ?? 0,
      rsi: _toDouble(raw['rsi']) ?? 0,
      entry: _toDouble(raw['entry']) ?? close,
      stop: _toDouble(raw['stop']) ?? 0,
      stopPct: _toDouble(raw['stopPct']) ?? 0,
      stopBasis: raw['stopBasis'] as String? ?? '',
      target1: _toDouble(raw['target1']) ?? 0,
      target1Pct: _toDouble(raw['target1Pct']) ?? 0,
      target1Basis: raw['target1Basis'] as String? ?? '',
      target1IsYearHigh: raw['target1IsYearHigh'] == true,
      target2: _toDouble(raw['target2']) ?? 0,
      target2Pct: _toDouble(raw['target2Pct']) ?? 0,
      riskReward: _toDouble(raw['riskReward']) ?? 0,
      probability: _toDouble(raw['probability']),
      probabilityLow: _toDouble(raw['probabilityLow']),
      probabilityHigh: _toDouble(raw['probabilityHigh']),
      probabilityTomorrow: _toDouble(raw['probabilityTomorrow']),
      medianDays: _toInt(raw['medianDays']),
      expectedValue: _toDouble(raw['expectedValue']),
      expectedValueLow: _toDouble(raw['expectedValueLow']),
      survivesStress: raw['survivesStress'] == true,
      cases: _toInt(raw['cases']) ?? 0,
      confidence: raw['confidence'] as String? ?? '',
    );
  }

  /// True when the stock's history holds enough comparable cases to quote a
  /// probability at all.
  bool get hasProbability => probability != null;
}

/// A one-session setup, after commission.
@immutable
class NextSession {
  final int rank;
  final String symbol;
  final String name;
  final double close;
  final double target;
  final double targetPct;
  final String basis;
  final double stop;
  final double stopPct;
  final double riskReward;
  final double probability;
  final double probabilityLow;
  final double probabilityHigh;

  /// Expected value before costs.
  final double expectedValue;

  /// And after a round trip. On a one-session horizon the edge is measured in
  /// tenths of a percent while commission is fixed, so this is usually the
  /// number that decides — and it is usually negative.
  final double expectedValueNet;
  final bool paysCosts;
  final int cases;

  const NextSession({
    required this.rank,
    required this.symbol,
    required this.name,
    required this.close,
    required this.target,
    required this.targetPct,
    required this.basis,
    required this.stop,
    required this.stopPct,
    required this.riskReward,
    required this.probability,
    required this.probabilityLow,
    required this.probabilityHigh,
    required this.expectedValue,
    required this.expectedValueNet,
    required this.paysCosts,
    required this.cases,
  });

  static NextSession? fromMap(Object? raw) {
    if (raw is! Map) return null;
    final symbol = raw['symbol'];
    final close = _toDouble(raw['close']);
    if (symbol is! String || symbol.isEmpty || close == null) return null;

    return NextSession(
      rank: _toInt(raw['rank']) ?? 0,
      symbol: symbol,
      name: raw['name'] as String? ?? symbol,
      close: close,
      target: _toDouble(raw['target']) ?? 0,
      targetPct: _toDouble(raw['targetPct']) ?? 0,
      basis: raw['basis'] as String? ?? '',
      stop: _toDouble(raw['stop']) ?? 0,
      stopPct: _toDouble(raw['stopPct']) ?? 0,
      riskReward: _toDouble(raw['riskReward']) ?? 0,
      probability: _toDouble(raw['probability']) ?? 0,
      probabilityLow: _toDouble(raw['probabilityLow']) ?? 0,
      probabilityHigh: _toDouble(raw['probabilityHigh']) ?? 0,
      expectedValue: _toDouble(raw['expectedValue']) ?? 0,
      expectedValueNet: _toDouble(raw['expectedValueNet']) ?? 0,
      paysCosts: raw['paysCosts'] == true,
      cases: _toInt(raw['cases']) ?? 0,
    );
  }
}

/// A sixty-session hold, scored on trend and financials together.
@immutable
class InvestmentPick {
  final int rank;
  final String symbol;
  final String name;
  final String industry;
  final double close;

  /// 0-100 on trend, momentum and position.
  final double technicalGrade;

  /// 0-100 on valuation, returns, leverage, margins and growth — or null when
  /// the company publishes nothing to grade.
  final double? fundamentalGrade;

  /// What share of the fundamental checks had data. A strong grade over three
  /// fields is not a strong grade over ten, and the UI must show this beside
  /// [fundamentalGrade] rather than let one number imply the other.
  final double fundamentalCoverage;
  final String fundamentalLabel;

  final double? pe;
  final double? roe;
  final double? debtToEquity;
  final double? dividendYield;

  /// Share of comparable past periods that ended higher.
  final double upRate;
  final double medianReturn;

  /// The middle half of outcomes — the honest spread around [medianReturn].
  final double p25;
  final double p75;

  /// The worst dip endured DURING the holding period, before any recovery.
  /// The most important number in this record: a return you sell out of
  /// halfway is not a return you receive.
  final double medianDrawdown;
  final double worstDrawdown;

  final int cases;
  final int horizon;

  /// Consecutive runs this name has been on the list. A months-long list that
  /// reshuffles daily would contradict itself, so this is recorded rather than
  /// asserted.
  final int streak;

  const InvestmentPick({
    required this.rank,
    required this.symbol,
    required this.name,
    required this.industry,
    required this.close,
    required this.technicalGrade,
    required this.fundamentalGrade,
    required this.fundamentalCoverage,
    required this.fundamentalLabel,
    required this.pe,
    required this.roe,
    required this.debtToEquity,
    required this.dividendYield,
    required this.upRate,
    required this.medianReturn,
    required this.p25,
    required this.p75,
    required this.medianDrawdown,
    required this.worstDrawdown,
    required this.cases,
    required this.horizon,
    required this.streak,
  });

  static InvestmentPick? fromMap(Object? raw) {
    if (raw is! Map) return null;
    final symbol = raw['symbol'];
    final close = _toDouble(raw['close']);
    if (symbol is! String || symbol.isEmpty || close == null) return null;

    return InvestmentPick(
      rank: _toInt(raw['rank']) ?? 0,
      symbol: symbol,
      name: raw['name'] as String? ?? symbol,
      industry: raw['industry'] as String? ?? '',
      close: close,
      technicalGrade: _toDouble(raw['technicalGrade']) ?? 0,
      fundamentalGrade: _toDouble(raw['fundamentalGrade']),
      fundamentalCoverage: _toDouble(raw['fundamentalCoverage']) ?? 0,
      fundamentalLabel: raw['fundamentalLabel'] as String? ?? '',
      pe: _toDouble(raw['pe']),
      roe: _toDouble(raw['roe']),
      debtToEquity: _toDouble(raw['debtToEquity']),
      dividendYield: _toDouble(raw['dividendYield']),
      upRate: _toDouble(raw['upRate']) ?? 0,
      medianReturn: _toDouble(raw['medianReturn']) ?? 0,
      p25: _toDouble(raw['p25']) ?? 0,
      p75: _toDouble(raw['p75']) ?? 0,
      medianDrawdown: _toDouble(raw['medianDrawdown']) ?? 0,
      worstDrawdown: _toDouble(raw['worstDrawdown']) ?? 0,
      cases: _toInt(raw['cases']) ?? 0,
      horizon: _toInt(raw['horizon']) ?? 60,
      streak: _toInt(raw['streak']) ?? 1,
    );
  }
}

/// One rung of the big-move ladder: how often this stock travelled this far in
/// a single session, from a state like today's.
@immutable
class MoveStep {
  final double pct;
  final double price;

  /// Share of comparable sessions where the HIGH reached [pct]. Capturing that
  /// needs a resting limit order — it says nothing about where the day ended.
  final double touch;

  /// Share where it was still above [pct] at the close. Typically a half to a
  /// third of [touch]: the move happens, then gives most of itself back.
  final double closed;

  /// [touch] divided by the market-wide rate for the same move. A candidate at
  /// 1x is the base rate, not a signal.
  final double? lift;

  const MoveStep({
    required this.pct,
    required this.price,
    required this.touch,
    required this.closed,
    required this.lift,
  });

  static MoveStep? fromMap(Object? raw) {
    if (raw is! Map) return null;
    final pct = _toDouble(raw['pct']);
    if (pct == null) return null;
    return MoveStep(
      pct: pct,
      price: _toDouble(raw['price']) ?? 0,
      touch: _toDouble(raw['touch']) ?? 0,
      closed: _toDouble(raw['closed']) ?? 0,
      lift: _toDouble(raw['lift']),
    );
  }
}

@immutable
class BigMove {
  final int rank;
  final String symbol;
  final String name;
  final String industry;
  final double close;

  /// This stock's own daily price band — EGX is not one number, some names
  /// band at 10% and others at 20%. Rungs above it are impossible in a single
  /// session, not merely rare, so the ladder simply stops there.
  final double band;

  final double technicalGrade;
  final double? fundamentalGrade;
  final double fundamentalCoverage;
  final String fundamentalLabel;

  /// Ascending by [MoveStep.pct].
  final List<MoveStep> steps;
  final int cases;

  const BigMove({
    required this.rank,
    required this.symbol,
    required this.name,
    required this.industry,
    required this.close,
    required this.band,
    required this.technicalGrade,
    required this.fundamentalGrade,
    required this.fundamentalCoverage,
    required this.fundamentalLabel,
    required this.steps,
    required this.cases,
  });

  static BigMove? fromMap(Object? raw) {
    if (raw is! Map) return null;
    final symbol = raw['symbol'];
    final close = _toDouble(raw['close']);
    if (symbol is! String || symbol.isEmpty || close == null) return null;

    return BigMove(
      rank: _toInt(raw['rank']) ?? 0,
      symbol: symbol,
      name: raw['name'] as String? ?? symbol,
      industry: raw['industry'] as String? ?? '',
      close: close,
      band: _toDouble(raw['band']) ?? 0,
      technicalGrade: _toDouble(raw['technicalGrade']) ?? 0,
      fundamentalGrade: _toDouble(raw['fundamentalGrade']),
      fundamentalCoverage: _toDouble(raw['fundamentalCoverage']) ?? 0,
      fundamentalLabel: raw['fundamentalLabel'] as String? ?? '',
      steps: _list(raw['steps'], MoveStep.fromMap),
      cases: _toInt(raw['cases']) ?? 0,
    );
  }
}

/// What actually happened to previously published candidates.
@immutable
class Performance {
  final int trades;
  final int days;

  /// Share that reached the first target before the stop.
  final double hitRate;
  final double stopRate;
  final double averageReturn;
  final double medianReturn;

  const Performance({
    required this.trades,
    required this.days,
    required this.hitRate,
    required this.stopRate,
    required this.averageReturn,
    required this.medianReturn,
  });

  /// Null until enough published candidates have resolved. Callers show
  /// «لم يُقس بعد» rather than zeros — an unmeasured system and a system
  /// measured at zero are not the same statement.
  static Performance? fromMap(Object? raw) {
    if (raw is! Map) return null;
    final trades = _toInt(raw['trades']);
    if (trades == null || trades <= 0) return null;
    return Performance(
      trades: trades,
      days: _toInt(raw['days']) ?? 0,
      hitRate: _toDouble(raw['hitRate']) ?? 0,
      stopRate: _toDouble(raw['stopRate']) ?? 0,
      averageReturn: _toDouble(raw['averageReturn']) ?? 0,
      medianReturn: _toDouble(raw['medianReturn']) ?? 0,
    );
  }
}

/// Firestore hands back `int` for a whole number and `double` otherwise, and
/// the two SDKs disagree about which — the same trap firestore.rules documents
/// for `waitingThresholdDays`, and market_flows.dart for its money columns.
double? _toDouble(Object? value) {
  if (value is num) return value.toDouble();
  return null;
}

int? _toInt(Object? value) {
  if (value is num) return value.toInt();
  return null;
}

/// The notebook writes ISO-8601 strings; a hand-written document could carry a
/// Firestore Timestamp. Accept either without importing cloud_firestore here —
/// this file stays free of the SDK so it can be unit-tested without one.
DateTime? _toDate(Object? value) {
  if (value is String) return DateTime.tryParse(value);
  if (value is DateTime) return value;
  try {
    final d = (value as dynamic)?.toDate();
    return d is DateTime ? d : null;
  } catch (_) {
    return null;
  }
}

/// Decodes a list per record, dropping the ones that fail. One malformed row
/// must never empty a screen.
List<T> _list<T>(Object? raw, T? Function(Object?) decode) {
  if (raw is! List) return const [];
  return <T>[for (final item in raw) ?decode(item)];
}
