'use client';

import { useEffect, useState } from 'react';

import { money, signedMoney } from '@/lib/format';
import type { FlowTable, InvestorClass, Nationality } from '@/lib/market-flows';
import { loadRecentFlows, type StoredFlows } from '@/lib/market-flows-store';
import type { BoardRow } from '@/lib/tradingview';
import { TradingViewChartDialog } from '@/components/dashboard/tradingview-chart-dialog';
import { QuoteBadge } from '@/components/dashboard/quote-badge';
import { EGX_DIRECTORY } from '@/lib/egx-directory';
import { EgxBotHeroWidget } from '@/components/dashboard/egxbot-hero-widget';

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
  const [stocks, setStocks] = useState<BoardRow[]>([]);
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [investorClass, setInvestorClass] = useState<InvestorClass>('all');
  const [chartSymbol, setChartSymbol] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadRecentFlows(30)
      .then((rows) => {
        if (!cancelled) setSessions(rows);
      })
      .catch(() => {
        if (!cancelled) setSessions([]);
      });

    fetch('/api/stocks')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.ok && Array.isArray(data.stocks)) {
          setStocks(data.stocks);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingStocks(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const sortedStocks = [...stocks].sort(
    (a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0)
  );

  const top5Gainers = sortedStocks.slice(0, 5);
  const top5Losers = [...sortedStocks].reverse().slice(0, 5);

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

        {loadingStocks ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-48 animate-pulse rounded-lg bg-surface-high" />
            <div className="h-48 animate-pulse rounded-lg bg-surface-high" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <MoversCard
              title="أعلى 5 أسهم (الأكثر ارتفاعاً)"
              type="gainers"
              rows={top5Gainers}
              onSelect={setChartSymbol}
            />
            <MoversCard
              title="أقل 5 أسهم (الأكثر انخفاضاً)"
              type="losers"
              rows={top5Losers}
              onSelect={setChartSymbol}
            />
          </div>
        )}
      </section>

      {/* Investor Flows Section (if available) */}
      {latestSession && table && (
        <section className="rounded-lg border border-border-default bg-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-bold">مين اشترى ومين باع</h2>
              <p className="num mt-1 text-xs text-fg-subtle" dir="ltr">
                {latestSession.date}
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
      )}

      {sessions && sessions.length > 1 && (
        <History sessions={sessions} investorClass={investorClass} />
      )}

      <p className="text-xs leading-relaxed text-fg-subtle">
        المصدر: TradingView Egypt Scanner و البورصة المصرية. الأرقام متاحة للاسترشاد،
        <strong> مش توصية ولا تحليل</strong>.
      </p>
    </div>
  );
}

function MoversCard({
  title,
  type,
  rows,
  onSelect,
}: {
  title: string;
  type: 'gainers' | 'losers';
  rows: BoardRow[];
  onSelect: (symbol: string) => void;
}) {
  const isGainer = type === 'gainers';

  return (
    <div className="rounded-lg border border-border-default bg-surface p-4">
      <h3 className={`text-sm font-bold ${isGainer ? 'text-win' : 'text-loss'}`}>
        {title}
      </h3>
      <ul className="mt-3 divide-y divide-border-default">
        {rows.map((row) => {
          const pct = row.changePercent ?? 0;
          const positive = pct >= 0;

          return (
            <li
              key={row.symbol}
              onClick={() => onSelect(row.symbol)}
              className="flex cursor-pointer items-center justify-between py-2 text-xs transition-colors hover:bg-surface-high"
            >
              <div className="flex items-center gap-2">
                <QuoteBadge symbol={row.symbol} enabled={true} />
              </div>
              <div className="flex items-center gap-2 text-end">
                <div>
                  <span className="num font-bold">{money(row.price)}</span>
                  <p
                    className={`num font-semibold ${
                      positive ? 'text-win' : 'text-loss'
                    }`}
                  >
                    {positive ? '+' : ''}
                    {pct.toFixed(2)}%
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
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
    <div className="rounded-lg border border-border-default bg-surface-low p-4 sm:p-5">
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

function History({
  sessions,
  investorClass,
}: {
  sessions: StoredFlows[];
  investorClass: InvestorClass;
}) {
  return (
    <section className="rounded-lg border border-border-default bg-surface p-4 sm:p-5">
      <h3 className="font-bold">الجلسات السابقة</h3>
      <p className="mt-1 text-xs text-fg-muted">
        صافي التعامل — {CLASS_LABELS[investorClass]}
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-start text-xs">
          <thead>
            <tr className="border-b border-border-default text-fg-muted">
              <th className="py-2 text-start">التاريخ</th>
              <th className="py-2 text-start">مصريين</th>
              <th className="py-2 text-start">عرب</th>
              <th className="py-2 text-start">أجانب</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {sessions.map((s) => {
              const t = s[investorClass];
              return (
                <tr key={s.date}>
                  <td className="num py-2">{s.date}</td>
                  <td
                    className={`num py-2 font-semibold ${
                      t.egyptian.net > 0
                        ? 'text-win'
                        : t.egyptian.net < 0
                        ? 'text-loss'
                        : ''
                    }`}
                  >
                    {signedMoney(t.egyptian.net)}
                  </td>
                  <td
                    className={`num py-2 font-semibold ${
                      t.arab.net > 0
                        ? 'text-win'
                        : t.arab.net < 0
                        ? 'text-loss'
                        : ''
                    }`}
                  >
                    {signedMoney(t.arab.net)}
                  </td>
                  <td
                    className={`num py-2 font-semibold ${
                      t.foreign.net > 0
                        ? 'text-win'
                        : t.foreign.net < 0
                        ? 'text-loss'
                        : ''
                    }`}
                  >
                    {signedMoney(t.foreign.net)}
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
