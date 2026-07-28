'use client';

import { useMemo, useState } from 'react';

import { money, percent, quantity as formatQuantity } from '@/lib/format';
import {
  exceedsRiskLimit,
  maxLossPerTrade,
  parseNumber,
  safeDiv,
  suggestedQuantity,
} from '@/lib/risk-math';

/**
 * The app's position-size calculator, running for real on the landing page.
 *
 * Two reasons it is live rather than a screenshot. It is the product's whole
 * argument — that the size is decided BEFORE the trade — and an argument you
 * can operate in ten seconds beats one you have to install to evaluate. And it
 * is what a competitor puts behind a paid trial; giving away the arithmetic
 * costs nothing, because the arithmetic was never the moat. The journal is.
 *
 * It imports lib/risk-math.ts, which is a faithful port of the Dart original
 * including both epsilons — so the number here is the number the app gives.
 */

const RISK_PRESETS = [0.01, 0.015, 0.02, 0.03];

export function CalculatorWidget() {
  const [capital, setCapital] = useState('100000');
  const [maxRisk, setMaxRisk] = useState(0.02);
  const [entry, setEntry] = useState('78.40');
  const [stop, setStop] = useState('74.50');

  /** null until the visitor overrides it, so the suggestion drives the display. */
  const [override, setOverride] = useState<string | null>(null);

  const result = useMemo(() => {
    const c = parseNumber(capital) ?? 0;
    const e = parseNumber(entry) ?? 0;
    const s = parseNumber(stop) ?? 0;

    const budget = maxLossPerTrade(c, maxRisk);
    const suggested = suggestedQuantity(budget, e, s);

    const typed = override === null ? null : parseNumber(override);
    const qty = typed !== null && typed >= 0 ? Math.floor(typed) : suggested;

    if (qty === null || qty === 0) {
      return {
        suggested,
        qty,
        riskEgp: null,
        riskPct: null,
        positionValue: null,
        over: false,
        budget,
        // A stop above the entry is the one input mistake worth naming, since
        // it silently produces "no answer" rather than a wrong one.
        invertedStop: e > 0 && s > 0 && s >= e,
      };
    }

    const riskEgp = (e - s) * qty;
    const riskPct = safeDiv(riskEgp, c);
    const positionValue = e * qty;

    return {
      suggested,
      qty,
      riskEgp,
      riskPct,
      positionValue,
      over: riskPct !== null && exceedsRiskLimit(riskPct, maxRisk),
      budget,
      invertedStop: false,
    };
  }, [capital, maxRisk, entry, stop, override]);

  const qtyValue = override ?? (result.suggested === null ? '' : String(result.suggested));

  return (
    <div className="grid gap-px overflow-hidden rounded-lg border border-border-default bg-border-default lg:grid-cols-2">
      <div className="bg-surface p-6">
        <Field
          id="calc-capital"
          label="رأس المال"
          suffix="ج.م"
          value={capital}
          onChange={(v) => {
            setCapital(v);
            setOverride(null);
          }}
        />

        <fieldset className="mt-5">
          <legend className="text-sm font-semibold">أقصى مخاطرة في الصفقة</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {RISK_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setMaxRisk(preset);
                  setOverride(null);
                }}
                aria-pressed={maxRisk === preset}
                className={`num rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors ${
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

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field
            id="calc-entry"
            label="سعر الدخول"
            suffix="ج.م"
            value={entry}
            onChange={(v) => {
              setEntry(v);
              setOverride(null);
            }}
          />
          <Field
            id="calc-stop"
            label="الاستوب"
            suffix="ج.م"
            value={stop}
            onChange={(v) => {
              setStop(v);
              setOverride(null);
            }}
          />
        </div>

        {result.invertedStop && (
          <p role="status" className="mt-4 text-sm font-semibold text-loss">
            الاستوب لازم يكون أقل من سعر الدخول.
          </p>
        )}
      </div>

      <div className="bg-surface-low p-6">
        <p className="text-sm text-fg-muted">الكمية المقترحة</p>
        <p className="num mt-1 text-5xl font-bold">
          {result.suggested === null ? '—' : formatQuantity(result.suggested)}
          {result.suggested !== null && (
            <span className="ms-2 text-base font-semibold text-fg-muted">سهم</span>
          )}
        </p>
        {result.suggested === 0 && (
          <p className="mt-2 text-sm text-fg-muted">
            رأس المال مش كفاية لمسافة الاستوب دي — مسافة أقرب أو رأس مال أكبر.
          </p>
        )}

        <div className="mt-6 border-t border-border-default pt-5">
          <label
            htmlFor="calc-qty"
            className="text-sm font-semibold"
          >
            جرّب تزوّد الكمية
          </label>
          <p className="mt-1 text-xs text-fg-muted">
            ده اللي التطبيق بيعمله وانت بتكتب — أي كمية فوق الحد بتتعلّم فورًا.
          </p>
          <input
            id="calc-qty"
            type="text"
            inputMode="numeric"
            dir="ltr"
            value={qtyValue}
            onChange={(event) => setOverride(event.target.value)}
            className="num mt-2 w-full rounded-md border border-border-default bg-surface px-3 py-2 text-start font-semibold outline-none focus:border-brand-ink"
          />
        </div>

        <dl className="mt-5 space-y-3 text-sm">
          <Row label="المبلغ المعرّض للخطر" value={money(result.riskEgp)} />
          <Row
            label="نسبة المخاطرة"
            value={percent(result.riskPct)}
            tone={result.over ? 'loss' : undefined}
          />
          <Row label="قيمة المركز" value={money(result.positionValue)} />
        </dl>

        {/* An icon and a sentence, not colour alone — the same rule the app's
            over-limit marker follows so it survives a colour-blind reader. */}
        {result.over && (
          <p
            role="status"
            className="mt-4 flex items-start gap-2 rounded-md border border-loss-border bg-loss-surface p-3 text-sm font-semibold text-loss"
          >
            <WarningIcon />
            <span>
              المخاطرة أعلى من الحد المسموح ({percent(maxRisk)}). التطبيق بيعلّم
              الصفقة دي بالأحمر.
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  suffix,
  value,
  onChange,
}: {
  id: string;
  label: string;
  suffix: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <div className="mt-2 flex items-center gap-2 rounded-md border border-border-default bg-surface-low px-3 focus-within:border-brand-ink">
        {/* dir=ltr on the input only: the app does the same, because a minus
            sign or a decimal point lands on the visually wrong end of a number
            typed into an RTL field. */}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          dir="ltr"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="num w-full bg-transparent py-2 text-start font-semibold outline-none"
        />
        <span className="shrink-0 text-xs text-fg-muted">{suffix}</span>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'loss';
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-fg-muted">{label}</dt>
      <dd className={`num font-bold ${tone === 'loss' ? 'text-loss' : ''}`}>
        {value}
      </dd>
    </div>
  );
}

function WarningIcon() {
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
