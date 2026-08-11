'use client';

import { useMemo, useState } from 'react';

import { QuoteBadge } from '@/components/dashboard/quote-badge';
import { TickerField } from '@/components/dashboard/ticker-field';
import { TimelineEditor } from '@/components/dashboard/timeline-editor';
import { CHECKLIST } from '@/lib/checklist';
import { money, percent, quantity as fmtQuantity } from '@/lib/format';
import { parseInteger, parseNumber } from '@/lib/risk-math';
import { computeSizing } from '@/lib/sizing';
import {
  newTradeId,
  type TimelineEntry,
  type Trade,
  type TradeStatus,
} from '@/lib/trade';

/**
 * The add / edit trade form — the browser's «التفاصيل الكاملة».
 *
 * IT IS LAID OUT SECTION FOR SECTION LIKE lib/trades/widgets/trade_form_body.dart,
 * because the two are the same screen on two devices and were drifting apart:
 * the browser had an extra «حاسبة الحجم» panel with its own capital and risk
 * inputs, four expanded blocks where the phone has one folded panel, and the
 * exit block above the reason instead of below it.
 *
 * THE RISK RULE IS READ, NEVER EDITED HERE. The panel let both numbers be
 * changed and then explained at length that the change does not save — a
 * what-if the phone does not offer and nobody asked for. The account carries
 * the rule (`users/{uid}/settings/risk`); it is changed in الإعدادات, and this
 * form just uses it.
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
  showLivePrices,
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
  /** Last closes are one of the four paid surfaces — see QuoteBadge. */
  showLivePrices: boolean;
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

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * The SHARED sizing rule, exactly as the app's form uses `SizingResult`.
   *
   * This used to derive its own suggestion, its own risk and its own position
   * value inline — a third engine beside the calculator's and the app's, and
   * the same reason they could disagree about a share count.
   */
  const calc = useMemo(() => {
    const e = parseNumber(entryPrice);
    const s = parseNumber(stopPrice);
    const sizing = computeSizing({
      capital: accountCapital,
      maxRiskPercent: accountMaxRisk,
      entry: e,
      stop: s,
      userQty: parseInteger(qty),
    });
    return {
      sizing,
      invertedStop: e !== null && s !== null && e > 0 && s > 0 && s >= e,
    };
  }, [accountCapital, accountMaxRisk, entryPrice, stopPrice, qty]);

  const sizing = calc.sizing;

  // MATCHES THE APP: the exit block appears for any position that exists, not
  // only a closed one — lib/trades/widgets/trade_form_body.dart shows it under
  // `status.isExecuted`. That is the better shape: closing a trade is filling
  // in an exit, not hunting for a status picker first — and since both surfaces
  // now CLOSE the trade when the pair is filled, the block is the action, not a
  // set of fields that only count once the type is right.
  //
  // The fields stay REQUIRED when the type already says closed: such a record
  // would have no P&L, no R and no place on the equity curve while still being
  // counted as a finished trade. `Trade.isOpen` is `exitPrice == null`, so it
  // would also call itself open again on the phone.
  const showsExit = isExecuted(status);
  const needsExit = status === 'closed';

  /**
   * Anything that is not «مقفولة» has no exit, so moving away from it empties
   * the pair — mirroring `_changeStatus` in trade_form_screen.dart.
   *
   * Without it, reopening a closed trade is impossible: the exit fields stay
   * on screen for an open position too, and the save below reads a filled exit
   * as "closed", so picking «مفتوحة» would close it straight back.
   */
  function changeStatus(next: TradeStatus) {
    setStatus(next);
    if (next !== 'closed') {
      setExitPrice('');
      setExitDate('');
    }
  }

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
    // An exit typed against an OPEN position is a close, not a stray value to
    // drop — same rule the app's saver applies. Dropping it was the web half of
    // the bug where filling the exit in did everything except close the trade.
    const typedExit = showsExit && (exitPrice.trim() !== '' || exitDate !== '');
    if (needsExit || typedExit) {
      exit = parseNumber(exitPrice);
      exitOn = fromDateInput(exitDate);
      if (exit === null || exit <= 0)
        return setError('صفقة مغلقة لازم يكون ليها سعر خروج.');
      if (!exitOn) return setError('تاريخ الخروج مش مظبوط.');
      if (exitOn < date) return setError('تاريخ الخروج مش ممكن يكون قبل الدخول.');
    }

    // Mirrors `resolvedStatus` in trade_form_saver.dart. The other direction —
    // clearing the exit to reopen — is handled by `changeStatus` above.
    const resolvedStatus: TradeStatus =
      status === 'open' && exit !== null ? 'closed' : status;

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
        status: resolvedStatus,
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
    /* MIRRORS THE APP'S FORM, SECTION BY SECTION.
       lib/trades/widgets/trade_form_body.dart goes: status, ticker, the two
       prices, quantity beside the target, the live preview, the reason, the
       exit block, then ONE collapsible carrying tags, screenshots, the
       timeline and the closing note. The browser had the same material in a
       different order, with an extra «حاسبة الحجم» panel the phone does not
       have — so the two screens taught different habits for the same job. */
    <form onSubmit={submit} className="space-y-5">
      {/* Cards rather than a <select>: four options whose difference is the
          whole shape of the form is not a thing to hide behind a closed
          dropdown, and each one carries the sentence that tells you which you
          are. A radiogroup, so arrow keys work and a screen reader announces
          it as one choice of four. */}
      <fieldset>
        <legend className="text-sm font-bold">حالة الصفقة</legend>
        <div
          role="radiogroup"
          aria-label="حالة الصفقة"
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
                onClick={() => changeStatus(option.value)}
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
          {/* The app's StockQuoteBadge, which the browser was missing. */}
          <QuoteBadge symbol={ticker} enabled={showLivePrices} />
        </Field>

        {/* NOT IN THE APP'S FORM AT ALL — kept, not removed. The phone stamps
            `DateTime.now()` and offers no way to change it, so a trade entered
            the morning after cannot be dated correctly there. Dropping the
            field here to match would make both surfaces worse; the app is
            getting the picker instead. */}
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

      <div className="grid gap-4 sm:grid-cols-2">
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
        <Field label="سعر الاستوب" htmlFor="tf-stop" suffix="ج.م">
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
      </div>

      {calc.invertedStop && (
        <p role="alert" className="text-sm font-semibold text-loss">
          الاستوب لازم يكون أقل من سعر الدخول.
        </p>
      )}

      {/* Quantity beside the target, exactly as the app pairs them — and the
          suggestion is a HELPER UNDER THE FIELD, not a «حاسبة الحجم» panel of
          its own. That panel let the capital and the risk rule be edited here
          and then explained at length that the edits do not save; the app just
          reads the account and prints the number. */}
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
          {/* SIZING ONLY WHEN THERE IS STILL A SIZE TO DECIDE. For an executed
              trade the quantity is history, and a suggestion next to it reads
              as a verdict on a position that cannot be changed. */}
          {needsSizing(status) && sizing.suggestedQty !== null && (
            <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
              <span>
                المقترح:{' '}
                <span className="num font-bold text-fg-muted">
                  {fmtQuantity(sizing.suggestedQty)}
                </span>
              </span>
              {sizing.suggestedQty > 0 && (
                <button
                  type="button"
                  onClick={() => setQty(String(sizing.suggestedQty))}
                  className="font-semibold text-brand-ink underline-offset-4 hover:underline"
                >
                  استخدمه
                </button>
              )}
            </p>
          )}
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

      {sizing.capitalTooSmall && needsSizing(status) && (
        <p className="rounded-md border border-border-default bg-surface-low p-3 text-xs leading-relaxed text-fg-muted">
          المسافة بين الدخول والاستوب أكبر من ميزانية الخسارة{' '}
          <span className="num">({money(sizing.maxLoss)})</span> — مش هينفع
          تشتري ولا سهم واحد في الحد ده.
        </p>
      )}

      {sizing.overRisk && (
        <p
          role="status"
          className="rounded-md border border-loss-border bg-loss-surface p-3 text-sm font-semibold text-loss"
        >
          {isExecuted(status)
            ? `المخاطرة في الصفقة دي كانت أعلى من حدك (${percent(accountMaxRisk)}) — متسجّلة زي ما هي، ودرجة الانضباط هتعكسها.`
            : `المخاطرة أعلى من الحد اللي اخترته (${percent(accountMaxRisk)}). رادار هيعلّم الصفقة دي بالأحمر.`}
        </p>
      )}

      {/* The app's LivePreviewCard, same three rows in the same order. */}
      <dl className="grid gap-3 rounded-lg border border-border-default bg-surface p-4 sm:p-5 sm:grid-cols-3">
        <Metric label="قيمة المركز" value={money(sizing.positionValue)} />
        <Metric label="المخاطرة بالجنيه" value={money(sizing.riskEgp)} tone={sizing.overRisk} />
        <Metric label="نسبة المخاطرة" value={percent(sizing.riskPct)} tone={sizing.overRisk} />
      </dl>

      <Field label="سبب الدخول والتحليل الفني" htmlFor="tf-reason">
        <textarea
          id="tf-reason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="ليه بتدخل الصفقة دي؟ ده اللي هترجعله بعد شهور."
          className={inputCls}
        />
      </Field>

      {showsExit && (
        <fieldset className="rounded-lg border border-border-default bg-surface-low p-4 sm:p-5">
          <legend className="px-2 text-sm font-bold">الخروج من الصفقة</legend>
          <p className="mb-4 text-xs text-fg-muted">
            {needsExit
              ? 'الصفقة مقفولة، فلازم تكتب سعر وتاريخ الخروج.'
              : 'املا الاتنين وهي تتقفل لوحدها وتتحسب في أداءك. سيبهم فاضيين لو لسه مفتوحة.'}
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

      {/* Left OUT of the collapsible on purpose. The app asks these at save
          time, in a sheet you cannot miss; folding them away here would make
          them easier to skip than on either surface, and the discipline score
          counts them. */}
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

      {/* ONE COLLAPSIBLE, same title as the app's ExpansionTile. Tags, source,
          the timeline and the closing note were four expanded blocks here and
          one folded panel there, which is most of why the two screens did not
          look like the same product. */}
      <details className="rounded-lg border border-border-default bg-surface">
        <summary className="cursor-pointer list-none p-4 text-sm font-bold sm:p-5">
          أدوات ومرفقات إضافية (صور، تصنيفات، سجل)
        </summary>
        <div className="space-y-5 border-t border-border-default p-4 sm:p-5">
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

          <TimelineEditor entries={timeline} onChange={setTimeline} />

          {/* Said out loud rather than left as a missing button. The discipline
              score has a 20-point component for "a chart screenshot is
              attached", and a browser cannot earn it: the app stores images as
              files in the phone's own storage and uploads only their paths,
              which are meaningless here. Without this line the score just looks
              broken. */}
          <p className="rounded-md border border-border-default bg-surface-low p-3 text-xs leading-relaxed text-fg-subtle">
            صور الشارت بتتضاف من التطبيق على التليفون بس — متخزّنة على جهازك ومش
            بترفع على السيرفر، فمش بتظهر ولا بتتضاف من المتصفح.
            {initial && initial.screenshotPaths.length > 0 && (
              <>
                {' '}
                الصفقة دي عليها{' '}
                <span className="num font-bold">
                  {initial.screenshotPaths.length}
                </span>{' '}
                صورة على تليفونك، وهتفضل زي ما هي بعد الحفظ من هنا.
              </>
            )}
          </p>

          <Field label="ملاحظات ختامية" htmlFor="tf-notes">
            <textarea
              id="tf-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </details>

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
