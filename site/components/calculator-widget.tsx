'use client';

import { Field, MetricRow, ToggleField, WarningIcon } from '@/components/calculator-fields';
import { useCalculatorState } from '@/components/calculator-state';
import { money, percent, quantity as formatQuantity } from '@/lib/format';

const RISK_PRESETS = [0.01, 0.015, 0.02, 0.03];

/** The half of the level the trader did not type. Mirrors LevelField's readout. */
function counterpart(
  mode: 'price' | 'percent',
  price: number | null,
  pct: number | null
): string | null {
  if (mode === 'percent') return price === null ? null : money(price);
  return pct === null ? null : percent(pct);
}

export function CalculatorWidget(props: {
  initialCapital?: number;
  initialRisk?: number;
  blankPrices?: boolean;
} = {}) {
  const {
    capital, setCapital,
    maxRisk, setMaxRisk,
    entry, setEntry,
    stopMode, setStopMode,
    stopVal, setStopVal,
    targetMode, setTargetMode,
    targetVal, setTargetVal,
    setOverride,
    res, qtyVal,
  } = useCalculatorState(props);

  return (
    <div className="grid gap-px overflow-hidden rounded-xl border border-border-default bg-border-default lg:grid-cols-2">
      {/* Right Column: Inputs */}
      <div className="bg-surface p-5 sm:p-6 space-y-4">
        <Field
          id="calc-capital"
          label="مبلغ الصفقة / رأس المال المخصص"
          suffix="ج.م"
          value={capital}
          onChange={(v) => { setCapital(v); setOverride(null); }}
        />

        <fieldset>
          <legend className="text-xs font-semibold text-fg">أقصى نسبة مخاطرة مسموحة</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {RISK_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => { setMaxRisk(preset); setOverride(null); }}
                aria-pressed={maxRisk === preset}
                className={`num rounded-md border px-3 py-1 text-xs font-bold transition-all ${
                  maxRisk === preset
                    ? 'border-transparent bg-brand text-on-brand shadow-xs'
                    : 'border-border-default text-fg-muted hover:bg-surface-high'
                }`}
              >
                {(preset * 100).toFixed(preset === 0.015 ? 1 : 0)}%
              </button>
            ))}
          </div>
        </fieldset>

        <Field
          id="calc-entry"
          label="سعر الدخول للسهم"
          suffix="ج.م"
          value={entry}
          onChange={(v) => { setEntry(v); setOverride(null); }}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <ToggleField
            id="calc-stop"
            label="وقف الخسارة"
            mode={stopMode}
            value={stopVal}
            tone="loss"
            derived={counterpart(stopMode, res.sPrice, res.stopPct)}
            onModeChange={(m) => { setStopMode(m); setOverride(null); }}
            onValueChange={(v) => { setStopVal(v); setOverride(null); }}
          />
          <ToggleField
            id="calc-target"
            label="جني الأرباح"
            mode={targetMode}
            value={targetVal}
            tone="win"
            derived={counterpart(targetMode, res.tPrice, res.targetPct)}
            onModeChange={(m) => { setTargetMode(m); setOverride(null); }}
            onValueChange={(v) => { setTargetVal(v); setOverride(null); }}
          />
        </div>

        {res.invStop && (
          <p
            role="status"
            className="flex items-start gap-2 text-xs font-semibold text-loss"
          >
            <WarningIcon />
            <span>سعر الاستوب لازم يكون أقل من سعر الدخول.</span>
          </p>
        )}
      </div>

      {/* Left Column: Trade Summary */}
      <div className="bg-surface-low p-5 sm:p-6 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-baseline justify-between rounded-lg bg-surface p-4 border border-border-default shadow-xs">
            <div>
              <p className="text-xs font-medium text-fg-subtle">الأسهم المقترحة للصفقة</p>
              <p className="num mt-1 text-4xl font-extrabold text-fg">
                {res.suggested === null ? '—' : formatQuantity(res.suggested)}
                {res.suggested !== null && (
                  <span className="ms-2 text-sm font-semibold text-fg-muted">سهم</span>
                )}
              </p>
            </div>
            {res.rrRatio !== null && (
              <div className="text-end">
                <span className="text-[11px] text-fg-subtle block">العائد للمخاطرة</span>
                <span className="num text-lg font-bold text-win">{res.rrRatio.toFixed(2)}R</span>
              </div>
            )}
          </div>

          {/* OUTPUTS ONLY — nothing here repeats a number that was typed on
              the other side. The levels used to be read back too; they now sit
              under their own inputs, which is where the answer to "what price
              is 5%?" belongs. Same wording as the app's summary card. */}
          <div className="space-y-1.5 border-t border-border-default pt-3">
            <MetricRow
              label="لو ضرب الاستوب"
              value={res.riskEgp ? `-${money(res.riskEgp)}` : '—'}
              tone="loss"
            />
            <MetricRow
              label="لو وصل الهدف"
              value={res.profitEgp == null ? '—' : `+${money(res.profitEgp)}`}
              tone="win"
            />
            <MetricRow
              label="المخاطرة من رأس المال"
              value={percent(res.riskPct)}
              tone={res.over ? 'loss' : undefined}
            />
            <MetricRow
              label="قيمة المركز"
              subtitle={res.posPct != null ? `${(res.posPct * 100).toFixed(1)}% من رأس المال` : undefined}
              value={money(res.posVal)}
            />
          </div>

          <div className="border-t border-border-default pt-3">
            <label htmlFor="calc-qty" className="text-xs font-semibold text-fg">
              تعديل يدوي للكمية (اختباري):
            </label>
            <input
              id="calc-qty"
              type="text"
              inputMode="numeric"
              dir="ltr"
              value={qtyVal}
              onChange={(e) => setOverride(e.target.value)}
              className="num mt-1.5 w-full rounded-md border border-border-default bg-surface px-3 py-1.5 text-start font-semibold text-xs outline-none focus:border-brand-ink"
              placeholder="اكتب عدد أسهم للتجربة..."
            />
          </div>
        </div>

        {res.over && (
          <p role="status" className="mt-3 flex items-start gap-2 rounded-md border border-loss-border bg-loss-surface p-2.5 text-xs font-bold text-loss">
            <WarningIcon />
            <span>المخاطرة تتجاوز الحد المسموح ({percent(maxRisk)}).</span>
          </p>
        )}
      </div>
    </div>
  );
}
