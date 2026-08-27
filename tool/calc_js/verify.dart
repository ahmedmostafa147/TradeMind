// Runs every calc_api.dart function on the Dart VM and prints the results as
// one JSON document.
//
// tool/calc_js/verify.mjs does the same thing through the COMPILED JavaScript.
// Diff the two outputs and you have proof that the app's arithmetic and the
// site's arithmetic are the same arithmetic — not two implementations that
// currently agree.
import 'dart:convert';
import 'dart:io';

import 'calc_api.dart';

void main(List<String> args) {
  final path = args.isEmpty ? 'tool/calc_js/fixture.json' : args.first;
  final input = File(path).readAsStringSync();
  final f = jsonDecode(input) as Map<String, dynamic>;

  String pick(List<String> keys) =>
      jsonEncode({for (final k in keys) k: f[k]});

  final out = <String, Object?>{
    'analytics': jsonDecode(
      analytics(pick(['trades', 'capital', 'maxRiskPercent'])),
    ),
    'stats': jsonDecode(stats(pick(['trades', 'capital', 'maxRiskPercent']))),
    'decisions': jsonDecode(
      decisions(pick([
        'trades',
        'capital',
        'maxRiskPercent',
        'today',
        'waitingThresholdDays',
      ])),
    ),
    'scenarios': jsonDecode(
      scenarios(pick([
        'trades',
        'defaultTakeProfitPercent',
        'defaultStopLossPercent',
      ])),
    ),
    'riskScore': jsonDecode(
      riskScore(pick(['trade', 'capital', 'maxRiskPercent'])),
    ),
    'tradeMetrics': jsonDecode(
      tradeMetrics(pick(['trade', 'capital', 'maxRiskPercent'])),
    ),
    'sizing': jsonDecode(
      sizing(pick([
        'capital',
        'maxRiskPercent',
        'entry',
        'stop',
        'userQty',
        'budget',
      ])),
    ),
    'smartTrade': jsonDecode(
      smartTrade(pick([
        'capital',
        'maxRiskPercent',
        'takeProfitPercent',
        'stopLossPercent',
        'entryPrice',
        'userQty',
        'stopPrice',
        'targetPrice',
        'budget',
      ])),
    ),
    'goalPlan': jsonDecode(
      goalPlan(pick([
        'mode',
        'targetAmount',
        'monthlyDeposit',
        'years',
        'annualReturnPercent',
        'initialAmount',
      ])),
    ),
    'projection': jsonDecode(
      projection(pick(['trades', 'capital', 'targetAmount', 'maxRiskPercent'])),
    ),
    'entitlement': jsonDecode(
      entitlement(pick(['plan', 'trialStartedAt', 'proUntil', 'now'])),
    ),
    'riskMath': jsonDecode(
      riskMath(pick([
        'capital',
        'maxRiskPercent',
        'entry',
        'stop',
        'price',
        'a',
        'b',
        'ratio',
        'threshold',
        'riskPct',
      ])),
    ),
    'checklist': jsonDecode(checklist(jsonEncode(f['checklistIds']))),
  };

  // Sorted keys, two-space indent — the JS side prints the same shape, so a
  // plain byte diff is the whole test.
  stdout.write(const JsonEncoder.withIndent('  ').convert(out));
}
