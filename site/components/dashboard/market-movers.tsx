'use client';

import { useState } from 'react';
import { money } from '@/lib/format';
import type { BoardRow } from '@/lib/tradingview';
import { ArrowDownIcon, TrendingUpIcon } from '@/components/icons';

/**
 * The five best and five worst movers on the board.
 *
 * EVERY FIGURE HERE COMES OFF THE ROW IT WAS HANDED. An earlier version put a
 * `QuoteBadge` in each list item, and a badge fetches its own quote — ten rows
 * meant ten `/api/quote` round trips for prices that had already arrived in the
 * `/api/stocks` response that produced these very rows. It also printed the
 * price twice, once inside the badge and once in the row's own end column.
 */
export function MarketMoversSection({
  gainers,
  losers,
  loading,
  onSelect,
}: {
  gainers: BoardRow[];
  losers: BoardRow[];
  loading: boolean;
  onSelect: (symbol: string) => void;
}) {
  const [mobileTab, setMobileTab] = useState<'gainers' | 'losers'>('gainers');

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-56 animate-pulse rounded-2xl bg-surface-high" />
        <div className="h-56 animate-pulse rounded-2xl bg-surface-high" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* One card at a time on a phone, both side by side from `sm` up. */}
      <div className="flex rounded-xl border border-border-default bg-surface-high p-1 sm:hidden">
        <button
          type="button"
          onClick={() => setMobileTab('gainers')}
          aria-pressed={mobileTab === 'gainers'}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-center text-xs font-bold transition-all ${
            mobileTab === 'gainers'
              ? 'bg-surface text-win shadow-xs'
              : 'text-fg-subtle'
          }`}
        >
          <TrendingUpIcon className="size-3.5" />
          الأعلى صعودًا
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('losers')}
          aria-pressed={mobileTab === 'losers'}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-center text-xs font-bold transition-all ${
            mobileTab === 'losers'
              ? 'bg-surface text-loss shadow-xs'
              : 'text-fg-subtle'
          }`}
        >
          <ArrowDownIcon className="size-3.5" />
          الأكثر هبوطًا
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className={mobileTab === 'gainers' ? 'block' : 'hidden sm:block'}>
          <MoversCard
            title="أعلى 5 أسهم (الأكثر ارتفاعًا)"
            type="gainers"
            rows={gainers}
            onSelect={onSelect}
          />
        </div>
        <div className={mobileTab === 'losers' ? 'block' : 'hidden sm:block'}>
          <MoversCard
            title="أقل 5 أسهم (الأكثر انخفاضًا)"
            type="losers"
            rows={losers}
            onSelect={onSelect}
          />
        </div>
      </div>
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
    <div className="rounded-2xl border border-border-default bg-surface p-4 shadow-xs">
      <h3
        className={`flex items-center gap-1.5 text-xs font-extrabold sm:text-sm ${
          isGainer ? 'text-win' : 'text-loss'
        }`}
      >
        {isGainer ? (
          <TrendingUpIcon className="size-4" />
        ) : (
          <ArrowDownIcon className="size-4" />
        )}
        {title}
      </h3>

      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-fg-subtle">مفيش بيانات للجلسة دي.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => {
            const pct = row.changePercent;
            const positive = (pct ?? 0) >= 0;

            return (
              <li key={row.symbol}>
                <button
                  type="button"
                  onClick={() => onSelect(row.symbol)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-border-default/60 bg-surface-low p-2.5 text-start transition-all hover:bg-surface-high"
                >
                  <span className="min-w-0 flex-1">
                    <span className="num block text-xs font-extrabold text-fg sm:text-sm">
                      {row.symbol}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] font-semibold text-fg-muted">
                      {row.name}
                    </span>
                  </span>

                  <span className="shrink-0 text-end">
                    <span className="num block text-xs font-extrabold text-fg sm:text-sm">
                      {money(row.price)}
                    </span>
                    <span
                      className={`num mt-0.5 inline-block rounded px-1.5 py-0.5 text-[11px] font-bold ${
                        pct == null
                          ? 'bg-surface-high text-fg-muted'
                          : positive
                            ? 'bg-win-surface text-win'
                            : 'bg-loss-surface text-loss'
                      }`}
                    >
                      {pct == null
                        ? '—'
                        : `${positive ? '+' : ''}${pct.toFixed(2)}%`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
