// The calc layer's public API, as JSON in / JSON out.
//
// PURE DART — no dart:js_interop here, on purpose. This file has to run on the
// Dart VM as well as in a browser, because that is the whole point: the same
// source answers on both, and tool/calc_js/verify.dart proves it by running
// these functions natively and diffing against the compiled JavaScript.
//
// Nothing below reimplements anything. Every function decodes JSON, hands it to
// the SAME source the Android app runs, and encodes the result back.
import 'dart:convert';

import 'package:egx_trade_journal/billing/entitlements.dart';
import 'package:egx_trade_journal/core/calc/daily_decisions.dart';
import 'package:egx_trade_journal/core/calc/flows_history.dart';
import 'package:egx_trade_journal/core/calc/goal_plan.dart';
import 'package:egx_trade_journal/core/calc/goal_projection.dart';
import 'package:egx_trade_journal/core/calc/journal_analytics.dart';
import 'package:egx_trade_journal/core/calc/journal_stats.dart';
import 'package:egx_trade_journal/core/calc/portfolio_scenarios.dart';
import 'package:egx_trade_journal/core/calc/risk_math.dart';
import 'package:egx_trade_journal/core/calc/risk_score.dart';
import 'package:egx_trade_journal/core/calc/sizing_result.dart';
import 'package:egx_trade_journal/core/calc/smart_trade.dart';
import 'package:egx_trade_journal/core/calc/trade_metrics.dart';
import 'package:egx_trade_journal/trades/checklist.dart';
import 'package:egx_trade_journal/trades/timeline_entry.dart';
import 'package:egx_trade_journal/trades/trade.dart';
import 'package:egx_trade_journal/trades/trade_status.dart';

// ── decoding ───────────────────────────────────────────────────────────────

DateTime? _date(Object? v) => v is String ? DateTime.tryParse(v) : null;

double? _num(Object? v) => v is num ? v.toDouble() : null;

List<String> _strings(Object? v) =>
    v is List ? [for (final e in v) if (e is String) e] : const [];

Trade _trade(Map<String, dynamic> m) => Trade(
  id: m['id'] as String? ?? '',
  entryDate: _date(m['entryDate']) ?? DateTime.now(),
  ticker: m['ticker'] as String? ?? '',
  reason: m['reason'] as String? ?? '',
  entryPrice: _num(m['entryPrice']) ?? 0,
  stopPrice: _num(m['stopPrice']) ?? 0,
  quantity: (m['quantity'] as num?)?.toInt() ?? 0,
  exitPrice: _num(m['exitPrice']),
  exitDate: _date(m['exitDate']),
  notes: m['notes'] as String?,
  status: TradeStatus.fromName(
    m['status'] as String?,
    fallback: m['exitPrice'] == null ? TradeStatus.open : TradeStatus.closed,
  ),
  tags: _strings(m['tags']),
  isFavorite: m['isFavorite'] == true,
  screenshotPaths: _strings(m['screenshotPaths']),
  completedChecklistItems: _strings(m['completedChecklistItems']),
  timeline: [
    if (m['timeline'] is List)
      for (final e in m['timeline'] as List)
        if (e is Map)
          TimelineEntry(
            date: _date(e['date']) ?? DateTime.now(),
            text: e['text'] as String? ?? '',
          ),
  ],
  source: m['source'] as String?,
  takeProfitPrice: _num(m['takeProfitPrice']),
);

List<Trade> _trades(Object? v) => v is List
    ? [for (final e in v) if (e is Map) _trade(Map<String, dynamic>.from(e))]
    : const [];

// ── encoding ───────────────────────────────────────────────────────────────

Map<String, Object?> _period(PeriodPnl p) => {
  'start': p.start.toIso8601String(),
  'pnl': p.pnl,
  'tradeCount': p.tradeCount,
};

Map<String, Object?>? _tag(TagStat? t) => t == null
    ? null
    : {
        'tag': t.tag,
        'totalPnl': t.totalPnl,
        'tradeCount': t.tradeCount,
        'winCount': t.winCount,
      };

Map<String, Object?>? _extreme(TradeExtreme? e) => e == null
    ? null
    : {
        'tradeId': e.tradeId,
        'ticker': e.ticker,
        'pnl': e.pnl,
        'exitDate': e.exitDate.toIso8601String(),
      };

Map<String, Object?> _metrics(TradeMetrics m) => {
  'positionValue': m.positionValue,
  'riskEgp': m.riskEgp,
  'riskPct': m.riskPct,
  'pnl': m.pnl,
  'returnPct': m.returnPct,
  'rMultiple': m.rMultiple,
  'isOpen': m.isOpen,
  'overRisk': m.overRisk,
  'result': m.result.name,
};

Map<String, Object?> _item(DecisionItem d) => {
  'tradeId': d.trade.id,
  'ticker': d.trade.ticker,
  'metrics': _metrics(d.metrics),
  'daysSinceEntry': d.daysSinceEntry,
  'daysSinceUpdate': d.daysSinceUpdate,
};

Map<String, Object?> _sizingOf(SizingResult s) => {
  'maxLoss': s.maxLoss,
  'riskPerShare': s.riskPerShare,
  'suggestedQty': s.suggestedQty,
  'effectiveQty': s.effectiveQty,
  'positionValue': s.positionValue,
  'riskEgp': s.riskEgp,
  'riskPct': s.riskPct,
  'overRisk': s.overRisk,
  'capitalTooSmall': s.capitalTooSmall,
  'limitedByBudget': s.limitedByBudget,
  'budget': s.budget,
};

// ── the API ────────────────────────────────────────────────────────────────

String analytics(String json) {
  final m = jsonDecode(json) as Map<String, dynamic>;
  final a = JournalAnalytics.from(
    _trades(m['trades']),
    capital: _num(m['capital']) ?? 0,
    maxRiskPercent: _num(m['maxRiskPercent']) ?? 0,
  );
  return jsonEncode({
    'averageHoldingDays': a.averageHoldingDays,
    'longestWinStreak': a.longestWinStreak,
    'longestLossStreak': a.longestLossStreak,
    'bestTrade': _extreme(a.bestTrade),
    'worstTrade': _extreme(a.worstTrade),
    'mostTradedTicker': a.mostTradedTicker,
    'mostTradedTickerCount': a.mostTradedTickerCount,
    'averagePositionValue': a.averagePositionValue,
    'averageRiskPct': a.averageRiskPct,
    'monthlyPnl': a.monthlyPnl.map(_period).toList(),
    'weeklyPnl': a.weeklyPnl.map(_period).toList(),
    'bestWeekday': a.bestWeekday,
    'bestWeekdayPnl': a.bestWeekdayPnl,
    'worstWeekday': a.worstWeekday,
    'worstWeekdayPnl': a.worstWeekdayPnl,
    'bestMonth': a.bestMonth,
    'bestMonthPnl': a.bestMonthPnl,
    'worstMonth': a.worstMonth,
    'worstMonthPnl': a.worstMonthPnl,
    'averageProfit': a.averageProfit,
    'averageLoss': a.averageLoss,
    'largestGain': a.largestGain,
    'largestLoss': a.largestLoss,
    'averageR': a.averageR,
    'medianR': a.medianR,
    'expectancy': a.expectancy,
    'profitFactor': a.profitFactor,
    'tagStats': a.tagStats.map(_tag).toList(),
    'mostProfitableTag': _tag(a.mostProfitableTag),
    'mostLosingTag': _tag(a.mostLosingTag),
    'sourceStats': a.sourceStats.map(_tag).toList(),
    'bestSource': _tag(a.bestSource),
    'worstSource': _tag(a.worstSource),
  });
}

String stats(String json) {
  final m = jsonDecode(json) as Map<String, dynamic>;
  final s = JournalStats.from(
    _trades(m['trades']),
    capital: _num(m['capital']) ?? 0,
    maxRiskPercent: _num(m['maxRiskPercent']) ?? 0,
  );
  return jsonEncode({
    'closedCount': s.closedCount,
    'winCount': s.winCount,
    'lossCount': s.lossCount,
    'breakevenCount': s.breakevenCount,
    'openCount': s.openCount,
    'plannedCount': s.plannedCount,
    'cancelledCount': s.cancelledCount,
    'favoriteCount': s.favoriteCount,
    'averageChecklistCompletion': s.averageChecklistCompletion,
    'winRate': s.winRate,
    'totalPnl': s.totalPnl,
    'averageR': s.averageR,
    'avgWinEgp': s.avgWinEgp,
    'avgLossEgp': s.avgLossEgp,
    'currentCapital': s.currentCapital,
    'totalReturnPct': s.totalReturnPct,
    'equityCurve': [
      for (final p in s.equityCurve)
        {'date': p.date.toIso8601String(), 'equity': p.equity},
    ],
  });
}

String decisions(String json) {
  final m = jsonDecode(json) as Map<String, dynamic>;
  final d = DailyDecisions.from(
    _trades(m['trades']),
    capital: _num(m['capital']) ?? 0,
    maxRiskPercent: _num(m['maxRiskPercent']) ?? 0,
    today: _date(m['today']) ?? DateTime.now(),
    waitingThresholdDays: (m['waitingThresholdDays'] as num?)?.toInt() ?? 7,
  );
  return jsonEncode({
    'overRisk': d.overRisk.map(_item).toList(),
    'open': d.open.map(_item).toList(),
    'planned': d.planned.map(_item).toList(),
    'needsReview': d.needsReview.map(_item).toList(),
    'waitingTooLong': d.waitingTooLong.map(_item).toList(),
    'recentlyClosed': d.recentlyClosed.map(_item).toList(),
  });
}

String scenarios(String json) {
  final m = jsonDecode(json) as Map<String, dynamic>;
  final s = PortfolioScenarios.from(
    _trades(m['trades']),
    defaultTakeProfitPercent: _num(m['defaultTakeProfitPercent']) ?? 0.05,
    defaultStopLossPercent: _num(m['defaultStopLossPercent']) ?? 0.02,
  );
  return jsonEncode({
    'openCount': s.openCount,
    'totalExpectedProfit': s.totalExpectedProfit,
    'totalExpectedLoss': s.totalExpectedLoss,
    'oneWinner': [
      for (final o in s.oneWinner)
        {'tradeId': o.tradeId, 'ticker': o.ticker, 'net': o.net},
    ],
  });
}

String riskScore(String json) {
  final m = jsonDecode(json) as Map<String, dynamic>;
  final r = RiskScore.of(
    _trade(Map<String, dynamic>.from(m['trade'] as Map)),
    capital: _num(m['capital']) ?? 0,
    maxRiskPercent: _num(m['maxRiskPercent']) ?? 0,
  );
  return jsonEncode({
    'checklistComplete': r.checklistComplete,
    'riskWithinLimit': r.riskWithinLimit,
    'hasStop': r.hasStop,
    'hasDetailedReason': r.hasDetailedReason,
  });
}

String tradeMetrics(String json) {
  final m = jsonDecode(json) as Map<String, dynamic>;
  return jsonEncode(
    _metrics(
      TradeMetrics.of(
        _trade(Map<String, dynamic>.from(m['trade'] as Map)),
        capital: _num(m['capital']) ?? 0,
        maxRiskPercent: _num(m['maxRiskPercent']) ?? 0,
      ),
    ),
  );
}

String sizing(String json) {
  final m = jsonDecode(json) as Map<String, dynamic>;
  return jsonEncode(
    _sizingOf(
      SizingResult.compute(
        capital: _num(m['capital']) ?? 0,
        maxRiskPercent: _num(m['maxRiskPercent']) ?? 0,
        entry: _num(m['entry']),
        stop: _num(m['stop']),
        userQty: (m['userQty'] as num?)?.toInt(),
        budget: _num(m['budget']),
      ),
    ),
  );
}

String smartTrade(String json) {
  final m = jsonDecode(json) as Map<String, dynamic>;
  final p = SmartTradePlan.compute(
    capital: _num(m['capital']) ?? 0,
    maxRiskPercent: _num(m['maxRiskPercent']) ?? 0,
    takeProfitPercent: _num(m['takeProfitPercent']) ?? 0.05,
    stopLossPercent: _num(m['stopLossPercent']) ?? 0.02,
    entryPrice: _num(m['entryPrice']),
    userQty: (m['userQty'] as num?)?.toInt(),
    stopPrice: _num(m['stopPrice']),
    targetPrice: _num(m['targetPrice']),
    budget: _num(m['budget']),
  );
  return jsonEncode({
    'entryPrice': p.entryPrice,
    'takeProfitPercent': p.takeProfitPercent,
    'stopLossPercent': p.stopLossPercent,
    'takeProfitPrice': p.takeProfitPrice,
    'stopLossPrice': p.stopLossPrice,
    'rewardPerShare': p.rewardPerShare,
    'riskPerShare': p.riskPerShare,
    'rewardRiskRatio': p.rewardRiskRatio,
    'quality': p.quality?.name,
    'sizing': _sizingOf(p.sizing),
    'expectedProfit': p.expectedProfit,
    'expectedLoss': p.expectedLoss,
  });
}

String goalPlan(String json) {
  final m = jsonDecode(json) as Map<String, dynamic>;
  final g = computeGoalPlan(
    // Parsed by the enum's own name, which is the same string the
    // TypeScript mirror uses as its union member. Guessing here would let
    // an unknown mode fall through to a default and quietly answer a
    // different question than the one asked.
    mode: GoalPlanMode.values.firstWhere(
      (v) => v.name == m['mode'],
      orElse: () => GoalPlanMode.targetToMonthly,
    ),
    targetAmount: _num(m['targetAmount']),
    monthlyDeposit: _num(m['monthlyDeposit']),
    years: _num(m['years']),
    annualReturnPercent: _num(m['annualReturnPercent']),
    initialAmount: _num(m['initialAmount']),
  );
  return jsonEncode({
    'mode': g.mode.name,
    'monthlyDeposit': g.monthlyDeposit,
    'futureValue': g.futureValue,
    'totalDeposited': g.totalDeposited,
    'growth': g.growth,
    'months': g.months,
    'monthlyRate': g.monthlyRate,
    'coveredByInitial': g.coveredByInitial,
    'annualFromMonthly': annualReturnFromMonthlyRate(g.monthlyRate),
    'minYears': kMinGoalYears,
    'maxYears': kMaxGoalYears,
    'maxAnnualReturn': kMaxAnnualReturn,
  });
}

String projection(String json) {
  final m = jsonDecode(json) as Map<String, dynamic>;
  final trades = _trades(m['trades']);
  final p = projectGoal(
    trades: trades,
    capital: _num(m['capital']) ?? 0,
    target: _num(m['targetAmount']) ?? 0,
    // The measured edge, taken from the same analytics the app reads it from —
    // never a figure the caller made up. This is the whole point of keeping the
    // two «الهدف» questions apart.
    expectancy: JournalAnalytics.from(
      trades,
      capital: _num(m['capital']) ?? 0,
      maxRiskPercent: _num(m['maxRiskPercent']) ?? 0,
    ).expectancy,
  );
  return jsonEncode({
    'kind': p.kind.name,
    'months': p.months,
    'beyondHorizon': p.beyondHorizon,
    'expectancy': p.expectancy,
    'tradesPerMonth': p.tradesPerMonth,
    'monthlyProfit': p.monthlyProfit,
    'monthlyRate': p.monthlyRate,
    'closedCount': p.closedCount,
    'minClosedTrades': kMinClosedTradesForProjection,
    'maxMonths': kMaxProjectionMonths,
    'tradesPerMonthDirect': tradesPerMonth([
      for (final t in trades)
        if (t.exitDate != null) t.exitDate!,
    ]),
  });
}

String entitlement(String json) {
  final m = jsonDecode(json) as Map<String, dynamic>;
  final started = _date(m['trialStartedAt']);
  final e = entitlementOf(
    storedPlan: m['plan'] as String?,
    trialStartedAt: started,
    proUntil: _date(m['proUntil']),
    now: _date(m['now']) ?? DateTime.now(),
  );
  return jsonEncode({
    'plan': e.plan.name,
    'trialDaysLeft': e.trialDaysLeft,
    'shouldWarnAboutTrial': e.shouldWarnAboutTrial,
    'features': {for (final f in Feature.values) f.name: e.can(f)},
    'trialEndsAt': trialEndsAt(started)?.toIso8601String(),
    'trialDays': kTrialDays,
    'everythingFree': kEverythingFree,
  });
}

String riskMath(String json) {
  final m = jsonDecode(json) as Map<String, dynamic>;
  final maxLoss = maxLossPerTrade(
    capital: _num(m['capital']) ?? 0,
    maxRiskPercent: _num(m['maxRiskPercent']) ?? 0,
  );
  return jsonEncode({
    'maxLoss': maxLoss,
    'suggestedQuantity': suggestedQuantity(
      maxLoss: maxLoss,
      entry: _num(m['entry']) ?? 0,
      stop: _num(m['stop']) ?? 0,
    ),
    'roundToPiastre': roundToPiastre(_num(m['price']) ?? 0),
    'safeDiv': safeDiv(_num(m['a']) ?? 0, _num(m['b']) ?? 1),
    'meetsRatio': meetsRatio(_num(m['ratio']), _num(m['threshold']) ?? 0),
    'exceedsRiskLimit': exceedsRiskLimit(
      _num(m['riskPct']) ?? 0,
      _num(m['maxRiskPercent']) ?? 0,
    ),
  });
}

String checklist(String json) {
  final ids = _strings(jsonDecode(json));
  return jsonEncode({
    'completion': checklistCompletion(ids),
    'complete': isChecklistComplete(ids),
    'items': [
      for (final i in ChecklistItem.values) {'id': i.id, 'label': i.label},
    ],
  });
}

/// One nationality's window of EGX sessions, read rather than listed.
///
/// Input is a bare JSON array of numbers and nulls — `[5, 4, null, -3]`,
/// newest first — because that is all the rule needs, and keeping the bridge
/// free of the flows document's shape means neither the site nor the app has
/// to reshape anything to ask.
String flowsHistory(String json) {
  final decoded = jsonDecode(json);
  final nets = <double?>[
    if (decoded is List)
      for (final v in decoded) v is num ? v.toDouble() : null,
  ];

  final run = flowRun(nets);
  if (run == null) return jsonEncode(null);
  return jsonEncode({
    'runLength': run.runLength,
    'runBuying': run.runBuying,
    'total': run.total,
    'sessions': run.sessions,
    'hasRun': run.hasRun,
  });
}
