// Runs every calc_api.dart function through the COMPILED JavaScript and prints
// the results in exactly the shape tool/calc_js/verify.dart prints them.
//
// The bundle it loads is the committed one the site imports:
//   site/lib/generated/radar-calc.js
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

// The bundle is an ES MODULE, not a classic script: gen-calc-js.mjs appends an
// `export const radarCalc` footer so the site's bundler follows the file and
// importers get a value instead of reaching for a global. That footer is why
// evaluating it with vm.runInThisContext — which parses classic-script
// syntax — died on `Unexpected token 'export'`, and left this half of the
// guard unrun.
//
// It is imported as a data: URL rather than by path because module-ness in Node
// comes from the package scope, and site/package.json has no `"type": "module"`
// — so `import('.../radar-calc.js')` is only accepted by Node's module-syntax
// DETECTION fallback, which warns on stderr and is not something a guard should
// depend on. A data: URL is unambiguously a module, needs no temp file, and
// leaves the committed bundle byte-identical — which matters, because
// gen-calc-js.mjs --check gates the build on that file's hash.
//
// The EXPORT is what gets read, not globalThis: that is the value the site
// actually imports, so the footer's contract is verified here too.
const source = readFileSync(bundle, 'utf8');
const module = await import(
  'data:text/javascript;base64,' +
    Buffer.from(source, 'utf8').toString('base64')
);

const calc = module.radarCalc ?? globalThis.radarCalc;
if (!calc) {
  console.error(
    `${bundle} exported no radarCalc and set no global — did main() run?`
  );
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
