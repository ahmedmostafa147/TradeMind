'use client';

import { useState } from 'react';

import { dateLabel, money } from '@/lib/format';
import { parseNumber } from '@/lib/risk-math';
import { newTradeId } from '@/lib/trade';
import {
  PRIORITY_LABELS,
  sortWatchlist,
  type WatchPriority,
  type WatchlistItem,
} from '@/lib/watchlist';

/**
 * The watchlist: tickers being watched for a future entry.
 *
 * Nothing here reaches the journal's statistics — a watched idea has never
 * risked money. «حوّلها لصفقة» produces a real trade with status `planned`,
 * which is still excluded from every performance figure until it is taken.
 */
export function WatchlistPanel({
  items,
  busyId,
  onSave,
  onDelete,
  onConvert,
}: {
  items: WatchlistItem[];
  busyId: string | null;
  onSave: (item: WatchlistItem) => Promise<void>;
  onDelete: (item: WatchlistItem) => void;
  onConvert: (item: WatchlistItem) => void;
}) {
  const [editing, setEditing] = useState<WatchlistItem | null>(null);
  const [adding, setAdding] = useState(false);

  const sorted = sortWatchlist(items);

  if (adding || editing) {
    return (
      <WatchForm
        initial={editing}
        onCancel={() => {
          setAdding(false);
          setEditing(null);
        }}
        onSave={async (item) => {
          await onSave(item);
          setAdding(false);
          setEditing(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-fg-muted">
          <span className="num font-bold text-fg">{sorted.length}</span> سهم تحت
          المراقبة
        </p>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-md bg-brand px-5 py-2 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90"
        >
          + ضيف سهم
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-default p-8 text-center">
          <h2 className="font-bold">قائمة المراقبة فاضية</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">
            ضيف سهم بتراقبه بسعر شراء مستهدف واستوب، وأول ما يوصل حوّله لصفقة
            بضغطة.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {sorted.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-border-default bg-surface p-4 sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="num text-lg font-bold">{item.ticker || '—'}</p>
                  <p className="mt-1 text-xs text-fg-subtle">
                    من <span className="num">{dateLabel(item.dateAdded)}</span>
                  </p>
                </div>
                <PriorityBadge priority={item.priority} />
              </div>

              <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <div>
                  <dt className="text-[11px] text-fg-muted">سعر الشراء المستهدف</dt>
                  <dd className="num font-bold">{money(item.targetBuyPrice)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-fg-muted">الاستوب</dt>
                  <dd className="num font-bold">{money(item.stopPrice)}</dd>
                </div>
              </dl>

              {item.reason && (
                <p className="mt-3 text-sm leading-relaxed text-fg-muted">
                  {item.reason}
                </p>
              )}
              {item.source && (
                <p className="mt-2 text-xs text-fg-subtle">
                  المصدر: {item.source}
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-2 border-t border-border-default pt-4">
                <button
                  type="button"
                  onClick={() => onConvert(item)}
                  className="rounded-md border border-border-strong px-4 py-2 text-xs font-semibold transition-colors hover:bg-surface-high"
                >
                  حوّلها لصفقة
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(item)}
                  className="rounded-md px-3 py-2 text-xs font-semibold text-brand-ink underline-offset-4 hover:underline"
                >
                  تعديل
                </button>
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => onDelete(item)}
                  className="rounded-md px-3 py-2 text-xs font-semibold text-loss underline-offset-4 hover:underline disabled:opacity-50"
                >
                  {busyId === item.id ? '...' : 'حذف'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: WatchPriority }) {
  // Neutral tones on purpose. Priority is not money, and the win/loss palette
  // is reserved for figures that are.
  const style =
    priority === 'high'
      ? 'border-border-strong bg-surface-highest text-fg'
      : priority === 'medium'
        ? 'border-border-default bg-surface-high text-fg-muted'
        : 'border-border-default bg-surface-low text-fg-subtle';

  return (
    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold ${style}`}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

function WatchForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: WatchlistItem | null;
  onCancel: () => void;
  onSave: (item: WatchlistItem) => Promise<void>;
}) {
  const [ticker, setTicker] = useState(initial?.ticker ?? '');
  const [target, setTarget] = useState(
    initial ? String(initial.targetBuyPrice) : ''
  );
  const [stop, setStop] = useState(initial ? String(initial.stopPrice) : '');
  const [reason, setReason] = useState(initial?.reason ?? '');
  const [source, setSource] = useState(initial?.source ?? '');
  const [priority, setPriority] = useState<WatchPriority>(
    initial?.priority ?? 'medium'
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    const t = parseNumber(target);
    const s = parseNumber(stop);

    if (!ticker.trim()) return setError('اكتب رمز السهم.');
    if (t === null || t <= 0) return setError('سعر الشراء المستهدف لازم يكون أكبر من صفر.');
    if (s === null || s <= 0) return setError('الاستوب لازم يكون أكبر من صفر.');
    // Same rule the trade form enforces: a stop at or above the entry makes the
    // whole position-sizing arithmetic meaningless.
    if (s >= t) return setError('الاستوب لازم يكون أقل من سعر الشراء المستهدف.');

    setError(null);
    setBusy(true);
    try {
      await onSave({
        id: initial?.id ?? newTradeId(),
        ticker: ticker.trim().toUpperCase(),
        targetBuyPrice: t,
        stopPrice: s,
        reason: reason.trim(),
        priority,
        dateAdded: initial?.dateAdded ?? new Date(),
        source: source.trim() || null,
      });
    } catch {
      setError('تعذّر الحفظ. اتأكد من الاتصال وجرّب تاني.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-5">
      <h2 className="text-xl font-bold">
        {initial ? `تعديل ${initial.ticker}` : 'سهم جديد للمراقبة'}
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <Labelled label="رمز السهم" id="wl-ticker">
          <input
            id="wl-ticker"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            dir="ltr"
            placeholder="COMI"
            className={inputCls}
            required
          />
        </Labelled>
        <Labelled label="الأولوية" id="wl-priority">
          <select
            id="wl-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as WatchPriority)}
            className={inputCls}
          >
            {(Object.keys(PRIORITY_LABELS) as WatchPriority[]).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </Labelled>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Labelled label="سعر الشراء المستهدف (ج.م)" id="wl-target">
          <input
            id="wl-target"
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            dir="ltr"
            className={inputCls}
            required
          />
        </Labelled>
        <Labelled label="الاستوب (ج.م)" id="wl-stop">
          <input
            id="wl-stop"
            inputMode="decimal"
            value={stop}
            onChange={(e) => setStop(e.target.value)}
            dir="ltr"
            className={inputCls}
            required
          />
        </Labelled>
      </div>

      <Labelled label="السبب" id="wl-reason">
        <textarea
          id="wl-reason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="بتراقبه ليه؟"
          className={inputCls}
        />
      </Labelled>

      <Labelled label="المصدر (اختياري)" id="wl-source">
        <input
          id="wl-source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="مين رشّحه"
          className={inputCls}
        />
      </Labelled>

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
          {busy ? '...' : 'احفظ'}
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

function Labelled({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
    </div>
  );
}
