"use client";

export function PercentPicker({
  presets,
  selectedPercent,
  onSelectPercent,
  valueText,
  onChangeText,
}: {
  presets: number[];
  selectedPercent: number | null;
  onSelectPercent: (fraction: number) => void;
  valueText: string;
  onChangeText: (text: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {presets.map((preset) => {
          const isSelected =
            selectedPercent != null &&
            Math.abs(selectedPercent - preset) < 1e-6;
          const label = `${(preset * 100).toFixed((preset * 100) % 1 !== 0 ? 1 : 0)}%`;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => onSelectPercent(preset)}
              aria-pressed={isSelected}
              className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
                isSelected
                  ? "border-transparent bg-brand text-on-brand shadow-sm"
                  : "border-border-default bg-surface-high text-fg-muted hover:bg-surface-subtle"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-border-default bg-surface-low px-2.5 py-1 text-xs focus-within:border-brand-ink">
        <span className="text-fg-subtle">%</span>
        <input
          type="text"
          inputMode="decimal"
          dir="ltr"
          value={valueText}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder="أخرى"
          className="num w-12 bg-transparent text-center font-bold text-fg outline-none"
        />
      </div>
    </div>
  );
}
