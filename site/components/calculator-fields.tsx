"use client";

import type { InputMode } from "@/components/calculator-state";

export function Field({
  id,
  label,
  suffix,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  suffix: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold text-fg block">
        {label}
      </label>
      <div className="mt-1.5 flex items-center gap-2 rounded-md border border-border-default bg-surface-low px-3 py-1.5 focus-within:border-brand-ink">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          dir="ltr"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="num w-full bg-transparent text-start font-semibold outline-none text-sm"
        />
        <span className="shrink-0 text-xs text-fg-subtle">{suffix}</span>
      </div>
      {/* No `.num`: it sets `direction: ltr`, which throws a trailing «ج.م» to
          the head of an Arabic line. */}
      {hint && <p className="mt-1 text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
}

export function ToggleField({
  id,
  label,
  mode,
  value,
  onModeChange,
  onValueChange,
  derived,
  tone,
}: {
  id: string;
  label: string;
  mode: InputMode;
  value: string;
  onModeChange: (mode: InputMode) => void;
  onValueChange: (value: string) => void;
  /**
   * Whatever was NOT typed: the price when a percentage was entered, the
   * percentage when a price was. Mirrors LevelField in the app.
   *
   * This is what lets the summary drop the levels entirely — the answer sits
   * beside the question instead of being read back three fields later.
   */
  derived?: string | null;
  tone?: 'win' | 'loss';
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-semibold text-fg">
          {label}
        </label>
        <div className="flex rounded-md border border-border-default bg-surface-high p-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => onModeChange("price")}
            className={`rounded px-1.5 py-0.5 font-bold transition-all ${
              mode === "price"
                ? "bg-surface text-fg shadow-xs"
                : "text-fg-subtle"
            }`}
          >
            سعر
          </button>
          <button
            type="button"
            onClick={() => onModeChange("percent")}
            className={`rounded px-1.5 py-0.5 font-bold transition-all ${
              mode === "percent"
                ? "bg-surface text-fg shadow-xs"
                : "text-fg-subtle"
            }`}
          >
            نسبة %
          </button>
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-2 rounded-md border border-border-default bg-surface-low px-3 py-1.5 focus-within:border-brand-ink">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          dir="ltr"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          className="num w-full bg-transparent text-start font-semibold outline-none text-sm"
        />
        <span className="shrink-0 text-xs text-fg-subtle">
          {mode === "price" ? "ج.م" : "%"}
        </span>
      </div>
      {/* Absent rather than «—» when it cannot be worked out: an empty entry
          price is not a level of zero. */}
      {derived && (
        <p
          // `.num` on the WHOLE pill, not just the figure: the leading «=»
          // belongs to the left of the number, and in an RTL paragraph it lands
          // on the right instead. Same as NumericText in the app's LevelField.
          className={`num mt-1.5 rounded-md px-2 py-0.5 text-xs font-bold ${
            tone === "win"
              ? "bg-win-surface text-win"
              : tone === "loss"
                ? "bg-loss-surface text-loss"
                : "bg-surface-high text-fg-muted"
          }`}
        >
          = {derived}
        </p>
      )}
    </div>
  );
}

export function MetricRow({
  label,
  value,
  subtitle,
  tone,
}: {
  label: string;
  value: string;
  subtitle?: string;
  tone?: "win" | "loss";
}) {
  const toneClass =
    tone === "win" ? "text-win" : tone === "loss" ? "text-loss" : "";
  return (
    <div className="flex items-baseline justify-between gap-4 py-1 border-b border-border-default/50 last:border-0">
      <dt className="text-fg-muted flex items-center gap-1.5 text-xs">
        {label}
        {subtitle && (
          <span className="text-[11px] text-fg-subtle">({subtitle})</span>
        )}
      </dt>
      <dd className={`num font-bold text-sm ${toneClass}`}>{value}</dd>
    </div>
  );
}

export function WarningIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="mt-0.5 size-4 shrink-0"
      aria-hidden
    >
      <path d="M12 2.8 1.6 20.4h20.8L12 2.8Zm0 5.6a.9.9 0 0 1 .9.9v4.6a.9.9 0 1 1-1.8 0V9.3a.9.9 0 0 1 .9-.9Zm0 8.1a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1Z" />
    </svg>
  );
}
