'use client';

import { useMemo, useState } from 'react';

import { TickerField } from '@/components/dashboard/ticker-field';
import { TimelineEditor } from '@/components/dashboard/timeline-editor';
import { CHECKLIST } from '@/lib/checklist';
import { money, percent, quantity as fmtQuantity } from '@/lib/format';
import {
  exceedsRiskLimit,
  maxLossPerTrade,
  parseNumber,
  safeDiv,
  suggestedQuantity,
} from '@/lib/risk-math';
import {
  newTradeId,
  type TimelineEntry,
  type Trade,
  type TradeStatus,
} from '@/lib/trade';

/**
 * The add / edit trade form.
 *
 * It carries the position-size calculator inline rather than linking to the one
 * on the landing page, because the product's whole claim is that size is
 * decided BEFORE the trade — a calculator you have to leave the form to reach
 * is a calculator most people will skip.
 *
 * CAPITAL IS SEEDED FROM THE ACCOUNT AND NOT WRITTEN BACK. It used to open at a
 * hardcoded 100,000 with a note saying the real number lived on the phone and
 * could not be read — which meant the suggested quantity was computed against a
 * portfolio the user did not have. The account carries the rule now
 * (`users/{uid}/settings/risk`), so the form starts from it. Editing the field
 * here stays a what-if for this one form: it changes the suggestion in front of
 * you and nothing else, and the account's value is changed in the bar above the
 * journal. That is deliberate — sizing a trade against "what if I had double"
 * should not silently rewrite the rule every other figure is scored against.
 */

/**
 * THE FIRST QUESTION, BECAUSE IT DECIDES WHAT THE REST OF THE FORM MEANS.
 *
 * This used to be a dropdown near the bottom, under the calculator — so the
 * form computed a suggested position size, and only then asked whether the
 * trade had already happened. For a trade you have already taken that
 * suggestion answers a question nobody asked: the quantity is a fact you are
 * recording, not a number to solve for. Sizing advice on a done deal is at best
 * noise and at worst an invitation to feel bad about a position you cannot
 * change.
 *
 * So the type is chosen first, and it drives three things: whether the sizing
 * calculator appears at all, what the quantity field is asking for, and whether
 * the exit block is required.
 */
const TYPE_OPTIONS: { value: TradeStatus; label: string; hint: string }[] = [
  { value: 'planned', label: 'لسه هعملها', hint: 'بحسب حجمها قبل ما أدخل' },
  { value: 'open', label: 'عملتها ولسه فيها', hint: 'دخلت، وما خرجتش لسه' },
  { value: 'closed', label: 'عملتها وخلصت', hint: 'دخلت وخرجت — أعرف نتيجتها' },
  { value: 'cancelled', label: 'فكرة ألغيتها', hint: 'حسبتها وقرّرت ما أدخلش' },
];

/** Sizing is a question about the future. Only one status has one. */
function needsSizing(status: TradeStatus): boolean {
  return status === 'planned';
}

/** The position exists — so risk is a fact to check, not a target to hit. */
function isExecuted(status: TradeStatus): boolean {
  return status === 'open' || status === 'closed';
}

const RISK_PRESETS = [0.01, 0.015, 0.02, 0.03];

/** `<input type="date">` wants YYYY-MM-DD in LOCAL time, not an ISO instant. */
function toDateInput(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parses that same local YYYY-MM-DD back to a Date at local midnight.
 *
 * `new Date('2026-03-05')` parses as UTC midnight, which in Egypt (UTC+2/+3)
 * renders as the 5th but in any negative offset renders as the 4th — a trade
 * silently dated a day early. Splitting the parts avoids the whole class.
 */
function fromDateInput(value: string): Date | null {
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [y, m, d] = parts;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

export type TradeDraft = Omit<Trade, 'id'> & { id: string };

export function TradeForm({
  initial,
  isEdit = initial !== null,
  accountCapital,
  accountMaxRisk,
  onCancel,
  onSave,
}: {
  /** Null for a blank trade, or a seed — a watchlist item converted to a
   *  planned trade arrives here pre-filled but is still a NEW record. */
  initial: Trade | null;
  /** Separate from `initial != null` precisely because of that seed case: the
   *  save button must not say «احفظ التعديل» for a trade that does not exist
   *  yet. */
  isEdit?: boolean;
  /** The account's risk rule, used to seed the calculator. See the note above:
   *  the fields below are a what-if and never write back. */
  accountCapital: number;
  accountMaxRisk: number;
  onCancel: () => void;
  onSave: (trade: TradeDraft) => Promise<void>;
}) {
  const [ticker, setTicker] = useState(initial?.ticker ?? '');
  const [entryDate, setEntryDate] = useState(
    toDateInput(initial?.entryDate ?? new Date())
  );
  // `initial` may be a SEED rather than a stored trade — the quick-add sheet
  // hands over whatever was typed, and an untouched price arrives as 0. Seeding
  // the box with "0" would make the user clear it before typing, and 0 is not a
  // price any stored trade legitimately carries.
  const [entryPrice, setEntryPrice] = useState(
    initial && initial.entryPrice > 0 ? String(initial.entryPrice) : ''
  );
  const [stopPrice, setStopPrice] = useState(
    initial && initial.stopPrice > 0 ? String(initial.stopPrice) : ''
  );
  const [takeProfit, setTakeProfit] = useState(
    initial?.takeProfitPrice != null ? String(initial.takeProfitPrice) : ''
  );
  const [qty, setQty] = useState(
    initial && initial.quantity > 0 ? String(initial.quantity) : ''
  );
  const [status, setStatus] = useState<TradeStatus>(initial?.status ?? 'planned');
  const [exitPrice, setExitPrice] = useState(
    initial?.exitPrice != null ? String(initial.exitPrice) : ''
  );
  const [exitDate, setExitDate] = useState(
    initial?.exitDate ? toDateInput(initial.exitDate) : toDateInput(new Date())
  );
  const [reason, setReason] = useState(initial?.reason ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [source, setSource] = useState(initial?.source ?? '');
  const [tags, setTags] = useState((initial?.tags ?? []).join('، '));
  const [checked, setChecked] = useState<string[]>(
    initial?.completedChecklistItems ?? []
  );
  // Seeded from the stored trade, and written back COMPLETE — Firestore
  // replaces an array field rather than merging into it, so an edit that
  // started from a partial list would delete the rest of the log.
  const [timeline, setTimeline] = useState<TimelineEntry[]>(
    initial?.timeline ?? []
  );

  const [capital, setCapital] = useState(String(accountCapital));
  const [maxRisk, setMaxRisk] = useState(accountMaxRisk);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calc = useMemo(() => {
    const c = parseNumber(capital) ?? 0;
    const e = parseNumber(entryPrice) ?? 0;
    const s = parseNumber(stopPrice) ?? 0;
    const q = parseNumber(qty) ?? 0;

    const budget = maxLossPerTrade(c, maxRisk);
    const suggested = suggestedQuantity(budget, e, s);

    const riskEgp = q > 0 && e > s ? (e - s) * q : null;
    const riskPct = riskEgp === null ? null : safeDiv(riskEgp, c);

    return {
      suggested,
      riskEgp,
      riskPct,
      positionValue: q > 0 && e > 0 ? e * q : null,
      // The ONLY comparison of a risk ratio against the limit — never inline.
      over: riskPct !== null && exceedsRiskLimit(riskPct, maxRisk),
      invertedStop: e > 0 && s > 0 && s >= e,
    };
  }, [capital, entryPrice, stopPrice, qty, maxRisk]);

  // MATCHES THE APP: the exit block appears for any position that exists, not
  // only a closed one — lib/trades/widgets/trade_form_body.dart shows it under
  // `status.isExecuted` with the hint «سيبهم فاضيين لو الصفقة لسه مفتوحة». That
  // is the better shape: closing a trade is filling in an exit, not hunting for
  // a status dropdown first.
  //
  // The fields are only REQUIRED when the status says closed, which is a guard
  // the app lacks — its saver quietly writes status=closed with a null exit,
  // and such a record has no P&L, no R and no place on the equity curve while
  // still being counted as a finished trade.
  const showsExit = isExecuted(status);
  const needsExit = status === 'closed';

  function toggleCheck(id: string) {
    setChecked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    const e = parseNumber(entryPrice);
    const s = parseNumber(stopPrice);
    const q = parseNumber(qty);
    const date = fromDateInput(entryDate);

    if (!ticker.trim()) return setError('اكتب رمز السهم.');
    if (!date) return setError('تاريخ الدخول مش مظبوط.');
    if (e === null || e <= 0) return setError('سعر الدخول لازم يكون أكبر من صفر.');
    if (s === null || s <= 0) return setError('الاستوب لازم يكون أكبر من صفر.');
    if (s >= e) return setError('الاستوب لازم يكون أقل من سعر الدخول.');
    // An abandoned idea may never have been sized at all — that is what
    // abandoning it means — so `cancelled` accepts zero AND an empty box.
    // parseNumber returns null for both a blank field and a typo, which the
    // other statuses must keep rejecting; only here does blank mean "never
    // decided" rather than "not filled in yet".
    const quantity =
      status === 'cancelled' && qty.trim() === '' ? 0 : q;

    if (quantity === null || quantity < 0)
      return setError('الكمية مش مظبوطة.');
    if (quantity === 0 && status !== 'cancelled')
      return setError('الكمية لازم تكون أكبر من صفر.');

    // The app's Trade asserts exitPrice and exitDate are set together, and its
    // codec normalises a half-written pair back to "still open". Letting a
    // closed trade save with only one of them would hand the phone a record it
    // silently reopens.
    let exit: number | null = null;
    let exitOn: Date | null = null;
    if (needsExit) {
      exit = parseNumber(exitPrice);
      exitOn = fromDateInput(exitDate);
      if (exit === null || exit <= 0)
        return setError('صفقة مغلقة لازم يكون ليها سعر خروج.');
      if (!exitOn) return setError('تاريخ الخروج مش مظبوط.');
      if (exitOn < date) return setError('تاريخ الخروج مش ممكن يكون قبل الدخول.');
    }

    setError(null);
    setBusy(true);
    try {
      await onSave({
        id: initial?.id ?? newTradeId(),
        entryDate: date,
        ticker: ticker.trim().toUpperCase(),
        reason: reason.trim(),
        entryPrice: e,
        stopPrice: s,
        quantity: Math.floor(quantity),
        exitPrice: exit,
        exitDate: exitOn,
        notes: notes.trim() || null,
        status,
        tags: tags
          .split(/[،,]/)
          .map((t) => t.trim())
          .filter(Boolean),
        isFavorite: initial?.isFavorite ?? false,
        completedChecklistItems: checked,
        source: source.trim() || null,
        takeProfitPrice: parseNumber(takeProfit),
        timeline,
        // Carried through untouched. encodeTrade omits the field entirely, so
        // merge preserves whatever the phone attached — this value is only
        // here so the discipline score can count it.
        screenshotPaths: initial?.screenshotPaths ?? [],
      });
    } catch {
      setError('تعذّر الحفظ. اتأكد من الاتصال وجرّب تاني.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Cards rather than a <select>: four options whose difference is the
          whole shape of the form is not a thing to hide behind a closed
          dropdown, and each one carries the sentence that tells you which you
          are. A radiogroup, so arrow keys work and a screen reader announces
          it as one choice of four. */}
      <fieldset>
        <legend className="text-sm font-bold">الصفقة دي إيه؟</legend>
        <div
          role="radiogroup"
          aria-label="نوع الصفقة"
          className="mt-3 grid gap-2 sm:grid-cols-2"
        >
          {TYPE_OPTIONS.map((option) => {
            const active = status === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setStatus(option.value)}
                className={`rounded-lg border p-4 text-start transition-colors ${
                  active
                    ? 'border-brand-ink bg-surface-high'
                    : 'border-border-default bg-surface-low hover:bg-surface-high'
                }`}
              >
                <span className="block text-sm font-bold">{option.label}</span>
                <span className="mt-1 block text-xs text-fg-muted">
                  {option.hint}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="رمز السهم" htmlFor="tf-ticker">
          {/* The same suggesting field the quick sheet and the app use, so a
              code is never typed from memory in one place and picked from a
              list in another. */}
          <TickerField
            id="tf-ticker"
            value={ticker}
            onChange={setTicker}
            required
            autoFocus
          />
        </Field>

        <Field
          label={isExecuted(status) ? 'تاريخ الدخول' : 'تاريخ الدخول المتوقّع'}
          htmlFor="tf-date"
        >
          <input
            id="tf-date"
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            dir="ltr"
            className={inputCls}
            required
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="سعر الدخول" htmlFor="tf-entry" suffix="ج.م">
          <input
            id="tf-entry"
            inputMode="decimal"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            dir="ltr"
            className={inputCls}
            required
          />
        </Field>
        <Field label="الاستوب" htmlFor="tf-stop" suffix="ج.م">
          <input
            id="tf-stop"
            inputMode="decimal"
            value={stopPrice}
            onChange={(e) => setStopPrice(e.target.value)}
            dir="ltr"
            className={inputCls}
            required
          />
        </Field>
        <Field label="الهدف (اختياري)" htmlFor="tf-tp" suffix="ج.م">
          <input
            id="tf-tp"
            inputMode="decimal"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
            dir="ltr"
            className={inputCls}
          />
        </Field>
      </div>

      {calc.invertedStop && (
        <p role="alert" className="text-sm font-semibold text-loss">
          الاستوب لازم يكون أقل من سعر الدخول.
        </p>
      )}

      {/* SIZING ONLY WHEN THERE IS STILL A SIZE TO DECIDE.
          For an executed trade the quantity is history, and a suggestion next
          to it reads as a verdict on a position that cannot be changed. The
          risk read-out below stays for every status — on a done trade it is a
          fact worth seeing, just not a target. */}
      {needsSizing(status) && (
      <fieldset className="rounded-lg border border-border-default bg-surface-low p-4 sm:p-5">
        <legend className="px-2 text-sm font-bold">حاسبة الحجم</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="رأس المال" htmlFor="tf-capital" suffix="ج.م">
            <input
              id="tf-capital"
              inputMode="decimal"
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
              dir="ltr"
              className={inputCls}
            />
          </Field>

          <div>
            <span className="text-sm font-semibold">أقصى مخاطرة</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {RISK_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setMaxRisk(preset)}
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
          </div>
        </div>

        <p className="mt-4 text-xs text-fg-subtle">
          الأرقام دي جاية من إعدادات حسابك. تغييرها هنا بيحسب المقترح والنسبة في
          الفورم ده بس ومش بيتحفظ — عشان تغيّر القاعدة نفسها، عدّلها من فوق
          الجورنال.
        </p>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-border-default pt-5">
          <div>
            <p className="text-sm text-fg-muted">الكمية المقترحة</p>
            <p className="num mt-1 text-3xl font-bold">
              {calc.suggested === null ? '—' : fmtQuantity(calc.suggested)}
            </p>
          </div>
          {calc.suggested !== null && calc.suggested > 0 && (
            <button
              type="button"
              onClick={() => setQty(String(calc.suggested))}
              className="rounded-md border border-border-strong px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface-high"
            >
              استخدم المقترح
            </button>
          )}
        </div>
      </fieldset>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={isExecuted(status) ? 'عدد الأسهم اللي اشتريتها' : 'عدد الأسهم'}
          htmlFor="tf-qty"
        >
          <input
            id="tf-qty"
            inputMode="numeric"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            dir="ltr"
            className={inputCls}
            // Not required for an abandoned idea. The browser enforces this
            // BEFORE submit(), so leaving it on would block the empty box the
            // validation below deliberately accepts — the constraint has to be
            // relaxed in both places or in neither.
            required={status !== 'cancelled'}
          />
        </Field>

      </div>

      <dl className="grid gap-3 rounded-lg border border-border-default bg-surface p-4 sm:p-5 sm:grid-cols-3">
        <Metric label="المبلغ المعرّض للخطر" value={money(calc.riskEgp)} tone={calc.over} />
        <Metric label="نسبة المخاطرة" value={percent(calc.riskPct)} tone={calc.over} />
        <Metric label="قيمة المركز" value={money(calc.positionValue)} />
      </dl>

      {calc.over && (
        <p
          role="status"
          className="rounded-md border border-loss-border bg-loss-surface p-3 text-sm font-semibold text-loss"
        >
          {isExecuted(status)
            ? `المخاطرة في الصفقة دي كانت أعلى من حدك (${percent(maxRisk)}) — متسجّلة زي ما هي، ودرجة الانضباط هتعكسها.`
            : `المخاطرة أعلى من الحد اللي اخترته (${percent(maxRisk)}). رادار هيعلّم الصفقة دي بالأحمر.`}
        </p>
      )}

      {showsExit && (
        <fieldset className="rounded-lg border border-border-default bg-surface-low p-4 sm:p-5">
          <legend className="px-2 text-sm font-bold">الخروج من الصفقة</legend>
          <p className="mb-4 text-xs text-fg-muted">
            {needsExit
              ? 'الصفقة مقفولة، فلازم تكتب سعر وتاريخ الخروج.'
              : 'سيبهم فاضيين لو الصفقة لسه مفتوحة — أول ما تكتبهم وتخليها «عملتها وخلصت» تتحسب في أداءك.'}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
          <Field label="سعر الخروج" htmlFor="tf-exit" suffix="ج.م">
            <input
              id="tf-exit"
              inputMode="decimal"
              value={exitPrice}
              onChange={(e) => setExitPrice(e.target.value)}
              dir="ltr"
              className={inputCls}
              required={needsExit}
            />
          </Field>
          <Field label="تاريخ الخروج" htmlFor="tf-exitdate">
            <input
              id="tf-exitdate"
              type="date"
              value={exitDate}
              onChange={(e) => setExitDate(e.target.value)}
              dir="ltr"
              className={inputCls}
              required={needsExit}
            />
          </Field>
          </div>
        </fieldset>
      )}

      <Field label="سبب الدخول" htmlFor="tf-reason">
        <textarea
          id="tf-reason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="ليه بتدخل الصفقة دي؟ ده اللي هترجعله بعد شهور."
          className={inputCls}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="التصنيفات (بفاصلة)" htmlFor="tf-tags">
          <input
            id="tf-tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="بريك أوت، سوينج"
            className={inputCls}
          />
        </Field>
        <Field label="المصدر (اختياري)" htmlFor="tf-source">
          <input
            id="tf-source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="مين رشّح لك الصفقة"
            className={inputCls}
          />
        </Field>
      </div>

      <fieldset className="rounded-lg border border-border-default p-4">
        <legend className="px-2 text-sm font-bold">
          <span className="inline-flex items-center gap-2">
            تشيك ليست ما قبل الصفقة
            <span className="num font-normal text-fg-subtle">
              {checked.length}/{CHECKLIST.length}
            </span>
          </span>
        </legend>
        <ul className="grid gap-2 sm:grid-cols-2">
          {CHECKLIST.map((item) => (
            <li key={item.id}>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={checked.includes(item.id)}
                  onChange={() => toggleCheck(item.id)}
                  className="size-4 accent-[var(--brand-ink)]"
                />
                {item.label}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <TimelineEditor entries={timeline} onChange={setTimeline} />

      {/* THIS NO LONGER EXPLAINS A LOST 20 POINTS — the discipline score dropped
          the screenshot component precisely because a browser could never earn
          it. What is left is a plain statement about where images live, which
          still matters: a user editing a trade from here needs to know the
          images on their phone survive the save.

          The note only appears when the trade actually HAS images. There is no
          reason to tell somebody about a feature of a device they may not be
          using, on a form that is otherwise complete. */}
      {initial && initial.screenshotPaths.length > 0 && (
        <p className="rounded-md border border-border-default bg-surface-low p-3 text-xs leading-relaxed text-fg-subtle">
          الصفقة دي عليها{' '}
          <span className="num font-bold">
            {initial.screenshotPaths.length}
          </span>{' '}
          صورة شارت على تليفونك. الصور متخزّنة على الجهاز ومش بترفع على السيرفر،
          فمش بتظهر من المتصفح — وهتفضل زي ما هي بعد الحفظ من هنا.
        </p>
      )}

      <Field label="ملاحظات (اختياري)" htmlFor="tf-notes">
        <textarea
          id="tf-notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={inputCls}
        />
      </Field>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-loss-border bg-loss-surface p-3 text-sm font-semibold text-loss"
        >
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3 border-t border-border-default pt-5">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-brand px-6 py-3 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy ? '...' : isEdit ? 'احفظ التعديل' : 'احفظ الصفقة'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border-strong px-6 py-3 text-sm font-semibold transition-colors hover:bg-surface-high"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}

const inputCls =
  'mt-2 w-full rounded-md border border-border-default bg-surface-low px-3 py-2.5 text-start outline-none transition-colors focus:border-brand-ink';

function Field({
  label,
  htmlFor,
  suffix,
  children,
}: {
  label: string;
  htmlFor: string;
  suffix?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-semibold">
        {label}
        {suffix && <span className="ms-1 text-xs text-fg-subtle">({suffix})</span>}
      </label>
      {children}
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-fg-muted">{label}</dt>
      <dd className={`num mt-1 font-bold ${tone ? 'text-loss' : ''}`}>{value}</dd>
    </div>
  );
}
