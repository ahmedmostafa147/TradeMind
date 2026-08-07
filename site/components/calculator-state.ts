import { useMemo, useState } from 'react';

import { parseNumber } from '@/lib/risk-math';
import { computeSmartTrade } from '@/lib/smart-trade';

export type InputMode = 'price' | 'percent';

/**
 * State for the calculator widget. THE ARITHMETIC IS NOT HERE.
 *
 * It used to be: this hook floored the share count itself, derived its own
 * level prices and had no notion of a reward/risk verdict — a second engine
 * living beside `smart_trade.dart` and disagreeing with it. Everything numeric
 * now goes through {@link computeSmartTrade}, which is the mirror, so the
 * landing page, the dashboard and the phone answer with the same number.
 *
 * What is left is genuinely UI state: which mode each level is in, and the raw
 * strings the user is mid-way through typing.
 */
export function useCalculatorState({
  initialCapital,
  initialRisk,
  blankPrices = false,
}: {
  initialCapital?: number;
  initialRisk?: number;
  blankPrices?: boolean;
}) {
  const [capital, setCapital] = useState(
    initialCapital != null ? String(initialCapital) : '100000'
  );
  const [maxRisk, setMaxRisk] = useState(initialRisk ?? 0.02);
  const [entry, setEntry] = useState(blankPrices ? '' : '78.40');

  const [stopMode, setStopMode] = useState<InputMode>('price');
  const [stopVal, setStopVal] = useState(blankPrices ? '' : '74.50');

  const [targetMode, setTargetMode] = useState<InputMode>('price');
  const [targetVal, setTargetVal] = useState(blankPrices ? '' : '88.00');

  /**
   * «المبلغ اللي هدخل بيه» — the cash going into THIS position.
   *
   * The app's calculator has had it since the sizing rule learned about it;
   * the web's did not, so it kept sizing as though the whole account were
   * behind every trade.
   */
  const [budget, setBudget] = useState('');

  const [override, setOverride] = useState<string | null>(null);

  const plan = useMemo(
    () =>
      computeSmartTrade({
        capital: parseNumber(capital) ?? 0,
        maxRiskPercent: maxRisk,
        entryPrice: parseNumber(entry),
        // Whichever mode a level is in, the OTHER input is left null so the
        // shared calculation can apply its own precedence rule rather than
        // this hook second-guessing it.
        stopPrice: stopMode === 'price' ? parseNumber(stopVal) : null,
        stopLossPercent:
          stopMode === 'percent' ? (parseNumber(stopVal) ?? 0) / 100 : 0,
        targetPrice: targetMode === 'price' ? parseNumber(targetVal) : null,
        takeProfitPercent:
          targetMode === 'percent' ? (parseNumber(targetVal) ?? 0) / 100 : 0,
        budget: parseNumber(budget),
        userQty: override === null ? null : parseNumber(override),
      }),
    [
      capital,
      maxRisk,
      entry,
      stopMode,
      stopVal,
      targetMode,
      targetVal,
      budget,
      override,
    ]
  );

  const qtyVal =
    override ??
    (plan.sizing.suggestedQty === null ? '' : String(plan.sizing.suggestedQty));

  return {
    capital,
    setCapital,
    maxRisk,
    setMaxRisk,
    entry,
    setEntry,
    stopMode,
    setStopMode,
    stopVal,
    setStopVal,
    targetMode,
    setTargetMode,
    targetVal,
    setTargetVal,
    budget,
    setBudget,
    setOverride,
    plan,
    qtyVal,
  };
}
