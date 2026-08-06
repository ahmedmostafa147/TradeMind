'use client';

import { useState } from 'react';

import {
  CheckCircleIcon,
  HourglassIcon,
  LightbulbIcon,
  SparkIcon,
  TrendingUpIcon,
  WarningIcon,
} from '@/components/icons';
import { decisionsOf, type DecisionItem } from '@/lib/decisions';
import {
  dateLabel,
  EMPTY_VALUE,
  money,
  percent,
  quantity as formatQuantity,
  signedMoney,
  signedPercent,
} from '@/lib/format';
import { normalizeTicker } from '@/lib/egx-directory';
import { unrealised, type Quote } from '@/lib/quote';
import type { Trade, TradeStatus } from '@/lib/trade';
import { useQuotes } from '@/lib/use-quotes';

/**
 * «قرار اليوم» — what needs a decision today, not a list of everything.
 *
 * Sections render in the app's own order of urgency, under the app's own
 * titles, and each card carries the SAME BUTTONS the app puts on it. That last
 * part was the gap: the browser showed the same trades and then offered one
 * «افتحها» that opened the edit form, so every decision — mark it open, close
 * it, cancel the idea, write the lesson — meant filling in a form. The phone
 * does each of those in one tap.
 */
export function TodayPanel({
  trades,
  watchlistCount,
  showLivePrices,
  capital,
  maxRiskPercent,
  waitingThresholdDays,
  onEdit,
  onUpdate,
}: {
  trades: Trade[];
  watchlistCount: number;
  /**
   * Off on the free plan. The request is not made at all rather than made and
   * hidden — the route costs us an upstream call, and fetching a price nobody
   * is allowed to see is the kind of waste that only shows up on a bill.
   */
  showLivePrices: boolean;
  capital: number;
  maxRiskPercent: number;
  waitingThresholdDays: number;
  onEdit: (trade: Trade) => void;
  /** Writes a changed trade straight through, without opening the form. */
  onUpdate: (trade: Trade) => Promise<void>;
}) {
  /** The trade a note is being written for, and whether it is «الدرس». */
  const [noteFor, setNoteFor] = useState<{
    trade: Trade;
    asLesson: boolean;
  } | null>(null);

  /**
   * Only OPEN positions get a quote. A closed trade already has its final
   * result and a plan has not been taken, so asking the market about either
   * would be a request whose answer means nothing — and it is the app's rule
   * too: LivePnlView renders for open positions and nothing else.
   */
  const { quotes } = useQuotes(
    showLivePrices
      ? trades
          .filter((t) => t.status === 'open' && t.quantity > 0)
          .map((t) => normalizeTicker(t.ticker))
      : []
  );

  // `today` is passed rather than read inside, so the pure function stays
  // deterministic — the same reason the Dart version takes it as a parameter.
  const d = decisionsOf(trades, {
    capital,
    maxRiskPercent,
    today: new Date(),
    waitingThresholdDays,
  });

  /** MarkOpenButton: a plan becomes a position. */
  async function markOpen(trade: Trade) {
    // The app refuses and sends you to the form instead, because a position
    // opened at zero shares has risk figures that mean nothing.
    if (trade.quantity <= 0) {
      onEdit(trade);
      return;
    }
    await onUpdate({ ...trade, status: 'open' as TradeStatus });
  }

  /** CancelTradeButton: an idea you decided against. Confirmed, like the app. */
  async function cancel(trade: Trade) {
    if (!window.confirm(`متأكد إنك عايز تلغي فكرة ${trade.ticker}؟`)) return;
    await onUpdate({ ...trade, status: 'cancelled' as TradeStatus });
  }

  /**
   * CloseTradeButton opens the form rather than flipping a flag: closing needs
   * an exit price and an exit date, and inventing either would fabricate the
   * trade's result.
   */
  const close = onEdit;

  async function saveNote(text: string) {
    if (noteFor === null) return;
    const { trade, asLesson } = noteFor;
    const now = new Date();
    const entry = {
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      text,
    };
    const existingNotes = (trade.notes ?? '').trim();
    await onUpdate({
      ...trade,
      // The whole array, always — Firestore replaces an array field rather than
      // merging its items, so a partial write would drop the earlier entries.
      timeline: [...trade.timeline, entry],
      notes: asLesson && existingNotes === '' ? text : trade.notes,
    });
    setNoteFor(null);
  }

  if (d.isEmpty) {
    return (
      <div className="rounded-lg border border-border-default bg-surface p-8 text-center">
        <h2 className="text-lg font-bold">مفيش حاجة محتاجة قرار النهاردة</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">
          مفيش مركز مفتوح ولا فكرة مخططة مستنية. الشاشة دي بتفضل فاضية لحد ما
          يبقى فيه شغل فعلي.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SummaryCard
        openCount={d.open.length}
        overRiskCount={d.overRisk.length}
        plannedCount={d.planned.length}
        closedThisWeekCount={d.recentlyClosed.length}
        watchlistCount={watchlistCount}
      />

      {/* Titles are the app's, verbatim. «محتاجة ملاحظة» is deliberately NOT a
          section here: the app removed it because it fired on any open position
          untouched for a week, which is not a decision — it is a reminder to
          journal, and it filled the day's screen with cards asking for nothing
          in particular. The note button lives on the cards instead. */}
      <Section
        title="تجاوز حد المخاطرة"
        Icon={WarningIcon}
        note="بتكسر القاعدة اللي انت حاططها بنفسك — دي أول حاجة تتحل"
        items={d.overRisk}
        tone="loss"
        capital={capital}
        quotes={quotes}
        showLivePrices={showLivePrices}
        actions={(item) => (
          <>
            <Action kind="ghost" onClick={() => onEdit(item.trade)}>
              تعديل
            </Action>
            {item.trade.status === 'open' && (
              <Action kind="primary" onClick={() => close(item.trade)}>
                إقفال
              </Action>
            )}
          </>
        )}
      />

      <Section
        title="منتظرة من زمان"
        Icon={HourglassIcon}
        note={`مفتوحة من أكتر من ${waitingThresholdDays} يوم`}
        items={d.waitingTooLong}
        capital={capital}
        quotes={quotes}
        showLivePrices={showLivePrices}
        actions={(item) => (
          <>
            <Action kind="primary" onClick={() => close(item.trade)}>
              إقفال
            </Action>
            <Action
              kind="tonal"
              onClick={() => setNoteFor({ trade: item.trade, asLesson: false })}
            >
              ملاحظة
            </Action>
          </>
        )}
      />

      <Section
        title="الصفقات المفتوحة"
        Icon={TrendingUpIcon}
        note="الأقدم الأول — اللي مستني من زمان هو اللي محتاج قرار"
        items={d.open}
        capital={capital}
        quotes={quotes}
        showLivePrices={showLivePrices}
        actions={(item) => (
          <>
            <Action
              kind="tonal"
              onClick={() => setNoteFor({ trade: item.trade, asLesson: false })}
            >
              ملاحظة
            </Action>
            <Action kind="primary" onClick={() => close(item.trade)}>
              إقفال
            </Action>
            <Action kind="ghost" onClick={() => onEdit(item.trade)}>
              تعديل
            </Action>
          </>
        )}
      />

      <Section
        title="الصفقات المخططة"
        Icon={LightbulbIcon}
        note="لسه ماخدتش، فمش داخلة في أي إحصائية"
        items={d.planned}
        capital={capital}
        quotes={quotes}
        showLivePrices={showLivePrices}
        actions={(item) => (
          <>
            <Action kind="primary" onClick={() => void markOpen(item.trade)}>
              افتحها
            </Action>
            <Action kind="ghost" onClick={() => onEdit(item.trade)}>
              تعديل
            </Action>
            <Action kind="ghost" onClick={() => void cancel(item.trade)}>
              إلغاء
            </Action>
          </>
        )}
      />

      <Section
        title="أُقفلت مؤخرًا"
        Icon={CheckCircleIcon}
        tone="win"
        note="سجل، مش مهمة"
        items={d.recentlyClosed}
        capital={capital}
        quotes={quotes}
        showLivePrices={showLivePrices}
        actions={(item) => (
          <Action
            kind="tonal"
            onClick={() => setNoteFor({ trade: item.trade, asLesson: true })}
          >
            أضف الدرس
          </Action>
        )}
      />

      {noteFor !== null && (
        <NoteDialog
          asLesson={noteFor.asLesson}
          ticker={noteFor.trade.ticker}
          onCancel={() => setNoteFor(null)}
          onSave={saveNote}
        />
      )}
    </div>
  );
}

/**
 * «ملخص النهاردة» — the app's SummaryCard.
 *
 * Counts only, and only the five the app shows. The browser had the same
 * numbers as four bare boxes with no heading, which said nothing about what
 * they were a summary OF.
 */
function SummaryCard({
  openCount,
  overRiskCount,
  plannedCount,
  closedThisWeekCount,
  watchlistCount,
}: {
  openCount: number;
  overRiskCount: number;
  plannedCount: number;
  closedThisWeekCount: number;
  watchlistCount: number;
}) {
  return (
    <section className="rounded-2xl border border-border-default bg-surface p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-[10px] bg-brand/25 text-brand-ink">
          <SparkIcon className="size-4" />
        </span>
        <h2 className="font-bold">ملخص النهاردة</h2>
      </div>

      <div className="mt-4 flex flex-wrap gap-2.5">
        <Tile label="مفتوحة" value={openCount} />
        <Tile
          label="تجاوزت الحد"
          value={overRiskCount}
          tone={overRiskCount > 0 ? 'loss' : undefined}
        />
        <Tile label="مخططة" value={plannedCount} />
        <Tile label="أُقفلت الأسبوع ده" value={closedThisWeekCount} tone="win" />
        {watchlistCount > 0 && <Tile label="متابعة" value={watchlistCount} />}
      </div>
    </section>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'win' | 'loss';
}) {
  return (
    <div
      className={`min-w-[84px] flex-1 rounded-xl px-3 py-2.5 text-center ${
        tone === 'loss'
          ? 'bg-loss-surface'
          : tone === 'win'
            ? 'bg-win-surface'
            : 'bg-surface-low'
      }`}
    >
      <p
        className={`num text-xl font-bold ${
          tone === 'loss' ? 'text-loss' : tone === 'win' ? 'text-win' : ''
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] leading-tight text-fg-muted">{label}</p>
    </div>
  );
}

function Section({
  title,
  note,
  items,
  tone,
  Icon,
  capital,
  quotes,
  showLivePrices,
  actions,
}: {
  title: string;
  note: string;
  items: DecisionItem[];
  tone?: 'loss' | 'win';
  Icon: (props: { className?: string }) => React.ReactElement;
  capital: number;
  quotes: Map<string, Quote>;
  showLivePrices: boolean;
  actions: (item: DecisionItem) => React.ReactNode;
}) {
  // An empty section is not rendered at all. A screen of "0" headings is what
  // makes a task list feel like paperwork instead of a to-do.
  if (items.length === 0) return null;

  return (
    <section>
      {/* The app's ActionSection header: a tinted icon square, the title in the
          accent colour, then the count as a filled chip. The browser had three
          words of plain bold text, which is why the same screen read as two
          different products side by side. */}
      <div className="mb-4">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex size-8 shrink-0 items-center justify-center rounded-[10px] ${
              tone === 'loss'
                ? 'bg-loss-surface text-loss'
                : tone === 'win'
                  ? 'bg-win-surface text-win'
                  : 'bg-brand/25 text-brand-ink'
            }`}
          >
            <Icon className="size-4" />
          </span>
          <h2
            className={`font-bold ${
              tone === 'loss'
                ? 'text-loss'
                : tone === 'win'
                  ? 'text-win'
                  : 'text-brand-ink'
            }`}
          >
            {title}
          </h2>
          <span
            className={`num rounded-full px-2.5 py-0.5 text-xs font-bold ${
              tone === 'loss'
                ? 'bg-loss-surface text-loss'
                : tone === 'win'
                  ? 'bg-win-surface text-win'
                  : 'bg-brand/25 text-brand-ink'
            }`}
          >
            {items.length}
          </span>
        </div>
        <p className="mt-1.5 text-xs text-fg-subtle">{note}</p>
      </div>

      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={`${title}-${item.trade.id}`}
            className={`rounded-2xl border bg-surface-low p-4 ${
              item.overRisk ? 'border-loss-border' : 'border-border-default'
            }`}
          >
            {/* Ticker and the trade's own state, exactly as the app's card
                opens. */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="num text-lg font-bold">
                {item.trade.ticker || '—'}
              </span>
              <StatusChip status={item.trade.status} result={item.metrics.result} />
              {item.trade.isFavorite && (
                <span className="text-xs text-fg-subtle">★</span>
              )}
            </div>

            {item.overRisk && (
              <p className="mt-2.5 rounded-xl bg-loss-surface px-3 py-2 text-xs font-bold text-loss">
                تحذير: المخاطرة أعلى من الحد المسموح
              </p>
            )}

            {/* TradeLevels, one for one. Missing values render «—» rather than
                vanishing, so the five slots keep their order and place on every
                card — a target that disappears reads as "no target" only if you
                already knew a slot was there. */}
            <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              <Level label="الدخول" value={money(item.trade.entryPrice)} />
              <Level label="الاستوب" value={money(item.trade.stopPrice)} />
              <Level label="الهدف" value={money(item.trade.takeProfitPrice)} />
              <Level
                label="عدد الأسهم"
                value={
                  item.trade.quantity > 0
                    ? formatQuantity(item.trade.quantity)
                    : EMPTY_VALUE
                }
              />
              <Level
                label="قيمة المركز"
                value={money(item.metrics.positionValue)}
              />
            </dl>

            <dl className="mt-2.5 flex flex-wrap gap-x-4 gap-y-2">
              <Level
                label="المخاطرة"
                value={percent(item.metrics.riskPct)}
                tone={item.overRisk ? 'loss' : undefined}
              />
              <Level
                label="الأيام"
                value={formatQuantity(item.daysSinceEntry)}
              />
              {item.metrics.pnl !== null && (
                <Level
                  label="الناتج"
                  value={signedMoney(item.metrics.pnl)}
                  tone={
                    item.metrics.result === 'win'
                      ? 'win'
                      : item.metrics.result === 'loss'
                        ? 'loss'
                        : undefined
                  }
                />
              )}
            </dl>

            {/* Only an open position has a running result. A planned idea has
                not risked money yet — the app's own rule. */}
            {item.trade.status === 'open' &&
              item.trade.ticker.trim() !== '' &&
              showLivePrices && (
                <LivePnl
                  quote={quotes.get(normalizeTicker(item.trade.ticker))}
                  entryPrice={item.trade.entryPrice}
                  quantity={item.trade.quantity}
                />
              )}

            {/* Equal width, like the app's Row of Expanded buttons — the row
                reads as one control strip instead of three loose chips. */}
            <div className="mt-3.5 flex gap-2">{actions(item)}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** One slot of the levels grid. «—» keeps the place rather than collapsing. */
function Level({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'win' | 'loss';
}) {
  const unset = value === EMPTY_VALUE;
  return (
    <div className="min-w-[62px]">
      <dt className="text-[11px] leading-tight text-fg-muted">{label}</dt>
      <dd
        className={`num mt-0.5 text-sm font-bold ${
          unset
            ? 'text-fg-subtle'
            : tone === 'loss'
              ? 'text-loss'
              : tone === 'win'
                ? 'text-win'
                : ''
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * The trade's state, and it reads the STATUS first.
 *
 * The app shows a ResultBadge here, which only knows win/loss/breakeven/open —
 * so a PLANNED idea, having no exit, comes out labelled «مفتوحة». That is how
 * the same trade ended up captioned «مخططة» by its section and «مفتوحة» by its
 * own badge on one screen. A plan is not an open position, and the chip says so
 * before it says anything about a result.
 */
function StatusChip({
  status,
  result,
}: {
  status: TradeStatus;
  result: 'win' | 'loss' | 'breakeven' | 'open';
}) {
  const label =
    status === 'planned'
      ? 'مخططة'
      : status === 'cancelled'
        ? 'ملغاة'
        : status === 'open'
          ? 'مفتوحة'
          : result === 'win'
            ? 'ربح'
            : result === 'loss'
              ? 'خسارة'
              : 'تعادل';

  const tone =
    status === 'closed' && result === 'win'
      ? 'border-win-border bg-win-surface text-win'
      : status === 'closed' && result === 'loss'
        ? 'border-loss-border bg-loss-surface text-loss'
        : 'border-border-strong text-fg-muted';

  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${tone}`}
    >
      {label}
    </span>
  );
}

/**
 * Three weights, mapping to the app's FilledButton / FilledButton.tonal /
 * OutlinedButton — so the one action a card is really for reads as the one
 * action it is really for.
 */
function Action({
  kind,
  onClick,
  children,
}: {
  kind: 'primary' | 'tonal' | 'ghost';
  onClick: () => void;
  children: React.ReactNode;
}) {
  const cls =
    kind === 'primary'
      ? 'bg-brand text-on-brand hover:opacity-90'
      : kind === 'tonal'
        ? 'bg-surface-high text-fg hover:opacity-90'
        : 'border border-border-strong text-fg-muted hover:bg-surface-high hover:text-fg';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-md px-3 py-2.5 text-xs font-semibold transition-opacity ${cls}`}
    >
      {children}
    </button>
  );
}

/** The app's note dialog: a box, a save, and nothing else. */
function NoteDialog({
  asLesson,
  ticker,
  onCancel,
  onSave,
}: {
  asLesson: boolean;
  ticker: string;
  onCancel: () => void;
  onSave: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    const trimmed = text.trim();
    if (trimmed === '' || busy) return;
    setBusy(true);
    try {
      await onSave(trimmed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-5"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-t-2xl border border-border-default bg-surface p-4 shadow-2xl sm:rounded-2xl sm:p-5"
      >
        <h2 className="font-bold">
          {asLesson ? 'الدرس المستفاد' : 'إضافة ملاحظة'}
          <span className="num ps-2 font-normal text-fg-subtle">{ticker}</span>
        </h2>

        <textarea
          autoFocus
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            asLesson
              ? 'إيه اللي اتعلمته من الصفقة دي؟'
              : 'مثال: حركت الاستوب لسعر الدخول'
          }
          className="mt-3 w-full rounded-md border border-border-default bg-surface-low px-3 py-2 text-sm outline-none focus:border-brand-ink"
        />

        {/* Said outright, because the app learned this the hard way: a plain
            note only lands in the timeline, so saving one used to close the
            dialog and change nothing visible — reported as a broken button. */}
        <p className="mt-2 text-xs leading-relaxed text-fg-subtle">
          بتتسجّل في تايم لاين الصفقة بتاريخ النهاردة، وهتلاقيها على التطبيق كمان.
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border-default px-4 py-2 text-sm font-semibold text-fg-muted transition-colors hover:bg-surface-high hover:text-fg"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={text.trim() === '' || busy}
            className="rounded-md bg-brand px-5 py-2 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? 'بيتحفظ…' : 'حفظ'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Unrealised profit on an open position, from the last close.
 *
 * The counterpart of lib/features/market/widgets/live_pnl_view.dart, including
 * the rule that matters most: EVERY NON-SUCCESS PATH IS A QUIET MUTED LINE, not
 * an error and never a zero. A price that failed to arrive must not look like a
 * position that has not moved.
 *
 * «آخر إغلاق» is the honest label. This is a daily close from an unofficial
 * feed, not a live tick, and calling it anything else would invite somebody to
 * trade on it.
 */
function LivePnl({
  quote,
  entryPrice,
  quantity,
}: {
  quote: Quote | undefined;
  entryPrice: number;
  quantity: number;
}) {
  if (quote === undefined) {
    return (
      <p className="mt-3 rounded-md bg-surface px-3 py-2 text-xs text-fg-subtle">
        مفيش سعر متاح للسهم ده دلوقتي.
      </p>
    );
  }

  const result = unrealised(entryPrice, quantity, quote.price);
  if (result === null) {
    return (
      <p className="mt-3 rounded-md bg-surface px-3 py-2 text-xs text-fg-subtle">
        مفيش سعر متاح للسهم ده دلوقتي.
      </p>
    );
  }

  const tone =
    result.pnl > 0 ? 'text-win' : result.pnl < 0 ? 'text-loss' : 'text-fg-muted';

  return (
    <div
      className={`mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md px-3 py-2 ${
        result.pnl > 0
          ? 'bg-win-surface'
          : result.pnl < 0
            ? 'bg-loss-surface'
            : 'bg-surface'
      }`}
    >
      <div>
        <p className="text-[11px] text-fg-muted">ربح/خسارة غير محققة</p>
        <p className={`num whitespace-nowrap font-bold ${tone}`}>
          {signedMoney(result.pnl)}{' '}
          <span className="text-xs">({signedPercent(result.pct)})</span>
        </p>
      </div>
      <div className="text-end">
        <p className="text-[11px] text-fg-muted">آخر إغلاق</p>
        <p className="num text-sm font-semibold">{money(quote.price)}</p>
        <p className="num text-[11px] text-fg-subtle">{dateLabel(quote.asOf)}</p>
      </div>
    </div>
  );
}
