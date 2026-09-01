/**
 * Types for the generated bundle in radar-calc.js.
 *
 * Hand-written and NOT generated — the .js beside it is. It exists because
 * tsconfig has `allowJs: false`, deliberately: type-checking 92 KB of dart2js
 * output would be slow, pointless and noisy. A sidecar declaration gives the
 * call sites real types while the bundle itself stays outside the type system.
 *
 * Every function is JSON string in, JSON string out. That is the entire bridge,
 * and keeping it that narrow is why no Dart class has to be modelled here — the
 * typed shapes live in site/lib/calc.ts, one layer up.
 */

/** One JSON-in / JSON-out entry point into the compiled calculation layer. */
type CalcFn = (json: string) => string;

export declare const radarCalc:
  | {
      analytics: CalcFn;
      stats: CalcFn;
      decisions: CalcFn;
      scenarios: CalcFn;
      riskScore: CalcFn;
      tradeMetrics: CalcFn;
      sizing: CalcFn;
      smartTrade: CalcFn;
      goalPlan: CalcFn;
      projection: CalcFn;
      entitlement: CalcFn;
      riskMath: CalcFn;
      checklist: CalcFn;
      flowsHistory: CalcFn;
    }
  // Typed as possibly-undefined on purpose: the value is read off globalThis
  // after the bundle's own main() runs, and a caller that does not handle its
  // absence is a caller that would fail silently. site/lib/calc.ts is the one
  // place that has to deal with it.
  | undefined;
