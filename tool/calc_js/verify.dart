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
  stdout.write(const JsonEncoder.withIndent('  ').convert(webNumbers(out)));
}

/// Prints numbers the way the compiled bundle prints them.
///
/// Dart on the VM has `int` and `double`; dart2js has neither — every Dart
/// number becomes one JavaScript number. So `jsonEncode(2500.0)` writes
/// `2500.0` here and `2500` through the bundle. That is a disagreement about
/// how a runtime SPELLS a number, not about the number: `2500.0 == 2500`, and
/// the JS side has no way to spell it the long way even when it wants to.
///
/// Left alone it puts 35 lines of noise into a diff whose entire contract is
/// that it comes back empty — a guard that is always red is a guard nobody
/// reads. So integral doubles are narrowed to `int`, which is the spelling
/// both runtimes can produce.
///
/// Two deliberate exclusions, both so a real disagreement stays visible:
///
///   * **Negative zero.** `-0.0` and `0` are different values — that is why
///     the migration in CLAUDE.md §24 compared with `Object.is` — so it is
///     never folded into `0`. If one ever appears the diff goes red, which is
///     the correct outcome for a number-shape difference that is real.
///   * **Anything past 2^53**, where a JS number stops being an exact integer
///     and both runtimes start choosing between exponent and long form on
///     their own. Narrowing there would invent agreement instead of testing
///     for it.
Object? webNumbers(Object? value) {
  if (value is double &&
      value.isFinite &&
      value == value.roundToDouble() &&
      value.abs() <= 9007199254740992.0 &&
      !(value == 0 && value.isNegative)) {
    return value.toInt();
  }
  if (value is Map) {
    return {
      for (final entry in value.entries) entry.key: webNumbers(entry.value),
    };
  }
  if (value is List) {
    return value.map(webNumbers).toList();
  }
  return value;
}
