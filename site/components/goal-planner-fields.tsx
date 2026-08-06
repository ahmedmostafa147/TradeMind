'use client';

import { GOAL_PRESETS, type GoalPreset, type PlannerMode } from '@/components/goal-planner-state';

export function ModeSwitcher({
  mode,
  onChange,
}: {
  mode: PlannerMode;
  onChange: (mode: PlannerMode) => void;
}) {
  return (
    <div className="flex rounded-xl border border-border-default bg-surface-high p-1 text-xs sm:text-sm">
      <button
        type="button"
        onClick={() => onChange('targetToMonthly')}
        className={`flex-1 rounded-lg py-2.5 px-3 font-bold transition-all ${
          mode === 'targetToMonthly'
            ? 'bg-brand text-on-brand shadow-sm'
            : 'text-fg-muted hover:text-fg'
        }`}
      >
        🎯 عندي مبلغ مستهدف واعرف أستثمر كام شهرياً
      </button>
      <button
        type="button"
        onClick={() => onChange('monthlyToTarget')}
        className={`flex-1 rounded-lg py-2.5 px-3 font-bold transition-all ${
          mode === 'monthlyToTarget'
            ? 'bg-brand text-on-brand shadow-sm'
            : 'text-fg-muted hover:text-fg'
        }`}
      >
        💵 هحط مبلغ شهري واعرف ثروتي هتكون كام
      </button>
    </div>
  );
}

export function GoalPresetList({
  activeId,
  onSelect,
}: {
  activeId: string;
  onSelect: (preset: GoalPreset) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {GOAL_PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onSelect(preset)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
            activeId === preset.id
              ? 'border-brand-ink bg-surface text-fg shadow-xs'
              : 'border-border-default bg-surface-low text-fg-muted hover:bg-surface-high'
          }`}
        >
          <span>{preset.icon}</span>
          <span>{preset.title}</span>
        </button>
      ))}
    </div>
  );
}

export function PlannerInput({
  id,
  label,
  value,
  suffix,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  suffix: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold text-fg block mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-lg border border-border-default bg-surface-low px-3 py-2 focus-within:border-brand-ink">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          dir="ltr"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="num w-full bg-transparent text-start font-semibold text-sm outline-none"
        />
        <span className="shrink-0 text-xs text-fg-subtle">{suffix}</span>
      </div>
    </div>
  );
}
