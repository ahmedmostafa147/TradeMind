'use client';

import { useEffect, useMemo, useState } from 'react';

import { flowsHistory, type FlowRun } from '@/lib/calc';
import { money, sessionsPhrase, signedMoney } from '@/lib/format';
import type { FlowTable, InvestorClass, Nationality } from '@/lib/market-flows';
import { loadRecentFlows, type StoredFlows } from '@/lib/market-flows-store';
import { useBoard } from '@/lib/use-board';
import { TradingViewChartDialog } from '@/components/dashboard/tradingview-chart-dialog';
import { EgxBotHeroWidget } from '@/components/dashboard/egxbot-hero-widget';
import { MarketMoversSection } from '@/components/dashboard/market-movers';

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
  const [investorClass, setInvestorClass] = useState<InvestorClass>('all');
  const [chartSymbol, setChartSymbol] = useState<string | null>(null);

  // THE SAME HOOK THE STOCKS TAB USES. This panel had its own `fetch`, and it
  // asked for `/api/stocks` without the trailing slash — a 308 and a second
  // round trip before the board even started loading. One caller, one path,
  // and a reader who visits both tabs gets one response out of the HTTP cache.
  const { rows: stocks, loading: loadingStocks } = useBoard();

  useEffect(() => {
    let cancelled = false;
    loadRecentFlows(30)
      .then((rows) => {
        if (!cancelled) setSessions(rows);
      })
      .catch(() => {
        if (!cancelled) setSessions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Sorted once per board change, not on every keystroke elsewhere on the page.
  const { top5Gainers, top5Losers } = useMemo(() => {
    const sorted = [...stocks].sort(
      (a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0)
    );
    return {
      top5Gainers: sorted.slice(0, 5),
      top5Losers: [...sorted].reverse().slice(0, 5),
    };
  }, [stocks]);

  const latestSession = sessions && sessions.length > 0 ? sessions[0] : null;
  const table = latestSession ? latestSession[investorClass] : null;

  return (
    <div className="space-y-6">
      <EgxBotHeroWidget />

      {chartSymbol && (
        <TradingViewChartDialog
          symbol={chartSymbol}
          onClose={() => setChartSymbol(null)}
        />
      )}

      {/* TradingView Top 5 Movers Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold sm:text-lg">
            أداء أسهم البورصة اليوم
          </h2>
          <span className="rounded-full bg-surface-high px-2.5 py-1 text-xs font-semibold text-fg-muted">
            TradingView
          </span>
        </div>

        <MarketMoversSection
          gainers={top5Gainers}
          losers={top5Losers}
          loading={loadingStocks}
          onSelect={setChartSymbol}
        />
      </section>

      {/* Investor Flows Section (if available) */}
      {latestSession && table && (
        <section className="rounded-2xl border border-border-default bg-surface p-4 sm:p-5 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-extrabold text-sm sm:text-base">مين اشترى ومين باع</h2>
              <p className="num mt-1 text-xs text-fg-subtle" dir="ltr">
                {latestSession.date}
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(['all', 'institutions', 'individuals'] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setInvestorClass(id)}
                  aria-current={investorClass === id ? 'true' : undefined}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    investorClass === id
                      ? 'bg-brand text-on-brand shadow-xs'
                      : 'border border-border-default bg-surface-high text-fg-muted hover:bg-surface-subtle'
                  }`}
                >
                  {CLASS_LABELS[id]}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
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
      )}

      {sessions && sessions.length > 1 && (
        <History sessions={sessions} investorClass={investorClass} />
      )}

      <p className="text-[11px] leading-relaxed text-fg-subtle">
        {/* The disclaimer is WEAKEST where the product most looks like it is
            recommending: a list titled «أعلى ٥ أسهم» is the closest thing here
            to a pick. «استرشادية فقط» on its own does not say the thing. */}
        المصدر: TradingView Egypt Scanner والبورصة المصرية — الأسعار متأخرة ١٥
        دقيقة. الترتيب ده وصف للي حصل في الجلسة، للاسترشاد بس،{' '}
        <strong>وليس توصية بالبيع أو الشراء</strong>.
      </p>
    </div>
  );
}

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
    <div className="rounded-xl border border-border-default bg-surface-low p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-fg">{label}</span>
        <span
          className={`num rounded-md px-2 py-0.5 text-[11px] font-bold ${
            flat
              ? 'bg-surface-high text-fg-muted'
              : buying
                ? 'bg-win-surface text-win'
                : 'bg-loss-surface text-loss'
          }`}
        >
          {flat ? 'متعادل' : buying ? 'صافي شراء' : 'صافي بيع'}
        </span>
      </div>

      <p
        className={`num mt-2 text-xl font-extrabold sm:text-2xl ${
          flat ? 'text-fg' : buying ? 'text-win' : 'text-loss'
        }`}
      >
        {signedMoney(row.net)}
      </p>

      <dl className="mt-3 space-y-1 text-xs text-fg-muted border-t border-border-default/60 pt-2">
        <div className="flex justify-between gap-2">
          <dt className="text-fg-subtle">اشترى</dt>
          <dd className="num font-bold text-fg">{money(row.bought)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-fg-subtle">باع</dt>
          <dd className="num font-bold text-fg">{money(row.sold)}</dd>
        </div>
      </dl>
    </div>
  );
}

function FlowBar({ table }: { table: FlowTable }) {
  const total =
    table.egyptian.bought + table.arab.bought + table.foreign.bought;
  if (total <= 0) return null;

  const parts = (['egyptian', 'arab', 'foreign'] as const).map((n) => ({
    nationality: n,
    share: table[n].bought / total,
  }));

  return (
    <div className="mt-5 border-t border-border-default pt-4">
      <p className="text-xs font-bold text-fg-muted mb-2">نصيب كل فئة من الشراء</p>
      <div
        className="flex h-2.5 overflow-hidden rounded-full bg-surface-highest"
        role="img"
      >
        {parts.map((p, index) => (
          <div
            key={p.nationality}
            style={{ width: `${p.share * 100}%` }}
            className={
              index === 0
                ? 'bg-brand'
                : index === 1
                ? 'bg-brand-ink'
                : 'bg-fg-muted'
            }
          />
        ))}
      </div>
    </div>
  );
}

/**
 * One nationality's streak and running total.
 *
 * THE DENOMINATOR IS PRINTED WITH THE TOTAL, always. This data has real holes —
 * the exchange sits behind bot defence and a collection run can fail — so «+210
 * مليون» on its own is a figure nobody can check, while «على 27 جلسة» is.
 *
 * NO COLOUR ON THE STREAK LINE, only on the money. Green and red mean profit
 * and loss everywhere else in this product (CLAUDE.md §1), and a green «5
 * جلسات» would read as five good sessions rather than five buying ones — a
 * claim about the reader's money that nobody made.
 */
function RunCard({
  nationality,
  run,
}: {
  nationality: Nationality;
  run: FlowRun | null;
}) {
  return (
    <div className="rounded-xl border border-border-default bg-surface-high p-3">
      <p className="text-xs font-bold text-fg">{NATIONALITY_LABELS[nationality]}</p>

      {run === null ? (
        // Absent, not zeroed: «0» here would state that nothing moved, which is
        // a different claim from "we have no sessions to read".
        <p className="mt-1.5 text-xs text-fg-subtle">مفيش جلسات مقروءة</p>
      ) : (
        <>
          <p
            className={`mt-1.5 text-sm font-extrabold ${
              run.total > 0 ? 'text-win' : run.total < 0 ? 'text-loss' : 'text-fg-muted'
            }`}
          >
            <span className="num">{signedMoney(run.total)}</span>
          </p>
          {/* NOT wrapped in `.num`. sessionsPhrase returns the numeral and the
              Arabic word together, and `.num` is `direction: ltr` — it would
              throw the word to the wrong end. See the note on the formatter. */}
          <p className="mt-0.5 text-[11px] text-fg-subtle">
            على {sessionsPhrase(run.sessions)}
          </p>
          <p className="mt-1.5 text-[11px] text-fg-muted">
            {run.hasRun
              ? `${sessionsPhrase(run.runLength)} ${
                  run.runBuying ? 'شراء' : 'بيع'
                } على التوالي`
              : 'مفيش سلسلة متصلة'}
          </p>
        </>
      )}
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
  // THE READING, ABOVE THE ROWS. The table under this was the whole feature and
  // it is a spreadsheet: thirty rows of signed millions that nobody derives a
  // streak from by eye. `flowsHistory` runs the app's own Dart — see
  // lib/core/calc/flows_history.dart — so the sentence printed here and the one
  // the phone prints come from one source rather than two.
  const runs = useMemo(() => {
    const out = {} as Record<Nationality, FlowRun | null>;
    for (const nationality of ['egyptian', 'arab', 'foreign'] as Nationality[]) {
      out[nationality] = flowsHistory(
        sessions.map((s) => s[investorClass][nationality]?.net ?? null)
      );
    }
    return out;
  }, [sessions, investorClass]);

  return (
    <section className="rounded-2xl border border-border-default bg-surface p-4 sm:p-5 shadow-xs">
      <h3 className="text-sm font-extrabold text-fg">الجلسات السابقة</h3>
      <p className="mt-0.5 text-xs text-fg-muted">
        صافي التعامل — {CLASS_LABELS[investorClass]}
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {(['egyptian', 'arab', 'foreign'] as Nationality[]).map((nationality) => (
          <RunCard
            key={nationality}
            nationality={nationality}
            run={runs[nationality]}
          />
        ))}
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-start text-xs">
          <thead>
            <tr className="border-b border-border-default text-fg-muted">
              <th className="py-2 text-start font-bold">التاريخ</th>
              <th className="py-2 text-start font-bold">مصريين</th>
              <th className="py-2 text-start font-bold">عرب</th>
              <th className="py-2 text-start font-bold">أجانب</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {sessions.map((s) => {
              const t = s[investorClass];
              return (
                <tr key={s.date}>
                  {/* `.num` on the SPAN, not the cell — on a `<td>` it brings
                      `display: inline-block` from globals.css and the cell stops
                      being a table-cell. Measured in admin-dashboard.tsx. */}
                  <td className="py-2 font-semibold text-fg">
                    <span className="num">{s.date}</span>
                  </td>
                  <td
                    className={`py-2 font-bold ${
                      t.egyptian.net > 0
                        ? 'text-win'
                        : t.egyptian.net < 0
                        ? 'text-loss'
                        : 'text-fg-muted'
                    }`}
                  >
                    <span className="num">{signedMoney(t.egyptian.net)}</span>
                  </td>
                  <td
                    className={`py-2 font-bold ${
                      t.arab.net > 0
                        ? 'text-win'
                        : t.arab.net < 0
                        ? 'text-loss'
                        : 'text-fg-muted'
                    }`}
                  >
                    <span className="num">{signedMoney(t.arab.net)}</span>
                  </td>
                  <td
                    className={`py-2 font-bold ${
                      t.foreign.net > 0
                        ? 'text-win'
                        : t.foreign.net < 0
                        ? 'text-loss'
                        : 'text-fg-muted'
                    }`}
                  >
                    <span className="num">{signedMoney(t.foreign.net)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
