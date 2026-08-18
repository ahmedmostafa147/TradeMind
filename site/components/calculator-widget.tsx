'use client';

import { Field } from '@/components/calculator-fields';
import { CalculatorLevelField } from '@/components/calculator-level-field';
import { useCalculatorState } from '@/components/calculator-state';
import { CalculatorSummaryCard } from '@/components/calculator-summary-card';

const RISK_PRESETS = [0.01, 0.015, 0.02, 0.03];
const TAKE_PROFIT_PRESETS = [0.03, 0.05, 0.07, 0.10];
const STOP_LOSS_PRESETS = [0.01, 0.02, 0.03, 0.05];

export function CalculatorWidget(props: {
  initialCapital?: number;
  initialRisk?: number;
  blankPrices?: boolean;
  onTradeCreate?: () => void;
}) {
  const {
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
  } = useCalculatorState(props);

  const stopError =
    stopMode === 'price' && plan.invertedStop
      ? 'سعر الاستوب لازم يكون أقل من سعر الدخول'
      : null;

  const targetError =
    targetMode === 'price' && plan.invertedTarget
      ? 'سعر الهدف لازم يكون أعلى من سعر الدخول'
      : null;

  return (
    <div className="mx-auto max-w-2xl space-y-5 rounded-2xl border border-border-default bg-surface p-4 sm:p-7 pb-8 shadow-lg">
      <div className="space-y-1">
        <h2 className="text-lg font-extrabold text-fg sm:text-xl">حاسبة الصفقة — منشئ الصفقة الذكي</h2>
        <p className="text-xs text-fg-subtle">
          اكتب سعر الدخول، وحدّد الهدف والاستوب بنسبة أو بسعر — والباقي بيتحسب لوحده.
        </p>
      </div>

      <div className="space-y-4">
        {/* 1. Capital (Optional) & Risk Presets */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            id="calc-capital"
            label="رأس المال (اختياري)"
            suffix="ج.م"
            value={capital}
            onChange={(v) => {
              setCapital(v);
              setOverride(null);
            }}
            hint="افتراضي من الإعدادات"
          />

          <div>
            <label className="block text-xs font-semibold text-fg">أقصى نسبة مخاطرة مسموحة</label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {RISK_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setMaxRisk(preset);
                    setOverride(null);
                  }}
                  aria-pressed={maxRisk === preset}
                  className={`num rounded-md border px-2.5 py-1 text-xs font-bold transition-all ${
                    maxRisk === preset
                      ? 'border-transparent bg-brand text-on-brand shadow-xs'
                      : 'border-border-default text-fg-muted hover:bg-surface-high'
                  }`}
                >
                  {(preset * 100).toFixed(preset === 0.015 ? 1 : 0)}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Budget — OPTIONAL, and it used to claim otherwise.
            It was labelled «إجباري» and painted a `--loss` red error under an
            untouched field on first paint, while the calculator went ahead and
            answered anyway — because it can. Leave it blank and the size comes
            from the risk rule alone; fill it in and it also caps the suggestion
            at the cash actually being committed. Same field, same behaviour,
            same wording as quick-add's «(اختياري)».

            The red is worth naming separately: `--loss` is the money colour, and
            it means «خسارة» on every other surface. Spending it on a form hint
            wears out the one signal the journal most needs to stay sharp. */}
        <Field
          id="calc-budget"
          label="المبلغ اللي هدخل بيه (اختياري)"
          suffix="ج.م"
          value={budget}
          onChange={(v) => {
            setBudget(v);
            setOverride(null);
          }}
          hint={
            plan.sizing.limitedByBudget
              ? 'الكمية اتحددت بالمبلغ ده'
              : 'سيبه فاضي وهيحسب بقاعدة المخاطرة لوحدها'
          }
        />

        {/* 3. Entry Price (Required) */}
        <Field
          id="calc-entry"
          label="سعر الدخول"
          suffix="ج.م"
          value={entry}
          onChange={(v) => {
            setEntry(v);
            setOverride(null);
          }}
          error={!entry.trim() ? 'ادخل سعر الدخول للسهم' : null}
        />

        {/* Take Profit */}
        <CalculatorLevelField
          id="calc-target"
          title="جني الأرباح"
          mode={targetMode}
          value={targetVal}
          onModeChange={(m) => {
            setTargetMode(m);
            setOverride(null);
          }}
          onValueChange={(v) => {
            setTargetVal(v);
            setOverride(null);
          }}
          presets={TAKE_PROFIT_PRESETS}
          derivedPrice={plan.takeProfitPrice}
          derivedPercent={plan.takeProfitPercent || null}
          priceError={targetError}
          helperText="لازم يكون أعلى من سعر الدخول"
          tone="win"
        />

        {/* Stop Loss */}
        <CalculatorLevelField
          id="calc-stop"
          title="وقف الخسارة"
          mode={stopMode}
          value={stopVal}
          onModeChange={(m) => {
            setStopMode(m);
            setOverride(null);
          }}
          onValueChange={(v) => {
            setStopVal(v);
            setOverride(null);
          }}
          presets={STOP_LOSS_PRESETS}
          derivedPrice={plan.stopLossPrice}
          derivedPercent={plan.stopLossPercent || null}
          priceError={stopError}
          helperText="لازم يكون أقل من سعر الدخول"
          tone="loss"
        />
      </div>

      {/* Summary Card */}
      <CalculatorSummaryCard plan={plan} onTradeCreate={props.onTradeCreate} />
    </div>
  );
}
