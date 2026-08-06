'use client';

import { decisionsOf, type DecisionItem } from '@/lib/decisions';
import { dateLabel, money, percent, signedMoney } from '@/lib/format';
import type { Trade } from '@/lib/trade';

/**
 * «قرار اليوم» — what needs a decision today, not a list of everything.
 *
 * Sections render in the app's own order of urgency: a rule you are breaking
 * right now comes before a position that has merely waited a while.
 */
export function TodayPanel({
  trades,
  capital,
  maxRiskPercent,
  waitingThresholdDays,
  onEdit,
}: {
  trades: Trade[];
  capital: number;
  maxRiskPercent: number;
  waitingThresholdDays: number;
  onEdit: (trade: Trade) => void;
}) {
  // `today` is passed rather than read inside, so the pure function stays
  // deterministic — the same reason the Dart version takes it as a parameter.
  const d = decisionsOf(trades, {
    capital,
    maxRiskPercent,
    today: new Date(),
    waitingThresholdDays,
  });

  if (d.isEmpty) {
    return (
      <div className="rounded-lg border border-border-default bg-surface p-10 text-center">
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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Count label="فوق حد المخاطرة" value={d.overRisk.length} tone="loss" />
        <Count label="مفتوحة" value={d.open.length} />
        <Count label="مخططة" value={d.planned.length} />
        <Count label="محتاجة ملاحظة" value={d.needsReview.length} />
      </div>

      <Section
        title="فوق حد المخاطرة"
        note="بتكسر القاعدة اللي انت حاططها بنفسك — دي أول حاجة تتحل"
        items={d.overRisk}
        tone="loss"
        capital={capital}
        onEdit={onEdit}
      />
      <Section
        title="مستنية أكتر من اللازم"
        note={`مفتوحة من أكتر من ${waitingThresholdDays} يوم`}
        items={d.waitingTooLong}
        capital={capital}
        onEdit={onEdit}
      />
      <Section
        title="محتاجة ملاحظة"
        note="مركز مفتوح من غير تحديث، أو صفقة قفلت من غير درس مكتوب"
        items={d.needsReview}
        capital={capital}
        onEdit={onEdit}
      />
      <Section
        title="مراكز مفتوحة"
        note="الأقدم الأول — اللي مستني من زمان هو اللي محتاج قرار"
        items={d.open}
        capital={capital}
        onEdit={onEdit}
      />
      <Section
        title="أفكار مخططة"
        note="لسه ماخدتش، فمش داخلة في أي إحصائية"
        items={d.planned}
        capital={capital}
        onEdit={onEdit}
      />
      <Section
        title="قفلت الأسبوع ده"
        note="سجل، مش مهمة"
        items={d.recentlyClosed}
        capital={capital}
        onEdit={onEdit}
      />
    </div>
  );
}

function Section({
  title,
  note,
  items,
  tone,
  capital,
  onEdit,
}: {
  title: string;
  note: string;
  items: DecisionItem[];
  tone?: 'loss';
  capital: number;
  onEdit: (trade: Trade) => void;
}) {
  // An empty section is not rendered at all. A screen of "0" headings is what
  // makes a task list feel like paperwork instead of a to-do.
  if (items.length === 0) return null;

  return (
    <section
      className={`rounded-lg border bg-surface p-4 sm:p-5 ${
        tone === 'loss' ? 'border-loss-border' : 'border-border-default'
      }`}
    >
      <div className="mb-4">
        <h2
          className={`flex items-center gap-2 font-bold ${
            tone === 'loss' ? 'text-loss' : ''
          }`}
        >
          {title}
          <span className="num font-normal text-fg-subtle">{items.length}</span>
        </h2>
        <p className="mt-1 text-xs text-fg-subtle">{note}</p>
      </div>

      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={`${title}-${item.trade.id}`}
            className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-border-default bg-surface-low p-4"
          >
            <div className="min-w-0">
              <p className="flex items-center gap-2">
                <span className="num font-bold">{item.trade.ticker || '—'}</span>
                {item.overRisk && (
                  <span className="rounded-full border border-loss-border bg-loss-surface px-2 py-0.5 text-[11px] font-bold text-loss">
                    فوق الحد
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs text-fg-muted">
                دخول <span className="num">{money(item.trade.entryPrice)}</span>{' '}
                · استوب <span className="num">{money(item.trade.stopPrice)}</span>
                {capital > 0 && item.metrics.riskPct !== null && (
                  <>
                    {' '}· مخاطرة{' '}
                    <span className="num">{percent(item.metrics.riskPct)}</span>
                  </>
                )}
              </p>
              <p className="mt-1 text-xs text-fg-subtle">
                {item.trade.exitDate ? (
                  <>
                    قفلت{' '}
                    <span className="num">{dateLabel(item.trade.exitDate)}</span>
                  </>
                ) : (
                  <>
                    من <span className="num">{item.daysSinceEntry}</span> يوم ·{' '}
                    <span className="num">{dateLabel(item.trade.entryDate)}</span>
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {item.metrics.pnl !== null && (
                <span
                  className={`num font-bold ${
                    item.metrics.result === 'win'
                      ? 'text-win'
                      : item.metrics.result === 'loss'
                        ? 'text-loss'
                        : ''
                  }`}
                >
                  {signedMoney(item.metrics.pnl)}
                </span>
              )}
              <button
                type="button"
                onClick={() => onEdit(item.trade)}
                className="rounded-md border border-border-strong px-4 py-2 text-xs font-semibold transition-colors hover:bg-surface-high"
              >
                افتحها
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Count({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'loss';
}) {
  return (
    <div className="rounded-lg border border-border-default bg-surface p-4 sm:p-5">
      <p className="text-sm text-fg-muted">{label}</p>
      <p
        className={`num mt-1.5 text-2xl font-bold ${
          tone === 'loss' && value > 0 ? 'text-loss' : ''
        }`}
      >
        {value}
      </p>
    </div>
  );
}
