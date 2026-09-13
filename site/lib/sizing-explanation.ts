import type { SmartTradePlan } from '@/lib/smart-trade';

/**
 * Why the calculator answered the number it did — in the trader's own figures.
 *
 * ── THE NUMBER WAS RIGHT AND NOBODY COULD SEE WHY ──────────────────────────
 *
 * The owner typed capital 45,000, budget 45,000, entry 380, stop 300 and got
 * «11 سهم» — and read it as broken, because the screen showed the answer and
 * the cap («حدّك المسموح 900») but never the division between them. The rule
 * is one line of arithmetic: loss budget ÷ loss per share. Printed with the
 * user's numbers in it, the 11 explains itself; hidden, it looks like a bug.
 *
 * PURE. Nothing here recomputes sizing — every figure comes off the plan that
 * `computeSmartTrade` already produced, so the explanation cannot disagree
 * with the answer it explains. The only arithmetic is the counterfactual
 * «what your cash alone would have bought», which is what the trader was
 * expecting to see and is the gap that needs naming.
 */

export type SizingExplanation = {
  /** The line of arithmetic behind the suggested quantity. */
  reason: string;
  /**
   * When the cash would have bought more than the rule allows: what that
   * larger position would lose at the stop, as money and as a share of
   * capital. This is the sentence that turns «why only 11» into «oh».
   */
  counterfactual: string | null;
  /** What to change to get more shares in, when the rule was the limit. */
  advice: string | null;
};

const fmt = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });
const int = new Intl.NumberFormat('en', { maximumFractionDigits: 0 });
const pct1 = new Intl.NumberFormat('en', { maximumFractionDigits: 1 });
const pct = (fraction: number) => `${pct1.format(fraction * 100)}%`;

export function explainSizing(
  plan: SmartTradePlan,
  budget: number | null,
  capital: number,
): SizingExplanation | null {
  const { sizing, entryPrice, stopLossPrice, riskPerShare } = plan;
  const qty = sizing.suggestedQty;
  if (
    qty === null ||
    entryPrice === null ||
    stopLossPrice === null ||
    riskPerShare === null ||
    riskPerShare <= 0
  ) {
    return null;
  }

  const byCash =
    budget !== null && budget > 0 ? Math.floor(budget / entryPrice) : null;

  if (sizing.capitalTooSmall) {
    return {
      reason:
        `حدّك ${fmt.format(sizing.maxLoss)} ج.م أقل من خسارة سهم واحد لو الاستوب اتضرب ` +
        `(${fmt.format(entryPrice)} − ${fmt.format(stopLossPrice)} = ${fmt.format(riskPerShare)} ج.م).`,
      counterfactual: null,
      advice: 'قرّب الاستوب من سعر الدخول، أو زوّد رأس المال.',
    };
  }

  if (sizing.limitedByBudget && budget !== null) {
    // `qty` here IS the cash-limited count, straight from the sizing result —
    // not re-floored locally, so an epsilon case cannot print 118 beside a
    // card that says 119.
    return {
      reason:
        `مبلغك ${fmt.format(budget)} ÷ ${fmt.format(entryPrice)} = ${int.format(qty)} سهم، ` +
        `وخسارتهم لو الاستوب اتضرب (${int.format(qty)} × ${fmt.format(riskPerShare)} = ` +
        `${fmt.format(qty * riskPerShare)} ج.م) جوّه حدّك ${fmt.format(sizing.maxLoss)} ج.م.`,
      counterfactual: null,
      advice: null,
    };
  }

  const reason =
    `حدّك ${fmt.format(sizing.maxLoss)} ج.م ÷ ${fmt.format(riskPerShare)} ج.م خسارة للسهم ` +
    `(${fmt.format(entryPrice)} − ${fmt.format(stopLossPrice)}) = ${int.format(qty)} سهم.`;

  let counterfactual: string | null = null;
  if (byCash !== null && byCash > qty && capital > 0) {
    const loss = byCash * riskPerShare;
    counterfactual =
      `مبلغك كان يشتري ${int.format(byCash)} سهم — بس لو الاستوب اتضرب هتخسر ` +
      `${fmt.format(loss)} ج.م، يعني ${pct(loss / capital)} من رأس مالك في صفقة واحدة.`;
  }

  return {
    reason,
    counterfactual,
    advice:
      'عشان تدخل بعدد أكبر: قرّب الاستوب من سعر الدخول — كل ما المسافة تقلّ، الأسهم تزيد بنفس الحد.',
  };
}
