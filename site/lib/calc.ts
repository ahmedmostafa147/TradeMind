/**
 * The one boundary between this site and the app's calculation layer.
 *
 * WHAT CHANGED, AND WHY IT IS WORTH A FILE
 * Every formula in Radar used to exist twice: once in lib/core/calc/ with 528
 * Dart tests behind it, and once here in TypeScript with none. CLAUDE.md §5
 * told whoever edited one to edit the other in the same commit. That is a rule
 * a person keeps, not a rule the code enforces — and the one time it slipped it
 * cost a real wrong answer: the calculator's inline `Math.floor(budget /
 * riskPerShare)` returned 999 shares where the app returned 1000, because the
 * Dart had an epsilon and the copy did not.
 *
 * lib/core/calc/ is already forbidden from importing Flutter — the constraint
 * that makes a layer portable — and Dart compiles to JavaScript. So the site
 * now runs the app's arithmetic instead of an imitation of it. See
 * tool/gen-calc-js.mjs.
 *
 * THE BRIDGE IS JSON IN, JSON OUT
 * Not because that is elegant, but because the alternative is modelling every
 * Dart class in JS interop and maintaining that model — a second copy of the
 * thing this removes. Measured cost of the round trip: 3.8 µs for a sizing
 * call, which is charged on every keystroke, and 6.6 ms for a full-journal
 * analytics pass over 700 trades. Both are inside one frame.
 */

import { radarCalc } from '@/lib/generated/radar-calc';

/**
 * Calls into the bundle and parses the answer.
 *
 * THROWS RATHER THAN RETURNING A FALLBACK, and that is the deliberate part.
 * A missing bundle is a build fault — the module either evaluated and set the
 * global or it did not — and the failure mode a fallback would create is the
 * one this whole change exists to remove: plausible numbers on screen that no
 * longer come from the source of truth. Silence is the expensive outcome here,
 * not a stack trace.
 *
 * `undefined` is stripped by JSON.stringify and non-finite numbers serialise as
 * null, which is exactly how the Dart side already treats both — so a
 * half-typed form field arrives as "absent" on both sides without any special
 * handling here.
 */
function call<T>(name: keyof NonNullable<typeof radarCalc>, args: unknown): T {
  if (!radarCalc) {
    throw new Error(
      'radar-calc.js did not load — the calculation layer is unavailable. ' +
        'Regenerate it with `npm --prefix site run calc`.'
    );
  }
  return JSON.parse(radarCalc[name](JSON.stringify(args))) as T;
}

export { call as callCalc };
