/**
 * The plain calculator: «هدخل بكام على سعر كام» ↔ «كام سهم على سعر كام».
 *
 * ── THIS IS NOT THE RISK RULE, AND IT DOES NOT PRETEND TO BE ───────────────
 *
 * The smart calculator answers "how many shares keep my loss inside my limit
 * if the stop hits", and a trader who typed 45,000 and 380 into it got 11 —
 * correct, and not the question they were asking. This one answers the plain
 * one: 45,000 ÷ 380 = 118 shares for 44,840 with 160 left over, or 118 × 380
 * = 44,840. No stop, no limit, no verdict. The screen says so next to it, and
 * hands the trader to the smart mode for the part that protects them.
 *
 * PURE and tiny on purpose. It is deliberately NOT routed through the Dart
 * calc bundle: there is no epsilon question in a whole-share floor of cash ÷
 * price at the magnitudes a retail order has, and CLAUDE.md §17's rule is
 * about not having three copies of the SIZING formula — this is not that.
 */

export type PlainPosition =
  | {
      kind: 'from-budget';
      price: number;
      budget: number;
      shares: number;
      cost: number;
      leftover: number;
    }
  | {
      kind: 'from-shares';
      price: number;
      shares: number;
      cost: number;
    };

export function computePlainPosition({
  price,
  budget,
  shares,
}: {
  price: number | null;
  budget: number | null;
  shares: number | null;
}): PlainPosition | null {
  if (price === null || !Number.isFinite(price) || price <= 0) return null;

  if (shares !== null && Number.isFinite(shares) && shares > 0) {
    const whole = Math.floor(shares);
    if (whole <= 0) return null;
    const cost = whole * price;
    return Number.isFinite(cost)
      ? { kind: 'from-shares', price, shares: whole, cost }
      : null;
  }

  if (budget !== null && Number.isFinite(budget) && budget > 0) {
    const count = Math.floor(budget / price);
    const cost = count * price;
    return {
      kind: 'from-budget',
      price,
      budget,
      shares: count,
      cost,
      leftover: budget - cost,
    };
  }

  return null;
}
