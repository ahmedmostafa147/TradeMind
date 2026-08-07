'use client';

import {
  Field,
  MetricRow,
  ToggleField,
  WarningIcon,
} from '@/components/calculator-fields';
import { useCalculatorState, type InputMode } from '@/components/calculator-state';
import { CheckCircleIcon, XIcon } from '@/components/icons';
import { money, percent, quantity as formatQuantity } from '@/lib/format';
import { QUALITY_LABEL, type SmartTradePlan } from '@/lib/smart-trade';

const RISK_PRESETS = [0.01, 0.015, 0.02, 0.03];

/** The half of the level the trader did not type. Mirrors LevelField's readout. */
function counterpart(
  mode: InputMode,
  price: number | null,
  pct: number | null
): string | null {
  if (mode === 'percent') return price === null ? null : money(price);
  return pct === null ? null : percent(pct);
}

export function CalculatorWidget(
  props: {
    initialCapital?: number;
    initialRisk?: number;
    blankPrices?: boolean;
  } = {}
) {
  const {
    capital, setCapital,
    maxRisk, setMaxRisk,
    entry, setEntry,
    stopMode, setStopMode,
    stopVal, setStopVal,
    targetMode, setTargetMode,
    targetVal, setTargetVal,
    budget, setBudget,
    setOverride,
    plan, qtyVal,
  } = useCalculatorState(props);

  const { sizing } = plan;

  return (
    <div className="grid gap-px overflow-hidden rounded-xl border border-border-default bg-border-default lg:grid-cols-2">
      {/* Right Column: Inputs */}
      <div className="bg-surface p-5 sm:p-6 space-y-4">
        <Field
          id="calc-capital"
          label="رأس المال"
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
                className={`num rounded-md border px-3 py-1 text-xs font-bold transition-colors ${
                  maxRisk === preset
                    ? 'border-transparent bg-brand text-on-brand'
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

        {/* Same field the app's calculator and both quick-add sheets carry.
            Without it the risk rule sizes as though the whole account were
            behind every trade. */}
        <Field
          id="calc-budget"
          label="المبلغ اللي هدخل بيه (اختياري)"
          suffix="ج.م"
          value={budget}
          onChange={(v) => { setBudget(v); setOverride(null); }}
          hint={
            sizing.limitedByBudget
              ? 'الكمية اتحددت بالمبلغ ده، مش بحد المخاطرة'
              : 'سيبه فاضي عشان يستخدم حد المخاطرة بس'
          }
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <ToggleField
            id="calc-stop"
            label="وقف الخسارة"
            mode={stopMode}
            value={stopVal}
            tone="loss"
            derived={counterpart(stopMode, plan.stopLossPrice, plan.stopLossPercent || null)}
            onModeChange={(m) => { setStopMode(m); setOverride(null); }}
            onValueChange={(v) => { setStopVal(v); setOverride(null); }}
          />
          <ToggleField
            id="calc-target"
            label="جني الأرباح"
            mode={targetMode}
            value={targetVal}
            tone="win"
            derived={counterpart(targetMode, plan.takeProfitPrice, plan.takeProfitPercent || null)}
            onModeChange={(m) => { setTargetMode(m); setOverride(null); }}
            onValueChange={(v) => { setTargetVal(v); setOverride(null); }}
          />
        </div>

        {plan.invertedStop && (
          <Notice tone="loss">سعر الاستوب لازم يكون أقل من سعر الدخول.</Notice>
        )}
        {plan.invertedTarget && (
          <Notice tone="loss">سعر الهدف لازم يكون أعلى من سعر الدخول.</Notice>
        )}
        {sizing.capitalTooSmall && (
          <Notice tone="muted">
            المسافة بين الدخول والاستوب أكبر من ميزانية الخسارة — مش هينفع تشتري
            ولا سهم واحد في الحد ده.
          </Notice>
        )}
      </div>

      {/* Left Column: the answer, and only the answer. */}
      <div className="bg-surface-low p-5 sm:p-6 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-baseline justify-between gap-3 rounded-lg border border-border-default bg-surface p-4">
            <div className="min-w-0">
              <p className="text-xs font-medium text-fg-subtle">الأسهم المقترحة للصفقة</p>
              <p className="num mt-1 text-3xl font-extrabold text-fg sm:text-4xl">
                {sizing.suggestedQty === null ? '—' : formatQuantity(sizing.suggestedQty)}
                {sizing.suggestedQty !== null && (
                  <span className="ms-2 text-sm font-semibold text-fg-muted">سهم</span>
                )}
              </p>
            </div>
            <QualityBadge plan={plan} />
          </div>

          {/* OUTPUTS ONLY — nothing here repeats a number that was typed on the
              other side. The levels used to be read back too; they now sit
              under their own inputs, which is where the answer to "what price
              is 5%?" belongs. Same wording as the app's summary card. */}
          <div className="space-y-1.5 border-t border-border-default pt-3">
            <MetricRow
              label="لو ضرب الاستوب"
              value={sizing.riskEgp === null ? '—' : `-${money(sizing.riskEgp)}`}
              tone="loss"
            />
            <MetricRow
              label="لو وصل الهدف"
              value={plan.expectedProfit === null ? '—' : `+${money(plan.expectedProfit)}`}
              tone="win"
            />
            <MetricRow
              label="المخاطرة من رأس المال"
              value={percent(sizing.riskPct)}
              subtitle={`حدّك ${money(sizing.maxLoss)}`}
              tone={sizing.overRisk ? 'loss' : undefined}
            />
            <MetricRow label="قيمة المركز" value={money(sizing.positionValue)} />
          </div>

          <div className="border-t border-border-default pt-3">
            <label htmlFor="calc-qty" className="text-xs font-semibold text-fg">
              تعديل يدوي للكمية (اختياري):
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

        {sizing.overRisk && (
          <p
            role="status"
            className="mt-3 flex items-start gap-2 rounded-md border border-loss-border bg-loss-surface p-2.5 text-xs font-bold text-loss"
          >
            <WarningIcon />
            <span>المخاطرة تتجاوز الحد المسموح ({percent(maxRisk)}).</span>
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * The reward/risk verdict — the app has had it since the calculator was
 * written, the site showed a bare R and painted it green whatever the number
 * was, so a 0.5R plan read as a good one.
 */
function QualityBadge({ plan }: { plan: SmartTradePlan }) {
  if (plan.quality === null || plan.rewardRiskRatio === null) return null;

  const tone =
    plan.quality === 'good'
      ? 'border-win-border bg-win-surface text-win'
      : plan.quality === 'warning'
        ? 'border-breakeven-border bg-breakeven-surface text-breakeven'
        : 'border-loss-border bg-loss-surface text-loss';

  const Icon = plan.quality === 'good' ? CheckCircleIcon : XIcon;

  return (
    <div
      className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-end ${tone}`}
      role="status"
    >
      <span className="flex items-center gap-1.5">
        <Icon className="size-4 shrink-0" />
        <span className="num text-base font-bold">
          {plan.rewardRiskRatio.toFixed(2)}R
        </span>
      </span>
      <span className="mt-0.5 block text-[11px] font-semibold">
        {QUALITY_LABEL[plan.quality]}
      </span>
    </div>
  );
}

function Notice({
  tone,
  children,
}: {
  tone: 'loss' | 'muted';
  children: React.ReactNode;
}) {
  return (
    <p
      role="status"
      className={`flex items-start gap-2 rounded-md border p-2.5 text-xs font-semibold ${
        tone === 'loss'
          ? 'border-loss-border bg-loss-surface text-loss'
          : 'border-border-default bg-surface-low text-fg-muted'
      }`}
    >
      {tone === 'loss' && <WarningIcon />}
      <span>{children}</span>
    </p>
  );
}
