'use client';

import { XIcon } from '@/components/icons';

import { useEffect, useRef, useState } from 'react';

import { TickerField } from '@/components/dashboard/ticker-field';
import { money, percent, quantity as formatQuantity } from '@/lib/format';
import { parseInteger, parseNumber } from '@/lib/risk-math';
import { computeSizing } from '@/lib/sizing';
import { newTradeId, type Trade } from '@/lib/trade';

/**
 * «إضافة صفقة سريعة» — the web counterpart of
 * lib/trades/widgets/quick_add_trade_sheet.dart.
 *
 * The app asks five questions and gets out of the way; the browser used to open
 * the full form — type picker, dates, reason, checklist, timeline — for the
 * same act. Same product, two different jobs.
 *
 * The escape hatch matters as much as the speed: «التفاصيل الكاملة ←» carries
 * whatever is typed into the full form rather than discarding it, so nobody
 * pays for starting in the wrong place.
 */

/**
 * The one name the add-a-trade action goes by, everywhere.
 *
 * Mirrors `kAddTradeLabel`. The app fixed this already: the button said «صفقة
 * سريعة», one empty state said «إضافة صفقة» and another said «حاسبة الصفقة» —
 * three names for what a new user experiences as one job. The site still had
 * «+ صفقة جديدة», «+ سجّلها كصفقة» and «أضف أول صفقة».
 */
export const ADD_TRADE_LABEL = 'أضف صفقة';

/** What quick-save writes into `reason`, matching the app exactly. */
export const QUICK_TRADE_REASON = 'صفقة سريعة';

export function QuickAddSheet({
  capital,
  maxRiskPercent,
  onClose,
  onSave,
  onFullDetails,
}: {
  capital: number;
  maxRiskPercent: number;
  onClose: () => void;
  onSave: (trade: Trade) => void;
  /** Hands the typed values to the full form instead of saving them. */
  onFullDetails: (seed: Trade) => void;
}) {
  const [ticker, setTicker] = useState('');
  const [entry, setEntry] = useState('');
  const [stop, setStop] = useState('');
  const [target, setTarget] = useState('');
  /**
   * Left empty, the risk rule sizes the position — which assumes the whole
   * account backs it. Traders rarely commit everything, so the quantity has to
   * be typeable here and not only in the full form.
   */
  const [qty, setQty] = useState('');
  /**
   * «هدخل بفلوس قد ايه» — the cash going into THIS position, mirroring the
   * field the app's sheet and the calculator both have. Without it the
   * suggestion comes from the risk rule alone, which sizes as if the whole
   * account were behind every trade.
   */
  const [budget, setBudget] = useState('');
  const [saving, setSaving] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);

  // Escape closes, and the page behind does not scroll while this is open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const entryValue = parseNumber(entry);
  const stopValue = parseNumber(stop);
  const targetValue = parseNumber(target);

  const sizing = computeSizing({
    capital,
    maxRiskPercent,
    entry: entryValue,
    stop: stopValue,
    userQty: parseInteger(qty),
    budget: parseNumber(budget),
  });

  const isValid =
    ticker.trim() !== '' &&
    entryValue !== null &&
    stopValue !== null &&
    stopValue < entryValue &&
    (sizing.effectiveQty ?? 0) > 0;

  function draft(quantityValue: number): Trade {
    return {
      id: newTradeId(),
      entryDate: new Date(),
      ticker: ticker.trim().toUpperCase(),
      reason: QUICK_TRADE_REASON,
      entryPrice: entryValue ?? 0,
      stopPrice: stopValue ?? 0,
      quantity: quantityValue,
      exitPrice: null,
      exitDate: null,
      notes: null,
      // Quick-add always writes a PLAN, never an executed trade — same as the
      // app. Recording something as done is the decision the full form's type
      // picker exists to ask, and five fields cannot ask it.
      status: 'planned',
      tags: [],
      isFavorite: false,
      completedChecklistItems: [],
      source: null,
      takeProfitPrice: targetValue,
      timeline: [],
      screenshotPaths: [],
    };
  }

  async function quickSave() {
    const q = sizing.effectiveQty;
    // Never invent a quantity: a fallback of 1 would save a position nobody
    // chose, with risk figures to match.
    if (!isValid || q == null || q <= 0) return;
    setSaving(true);
    try {
      await onSave(draft(q));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-5"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-add-title"
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border-default bg-surface p-4 sm:p-5 shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-center gap-3">
          <h2 id="quick-add-title" className="flex-1 truncate text-lg font-bold">
            إضافة صفقة سريعة
          </h2>
          <button
            type="button"
            onClick={() =>
              onFullDetails(
                // The full form has no budget field, so a budget typed here
                // would be the one thing «التفاصيل الكاملة ←» threw away.
                // Carrying the quantity it produced keeps the answer even
                // though the question cannot follow.
                draft(
                  parseInteger(qty) ??
                    (sizing.limitedByBudget ? (sizing.effectiveQty ?? 0) : 0)
                )
              )
            }
            className="shrink-0 text-sm font-semibold text-brand-ink underline-offset-4 hover:underline"
          >
            التفاصيل الكاملة ←
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="shrink-0 rounded-md px-2 py-1 text-fg-muted transition-colors hover:bg-surface-high hover:text-fg"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <QuickField label="رمز السهم" htmlFor="qa-ticker">
            <TickerField
              id="qa-ticker"
              value={ticker}
              onChange={setTicker}
              autoFocus
            />
          </QuickField>

          <div className="grid grid-cols-2 gap-3">
            <QuickField label="سعر الدخول" htmlFor="qa-entry">
              <PriceInput id="qa-entry" value={entry} onChange={setEntry} />
            </QuickField>
            <QuickField label="وقف الخسارة" htmlFor="qa-stop">
              <PriceInput id="qa-stop" value={stop} onChange={setStop} />
            </QuickField>
          </div>

          {/* Full width and above عدد الأسهم on purpose: it is the input that
              decides the suggestion shown under that field. */}
          <QuickField
            label="المبلغ اللي هدخل بيه (اختياري)"
            htmlFor="qa-budget"
            hint={
              sizing.limitedByBudget
                ? 'الكمية اتحددت بالمبلغ ده، مش بحد المخاطرة'
                : 'سيبه فاضي عشان يستخدم حد المخاطرة بس'
            }
          >
            <PriceInput id="qa-budget" value={budget} onChange={setBudget} />
          </QuickField>

          <div className="grid grid-cols-2 gap-3">
            <QuickField label="الهدف (اختياري)" htmlFor="qa-target">
              <PriceInput id="qa-target" value={target} onChange={setTarget} />
            </QuickField>
            <QuickField
              label="عدد الأسهم"
              htmlFor="qa-qty"
              hint={
                sizing.suggestedQty != null ? (
                  <>
                    المقترح:{' '}
                    <span className="num">
                      {formatQuantity(sizing.suggestedQty)}
                    </span>
                  </>
                ) : undefined
              }
            >
              <PriceInput
                id="qa-qty"
                value={qty}
                onChange={setQty}
                integer
                placeholder={
                  sizing.suggestedQty != null
                    ? String(sizing.suggestedQty)
                    : undefined
                }
              />
            </QuickField>
          </div>
        </div>

        {stopValue !== null && entryValue !== null && stopValue >= entryValue && (
          <p className="mt-3 rounded-md border border-loss-border bg-loss-surface px-3 py-2 text-xs font-semibold text-loss">
            وقف الخسارة لازم يكون أقل من سعر الدخول.
          </p>
        )}

        {sizing.overRisk && (
          <p className="mt-3 rounded-md border border-loss-border bg-loss-surface px-3 py-2 text-xs font-semibold text-loss">
            المخاطرة هنا أعلى من الحد اللي انت حاططه لنفسك.
          </p>
        )}

        {sizing.capitalTooSmall && (
          <p className="mt-3 rounded-md border border-border-default bg-surface-low px-3 py-2 text-xs text-fg-muted">
            المسافة بين الدخول والاستوب أكبر من ميزانية الخسارة — مش هينفع تشتري
            ولا سهم واحد في الحد ده.
          </p>
        )}

        {(sizing.effectiveQty ?? 0) > 0 && (
          <dl className="mt-3 divide-y divide-border-default rounded-md border border-border-default bg-surface-low px-3">
            <Readout
              label="عدد الأسهم"
              value={formatQuantity(sizing.effectiveQty)}
            />
            <Readout label="قيمة المركز" value={money(sizing.positionValue)} />
            <Readout
              label="المخاطرة"
              value={`${money(sizing.riskEgp)} · ${percent(sizing.riskPct)}`}
              tone={sizing.overRisk ? 'loss' : undefined}
              emphasise
            />
          </dl>
        )}

        <button
          type="button"
          onClick={() => void quickSave()}
          disabled={!isValid || saving}
          className="mt-5 w-full rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? 'بيتحفظ…' : 'حفظ الصفقة السريعة'}
        </button>

        <p className="mt-3 text-xs leading-relaxed text-fg-subtle">
          بتتحفظ كصفقة <strong>مخططة</strong> — يعني فكرة محسوبة لسه ما نفّذتهاش،
          ومش بتدخل في أداءك. لما تنفّذها، افتحها وغيّر نوعها.
        </p>
      </div>
    </div>
  );
}

function QuickField({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-xs font-semibold text-fg-muted">
        {label}
      </label>
      <div className="mt-1">{children}</div>
      {/* No `.num` on the paragraph: it sets `direction: ltr`, which throws a
          trailing «،» or «%» to the head of an Arabic line. Hints that carry a
          number wrap the number itself instead. */}
      {hint && <p className="mt-1 text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
}

function PriceInput({
  id,
  value,
  onChange,
  integer = false,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  integer?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      inputMode={integer ? 'numeric' : 'decimal'}
      dir="ltr"
      placeholder={placeholder}
      className="num w-full rounded-md border border-border-default bg-surface px-3 py-2 text-start outline-none focus:border-brand-ink"
    />
  );
}

function Readout({
  label,
  value,
  tone,
  emphasise = false,
}: {
  label: string;
  value: string;
  tone?: 'loss';
  emphasise?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <dt className="text-xs text-fg-muted">{label}</dt>
      <dd
        className={`num text-sm ${emphasise ? 'font-bold' : 'font-semibold'} ${
          tone === 'loss' ? 'text-loss' : ''
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
