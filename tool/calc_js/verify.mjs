// Runs every calc_api.dart function through the COMPILED JavaScript and prints
// the results in exactly the shape tool/calc_js/verify.dart prints them.
//
//   dart compile js -O4 -o <out>.js tool/calc_js/radar_calc.dart
//   dart run tool/calc_js/verify.dart            > vm.json
//   node tool/calc_js/verify.mjs <out>.js        > js.json
//   diff vm.json js.json
//
// An empty diff is the claim: one source of arithmetic, two runtimes.
import { readFileSync } from 'node:fs';

const bundle = process.argv[2];
if (!bundle) {
  console.error('usage: node tool/calc_js/verify.mjs <compiled bundle.js>');
  process.exit(2);
}

// The bundle's main() assigns globalThis.radarCalc, so evaluating it is all the
// wiring there is. No module system, no shim.
const { runInThisContext } = await import('node:vm');
runInThisContext(readFileSync(bundle, 'utf8'), { filename: bundle });

const calc = globalThis.radarCalc;
if (!calc) {
  console.error('globalThis.radarCalc was not set — did main() run?');
  process.exit(1);
}

const f = JSON.parse(
  readFileSync(process.argv[3] ?? 'tool/calc_js/fixture.json', 'utf8')
);

const pick = (keys) =>
  JSON.stringify(Object.fromEntries(keys.map((k) => [k, f[k] ?? null])));

const out = {
  analytics: JSON.parse(calc.analytics(pick(['trades', 'capital', 'maxRiskPercent']))),
  stats: JSON.parse(calc.stats(pick(['trades', 'capital', 'maxRiskPercent']))),
  decisions: JSON.parse(
    calc.decisions(
      pick(['trades', 'capital', 'maxRiskPercent', 'today', 'waitingThresholdDays'])
    )
  ),
  scenarios: JSON.parse(
    calc.scenarios(
      pick(['trades', 'defaultTakeProfitPercent', 'defaultStopLossPercent'])
    )
  ),
  riskScore: JSON.parse(calc.riskScore(pick(['trade', 'capital', 'maxRiskPercent']))),
  tradeMetrics: JSON.parse(
    calc.tradeMetrics(pick(['trade', 'capital', 'maxRiskPercent']))
  ),
  sizing: JSON.parse(
    calc.sizing(pick(['capital', 'maxRiskPercent', 'entry', 'stop', 'userQty', 'budget']))
  ),
  smartTrade: JSON.parse(
    calc.smartTrade(
      pick([
        'capital',
        'maxRiskPercent',
        'takeProfitPercent',
        'stopLossPercent',
        'entryPrice',
        'userQty',
        'stopPrice',
        'targetPrice',
        'budget',
      ])
    )
  ),
  goalPlan: JSON.parse(
    calc.goalPlan(
      pick([
        'mode',
        'targetAmount',
        'monthlyDeposit',
        'years',
        'annualReturnPercent',
        'initialAmount',
      ])
    )
  ),
  projection: JSON.parse(
    calc.projection(pick(['trades', 'capital', 'targetAmount', 'maxRiskPercent']))
  ),
  entitlement: JSON.parse(
    calc.entitlement(pick(['plan', 'trialStartedAt', 'proUntil', 'now']))
  ),
  riskMath: JSON.parse(
    calc.riskMath(
      pick([
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
      ])
    )
  ),
  checklist: JSON.parse(calc.checklist(JSON.stringify(f.checklistIds))),
};

process.stdout.write(JSON.stringify(out, null, 2));
