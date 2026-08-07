'use client';

import {
  GOAL_PRESETS,
  type GoalPreset,
  type GoalPresetIcon,
  type PlannerMode,
} from '@/components/goal-planner-state';
import {
  CarIcon,
  GraduationIcon,
  HomeIcon,
  PalmIcon,
  TargetIcon,
  WalletIcon,
} from '@/components/icons';

const PRESET_ICONS: Record<
  GoalPresetIcon,
  (props: { className?: string }) => React.ReactElement
> = {
  kids: GraduationIcon,
  car: CarIcon,
  retirement: PalmIcon,
  home: HomeIcon,
};

export function ModeSwitcher({
  mode,
  onChange,
}: {
  mode: PlannerMode;
  onChange: (mode: PlannerMode) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="اتجاه الحساب"
      className="flex flex-col gap-1 rounded-xl border border-border-default bg-surface-high p-1 text-xs sm:flex-row sm:text-sm"
    >
      <ModeButton
        active={mode === 'targetToMonthly'}
        onClick={() => onChange('targetToMonthly')}
        icon={<TargetIcon className="size-4 shrink-0" />}
        label="عندي مبلغ مستهدف — أحطّ كام في الشهر؟"
      />
      <ModeButton
        active={mode === 'monthlyToTarget'}
        onClick={() => onChange('monthlyToTarget')}
        icon={<WalletIcon className="size-4 shrink-0" />}
        label="هحطّ مبلغ شهري — هوصل لكام؟"
      />
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-start font-bold transition-colors ${
        active
          ? 'bg-brand text-on-brand'
          : 'text-fg-muted hover:bg-surface hover:text-fg'
      }`}
    >
      {icon}
      <span className="flex-1 sm:flex-none">{label}</span>
    </button>
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
      {GOAL_PRESETS.map((preset) => {
        const Icon = PRESET_ICONS[preset.id];
        const active = activeId === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(preset)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
              active
                ? 'border-brand-ink bg-surface text-fg'
                : 'border-border-default bg-surface-low text-fg-muted hover:bg-surface-high'
            }`}
          >
            <Icon className="size-4" />
            <span>{preset.title}</span>
          </button>
        );
      })}
    </div>
  );
}

export function PlannerInput({
  id,
  label,
  value,
  suffix,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  suffix: string;
  onChange: (v: string) => void;
  hint?: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-fg">
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
          className="num w-full bg-transparent text-start text-sm font-semibold outline-none"
        />
        <span className="shrink-0 text-xs text-fg-subtle">{suffix}</span>
      </div>
      {/* No `.num` on the hint: it sets `direction: ltr`, which throws a
          trailing «%» or «ج.م» to the head of an Arabic line. */}
      {hint && <p className="mt-1 text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
}
