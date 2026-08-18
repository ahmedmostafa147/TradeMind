'use client';

import { PercentPicker } from '@/components/calculator-presets';
import { formatThousands } from '@/components/calculator-fields';
import type { InputMode } from '@/components/calculator-state';
import { money, percent } from '@/lib/format';

export function CalculatorLevelField({
  id,
  title,
  mode,
  value,
  onModeChange,
  onValueChange,
  presets,
  derivedPrice,
  derivedPercent,
  priceError,
  helperText,
  tone,
}: {
  id: string;
  title: string;
  mode: InputMode;
  value: string;
  onModeChange: (mode: InputMode) => void;
  onValueChange: (value: string) => void;
  presets: number[];
  derivedPrice: number | null;
  derivedPercent: number | null;
  priceError?: string | null;
  helperText: string;
  tone: 'win' | 'loss';
}) {
  const currentFraction = mode === 'percent' ? (parseFloat(value) || 0) / 100 : null;

  return (
    <div className="space-y-2 rounded-xl border border-border-default bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-fg">{title}</span>
        <div className="flex rounded-lg border border-border-default bg-surface-high p-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => onModeChange('price')}
            className={`rounded-md px-2.5 py-1 font-bold transition-all ${
              mode === 'price'
                ? 'bg-brand text-on-brand shadow-xs'
                : 'text-fg-subtle hover:text-fg'
            }`}
          >
            سعر
          </button>
          <button
            type="button"
            onClick={() => onModeChange('percent')}
            className={`rounded-md px-2.5 py-1 font-bold transition-all ${
              mode === 'percent'
                ? 'bg-brand text-on-brand shadow-xs'
                : 'text-fg-subtle hover:text-fg'
            }`}
          >
            نسبة
          </button>
        </div>
      </div>

      {mode === 'percent' ? (
        <div className="space-y-2">
          <PercentPicker
            presets={presets}
            selectedPercent={currentFraction}
            onSelectPercent={(fraction) => {
              onModeChange('percent');
              const p = fraction * 100;
              onValueChange(p % 1 === 0 ? p.toFixed(0) : p.toFixed(1));
            }}
            valueText={value}
            onChangeText={(t) => {
              onModeChange('percent');
              onValueChange(t);
            }}
          />

          {derivedPrice !== null && (
            <div className="flex justify-end">
              <span
                className={`num rounded-md px-2.5 py-1 text-xs font-bold ${
                  tone === 'win'
                    ? 'bg-win-surface text-win'
                    : 'bg-loss-surface text-loss'
                }`}
              >
                = {money(derivedPrice)}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 rounded-md border border-border-default bg-surface-low px-3 py-1.5 focus-within:border-brand-ink">
            <input
              id={id}
              type="text"
              inputMode="decimal"
              dir="ltr"
              value={value}
              onChange={(e) => onValueChange(formatThousands(e.target.value))}
              placeholder="0.00"
              className="num w-full bg-transparent text-start font-semibold text-sm text-fg outline-none"
            />
            <span className="shrink-0 text-xs text-fg-subtle">ج.م</span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className={priceError ? 'font-semibold text-loss' : 'text-fg-subtle'}>
              {priceError || helperText}
            </span>

            {derivedPercent !== null && !priceError && (
              <span
                className={`num rounded-md px-2 py-0.5 font-bold ${
                  tone === 'win'
                    ? 'bg-win-surface text-win'
                    : 'bg-loss-surface text-loss'
                }`}
              >
                = {percent(derivedPercent)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
