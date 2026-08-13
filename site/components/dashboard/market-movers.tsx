'use client';

import { useState } from 'react';
import { money } from '@/lib/format';
import type { BoardRow } from '@/lib/tradingview';
import { QuoteBadge } from '@/components/dashboard/quote-badge';

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
      {/* Mobile Tab Switcher */}
      <div className="flex rounded-xl border border-border-default bg-surface-high p-1 sm:hidden">
        <button
          type="button"
          onClick={() => setMobileTab('gainers')}
          className={`flex-1 rounded-lg py-2 text-center text-xs font-bold transition-all ${
            mobileTab === 'gainers'
              ? 'bg-surface text-win shadow-xs'
              : 'text-fg-subtle'
          }`}
        >
          🚀 الأعلى صعوداً
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('losers')}
          className={`flex-1 rounded-lg py-2 text-center text-xs font-bold transition-all ${
            mobileTab === 'losers'
              ? 'bg-surface text-loss shadow-xs'
              : 'text-fg-subtle'
          }`}
        >
          🔻 الأكثر هبوطاً
        </button>
      </div>

      {/* Desktop side-by-side or Mobile tabbed view */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={mobileTab === 'gainers' ? 'block' : 'hidden sm:block'}>
          <MoversCard
            title="أعلى 5 أسهم (الأكثر ارتفاعاً)"
            type="gainers"
            rows={gainers}
            onSelect={onSelect}
          />
        </div>
        <div className={mobileTab === 'losers' ? 'block' : 'hidden sm:block'}>
          <MoversCard
            title="أقل 5 أسهم (الأكثر انخفاضاً)"
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
      <h3 className={`text-xs font-extrabold sm:text-sm ${isGainer ? 'text-win' : 'text-loss'}`}>
        {title}
      </h3>
      <ul className="mt-3 space-y-2">
        {rows.map((row) => {
          const pct = row.changePercent ?? 0;
          const positive = pct >= 0;

          return (
            <li
              key={row.symbol}
              onClick={() => onSelect(row.symbol)}
              className="flex items-center justify-between rounded-xl border border-border-default/60 bg-surface-low p-2.5 transition-all hover:bg-surface-high cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <QuoteBadge symbol={row.symbol} enabled={true} />
              </div>
              <div className="text-end">
                <span className="num block text-xs font-extrabold text-fg sm:text-sm">
                  {money(row.price)}
                </span>
                <span
                  className={`num mt-0.5 inline-block rounded px-1.5 py-0.5 text-[11px] font-bold ${
                    positive
                      ? 'bg-win-surface text-win'
                      : 'bg-loss-surface text-loss'
                  }`}
                >
                  {positive ? '+' : ''}
                  {pct.toFixed(2)}%
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
