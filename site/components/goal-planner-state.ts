import { useMemo, useState } from 'react';
import { parseNumber } from '@/lib/risk-math';

export type PlannerMode = 'targetToMonthly' | 'monthlyToTarget';

/**
 * THERE WAS AN `icon` FIELD HERE CARRYING 🎓 🚗 🌴 🏠, and it is gone rather than
 * replaced with SVGs.
 *
 * Zero emoji on the site is an explicit owner preference — SVG icons only, from
 * components/icons.tsx. But four new SVGs would have been the wrong fix too: each
 * chip already carries a full text label, so a pictogram beside «شراء سيارة» adds
 * no information, and an emoji renders in whatever the reader's OS ships, so the
 * set looked different on every device it was seen on.
 */
export type GoalPreset = {
  id: string;
  title: string;
  defaultTarget: number;
  defaultYears: number;
  annualReturn: number;
};

export const GOAL_PRESETS: GoalPreset[] = [
  { id: 'kids', title: 'مستقبل الأبناء', defaultTarget: 2000000, defaultYears: 18, annualReturn: 20 },
  { id: 'car', title: 'شراء سيارة', defaultTarget: 1200000, defaultYears: 5, annualReturn: 20 },
  { id: 'retirement', title: 'التقاعد الحر', defaultTarget: 5000000, defaultYears: 20, annualReturn: 20 },
  { id: 'home', title: 'شراء عقار', defaultTarget: 3000000, defaultYears: 10, annualReturn: 20 },
];

export function useGoalPlannerState() {
  const [mode, setMode] = useState<PlannerMode>('targetToMonthly');
  const [targetAmount, setTargetAmount] = useState('2000000');
  const [monthlyDeposit, setMonthlyDeposit] = useState('3000');
  const [years, setYears] = useState('18');
  const [annualReturn, setAnnualReturn] = useState('20');
  const [initialDeposit, setInitialDeposit] = useState('50000');
  const [activePreset, setActivePreset] = useState<string>('kids');

  const applyPreset = (preset: GoalPreset) => {
    setActivePreset(preset.id);
    setTargetAmount(String(preset.defaultTarget));
    setYears(String(preset.defaultYears));
    setAnnualReturn(String(preset.annualReturn));
  };

  const calc = useMemo(() => {
    const t = parseNumber(targetAmount) ?? 0;
    const m = parseNumber(monthlyDeposit) ?? 0;
    const y = Math.max(1, parseNumber(years) ?? 1);
    const ret = parseNumber(annualReturn) ?? 20;
    const init = parseNumber(initialDeposit) ?? 0;

    const totalMonths = y * 12;
    const monthlyRate = Math.pow(1 + ret / 100, 1 / 12) - 1;

    if (mode === 'targetToMonthly') {
      const initFv = init * Math.pow(1 + monthlyRate, totalMonths);
      const neededFv = Math.max(0, t - initFv);
      const reqMonthly = monthlyRate > 0
        ? (neededFv * monthlyRate) / (Math.pow(1 + monthlyRate, totalMonths) - 1)
        : neededFv / totalMonths;

      const totalInvested = init + (reqMonthly * totalMonths);
      const totalProfit = Math.max(0, t - totalInvested);

      return {
        reqMonthly: Math.round(reqMonthly),
        totalFutureValue: t,
        totalInvested: Math.round(totalInvested),
        totalProfit: Math.round(totalProfit),
        totalMonths,
      };
    } else {
      const initFv = init * Math.pow(1 + monthlyRate, totalMonths);
      const monthlyFv = monthlyRate > 0
        ? m * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate)
        : m * totalMonths;

      const totalFutureValue = initFv + monthlyFv;
      const totalInvested = init + (m * totalMonths);
      const totalProfit = Math.max(0, totalFutureValue - totalInvested);

      return {
        reqMonthly: m,
        totalFutureValue: Math.round(totalFutureValue),
        totalInvested: Math.round(totalInvested),
        totalProfit: Math.round(totalProfit),
        totalMonths,
      };
    }
  }, [mode, targetAmount, monthlyDeposit, years, annualReturn, initialDeposit]);

  return {
    mode, setMode,
    targetAmount, setTargetAmount,
    monthlyDeposit, setMonthlyDeposit,
    years, setYears,
    annualReturn, setAnnualReturn,
    initialDeposit, setInitialDeposit,
    activePreset, applyPreset,
    calc,
  };
}
