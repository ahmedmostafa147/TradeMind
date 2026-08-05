'use client';

import { useEffect, useState } from 'react';

import { money, signedMoney } from '@/lib/format';
import type { FlowTable, InvestorClass, Nationality } from '@/lib/market-flows';
import { loadRecentFlows, type StoredFlows } from '@/lib/market-flows-store';

/**
 * «مين اشترى ومين باع» — the market side of the product.
 *
 * The claim this screen makes is factual and nothing more: on this date, these
 * groups bought and sold these amounts, as reported by the exchange. It draws
 * no conclusion and suggests no action, which is both what the disclaimer
 * requires and what makes the data worth showing — a trader reading that
 * foreign institutions were net buyers three sessions running does not need to
 * be told what to do about it.
 */

const NATIONALITY_LABELS: Record<Nationality, string> = {
  egyptian: 'مصريين',
  arab: 'عرب',
  foreign: 'أجانب',
};

const CLASS_LABELS: Record<InvestorClass, string> = {
  all: 'الكل',
  institutions: 'مؤسسات',
  individuals: 'أفراد',
};

export function MarketFlowsPanel() {
  const [sessions, setSessions] = useState<StoredFlows[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [investorClass, setInvestorClass] = useState<InvestorClass>('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await loadRecentFlows(30);
        if (!cancelled) setSessions(rows);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return (
      <p
        role="alert"
        className="rounded-md border border-loss-border bg-loss-surface p-4 text-sm font-semibold text-loss"
      >
        تعذّر تحميل بيانات السوق.
      </p>
    );
  }

  if (sessions === null) {
    return (
      <div
        className="space-y-3"
        role="status"
        aria-busy="true"
        aria-label="جاري التحميل"
      >
        {[0, 1].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-surface-high" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border-default p-12 text-center">
        <h2 className="text-lg font-bold">لسه مفيش بيانات سوق</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">
          أرقام تداولات المستثمرين بتتسحب من البورصة المصرية. أول ما أول جلسة
          تتخزّن هتلاقيها هنا.
        </p>
      </div>
    );
  }

  const latest = sessions[0];
  const table = latest[investorClass];

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border-default bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-bold">مين اشترى ومين باع</h2>
            <p className="num mt-1 text-xs text-fg-subtle" dir="ltr">
              {latest.date}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(['all', 'institutions', 'individuals'] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setInvestorClass(id)}
                aria-current={investorClass === id ? 'true' : undefined}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  investorClass === id
                    ? 'bg-brand text-on-brand'
                    : 'border border-border-default text-fg-muted hover:bg-surface-high'
                }`}
              >
                {CLASS_LABELS[id]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {(['egyptian', 'arab', 'foreign'] as const).map((nationality) => (
            <NetCard
              key={nationality}
              label={NATIONALITY_LABELS[nationality]}
              row={table[nationality]}
            />
          ))}
        </div>

        <FlowBar table={table} />
      </section>

      {sessions.length > 1 && (
        <History sessions={sessions} investorClass={investorClass} />
      )}

      <p className="text-xs leading-relaxed text-fg-subtle">
        المصدر: البورصة المصرية — صفحة تداولات المستثمرين. الأرقام زي ما البورصة
        نشرتها، وممكن تتعدّل بعد إقفال الجلسة. دي بيانات تاريخية عن اللي حصل،
        <strong> مش توصية ولا تحليل</strong>، ورادار مبيقولش لك تعمل إيه بيها.
      </p>
    </div>
  );
}

/**
 * One group's net.
 *
 * WIN/LOSS COLOURS ARE USED HERE AND THE REASON IS NARROW: this is money with a
 * direction, which is exactly what those two tokens mean everywhere else in the
 * product. Green is net buying, red is net selling — NOT "good" and "bad". A
 * trader seeing foreigners in red must read "they sold", and the label says so
 * in words so the colour is never carrying the meaning alone.
 */
function NetCard({
  label,
  row,
}: {
  label: string;
  row: FlowTable[Nationality];
}) {
  const buying = row.net > 0;
  const flat = row.net === 0;

  return (
    <div className="rounded-lg border border-border-default bg-surface-low p-5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-bold">{label}</p>
        <p className="text-xs font-semibold text-fg-muted">
          {flat ? 'متعادل' : buying ? 'صافي شراء' : 'صافي بيع'}
        </p>
      </div>

      <p
        className={`num mt-2 text-2xl font-bold ${
          flat ? '' : buying ? 'text-win' : 'text-loss'
        }`}
      >
        {signedMoney(row.net)}
      </p>

      <dl className="mt-3 space-y-1 text-xs text-fg-muted">
        <div className="flex justify-between gap-2">
          <dt>اشترى</dt>
          <dd className="num">{money(row.bought)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>باع</dt>
          <dd className="num">{money(row.sold)}</dd>
        </div>
      </dl>

      {/* Surfaced rather than swallowed: if the exchange's own net does not
          equal bought − sold, the reader should know the figure is theirs and
          not ours before drawing anything from it. */}
      {row.netMismatch && (
        <p className="mt-3 text-[11px] leading-relaxed text-fg-subtle">
          صافي البورصة مش مطابق للفرق بين الشراء والبيع — الرقم المعروض هو
          بتاعهم زي ما هو.
        </p>
      )}
    </div>
  );
}

/** Share of the session's buying, as one bar. Sums the BUY side, which is the
 *  side that always totals the session's turnover. */
function FlowBar({ table }: { table: FlowTable }) {
  const total =
    table.egyptian.bought + table.arab.bought + table.foreign.bought;
  if (total <= 0) return null;

  const parts = (['egyptian', 'arab', 'foreign'] as const).map((n) => ({
    nationality: n,
    share: table[n].bought / total,
  }));

  return (
    <div className="mt-6 border-t border-border-default pt-5">
      <p className="text-xs font-semibold text-fg-muted">
        نصيب كل فئة من الشراء
      </p>

      <div
        className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-surface-highest"
        role="img"
        aria-label={parts
          .map(
            (p) =>
              `${NATIONALITY_LABELS[p.nationality]} ${Math.round(p.share * 100)}%`
          )
          .join('، ')}
      >
        {parts.map((p, index) => (
          <div
            key={p.nationality}
            style={{ width: `${p.share * 100}%` }}
            // Neutral ramp, not win/loss: a share of turnover has no direction,
            // and reusing the money colours here would drain them of meaning
            // two hundred pixels above where they carry it.
            className={
              index === 0
                ? 'bg-fg'
                : index === 1
                  ? 'bg-fg-muted'
                  : 'bg-fg-subtle'
            }
          />
        ))}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-fg-muted">
        {parts.map((p) => (
          <li key={p.nationality} className="flex items-center gap-1.5">
            <span>{NATIONALITY_LABELS[p.nationality]}</span>
            <span className="num font-semibold text-fg">
              {Math.round(p.share * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function History({
  sessions,
  investorClass,
}: {
  sessions: StoredFlows[];
  investorClass: InvestorClass;
}) {
  return (
    <section className="rounded-lg border border-border-default bg-surface p-6">
      <h3 className="font-bold">الجلسات السابقة</h3>
      <p className="mt-1 text-xs text-fg-subtle">
        صافي التعامل لكل فئة — {CLASS_LABELS[investorClass]}
      </p>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-default">
              <th scope="col" className="px-3 py-2 text-start font-semibold">
                التاريخ
              </th>
              {(['egyptian', 'arab', 'foreign'] as const).map((n) => (
                <th
                  key={n}
                  scope="col"
                  className="px-3 py-2 text-start font-semibold"
                >
                  {NATIONALITY_LABELS[n]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr
                key={session.date}
                className="border-b border-border-default last:border-0"
              >
                <td className="num px-3 py-2 text-fg-muted" dir="ltr">
                  {session.date}
                </td>
                {(['egyptian', 'arab', 'foreign'] as const).map((n) => {
                  const net = session[investorClass][n].net;
                  return (
                    <td
                      key={n}
                      className={`num px-3 py-2 font-semibold ${
                        net > 0 ? 'text-win' : net < 0 ? 'text-loss' : ''
                      }`}
                    >
                      {signedMoney(net)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
