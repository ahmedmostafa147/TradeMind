import { useEffect, useMemo, useState } from 'react';

import { computeGoalPlan, type GoalPlanMode } from '@/lib/goal-plan';
import { parseNumber } from '@/lib/risk-math';

export type PlannerMode = GoalPlanMode;

/** Named so the chips can carry an SVG rather than an emoji. */
export type GoalPresetIcon = 'kids' | 'car' | 'retirement' | 'home';

export type GoalPreset = {
  id: GoalPresetIcon;
  title: string;
  defaultTarget: number;
  defaultYears: number;
};

/**
 * Starting points, not recommendations.
 *
 * THE PRESETS DELIBERATELY CARRY NO RETURN RATE. They used to set
 * `annualReturn: 20` alongside the amount, so picking «مستقبل الأبناء» quietly
 * asserted that 20% a year is what the EGX pays — a forward-looking return
 * figure presented by us, which is the exact claim RELEASE.md and the
 * disclaimer keep the product clear of. The amount and the horizon are the
 * user's own framing; the rate stays theirs to type.
 */
export const GOAL_PRESETS: GoalPreset[] = [
  { id: 'kids', title: 'مستقبل الأبناء', defaultTarget: 2000000, defaultYears: 18 },
  { id: 'car', title: 'شراء سيارة', defaultTarget: 1200000, defaultYears: 5 },
  { id: 'retirement', title: 'التقاعد الحر', defaultTarget: 5000000, defaultYears: 20 },
  { id: 'home', title: 'شراء عقار', defaultTarget: 3000000, defaultYears: 10 },
];

export function useGoalPlannerState({
  /**
   * The annual rate the user's own journal is running at, when there is one.
   *
   * Only the signed-in surfaces pass this: a visitor on the landing page has no
   * journal, so there is nothing to measure and the field starts empty rather
   * than pre-filled with a number we made up.
   */
  suggestedAnnualReturn = null,
  initialCapital = null,
}: {
  suggestedAnnualReturn?: number | null;
  initialCapital?: number | null;
} = {}) {
  const [mode, setMode] = useState<PlannerMode>('targetToMonthly');
  const [targetAmount, setTargetAmount] = useState('2000000');
  const [monthlyDeposit, setMonthlyDeposit] = useState('3000');
  const [years, setYears] = useState('18');
  const [annualReturn, setAnnualReturn] = useState('');
  const [initialDeposit, setInitialDeposit] = useState(
    initialCapital != null && initialCapital > 0 ? String(Math.round(initialCapital)) : ''
  );
  const [activePreset, setActivePreset] = useState<string>('kids');

  // Fills in once, when the journal has an answer — and never overwrites a rate
  // the user typed. An input that keeps snapping back to a computed value is an
  // input that cannot be argued with.
  const [touchedReturn, setTouchedReturn] = useState(false);
  useEffect(() => {
    if (touchedReturn || suggestedAnnualReturn == null) return;
    setAnnualReturn(suggestedAnnualReturn.toFixed(1));
  }, [suggestedAnnualReturn, touchedReturn]);

  function changeAnnualReturn(next: string) {
    setTouchedReturn(true);
    setAnnualReturn(next);
  }

  const applyPreset = (preset: GoalPreset) => {
    setActivePreset(preset.id);
    setTargetAmount(String(preset.defaultTarget));
    setYears(String(preset.defaultYears));
  };

  const plan = useMemo(
    () =>
      computeGoalPlan({
        mode,
        targetAmount: parseNumber(targetAmount),
        monthlyDeposit: parseNumber(monthlyDeposit),
        years: parseNumber(years),
        annualReturnPercent: parseNumber(annualReturn),
        initialAmount: parseNumber(initialDeposit),
      }),
    [mode, targetAmount, monthlyDeposit, years, annualReturn, initialDeposit]
  );

  return {
    mode,
    setMode,
    targetAmount,
    setTargetAmount,
    monthlyDeposit,
    setMonthlyDeposit,
    years,
    setYears,
    annualReturn,
    setAnnualReturn: changeAnnualReturn,
    initialDeposit,
    setInitialDeposit,
    activePreset,
    applyPreset,
    plan,
    /** Shown as a one-tap chip rather than silently applied a second time. */
    suggestedAnnualReturn,
  };
}
