'use client';

import { useMemo, useState } from 'react';
import { useBoard } from '@/lib/use-board';
import { DELAY_LABEL } from '@/lib/tradingview';
import { TradingViewChartDialog } from '@/components/dashboard/tradingview-chart-dialog';
import { StockCard } from '@/components/dashboard/stock-card';

type FilterType = 'all' | 'gainers' | 'losers' | 'alphabetical';

const FILTER_PRESETS: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'الجميع' },
  { id: 'gainers', label: '🚀 الأكثر صعوداً' },
  { id: 'losers', label: '🔻 الأكثر هبوطاً' },
  { id: 'alphabetical', label: '🔤 أبجدي' },
];

export function StocksPanel({ onPick }: { onPick: (ticker: string) => void }) {
  const { rows: board, loading, error } = useBoard();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [chartSymbol, setChartSymbol] = useState<string | null>(null);

  const filteredRows = useMemo(() => {
    const q = query.trim().toUpperCase();
    let list = board.filter(
      (row) =>
        q === '' ||
        row.symbol.includes(q) ||
        row.name.toUpperCase().includes(q)
    );

    if (filter === 'gainers') {
      list = list
        .filter((r) => (r.changePercent ?? 0) > 0)
        .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0));
    } else if (filter === 'losers') {
      list = list
        .filter((r) => (r.changePercent ?? 0) < 0)
        .sort((a, b) => (a.changePercent ?? 0) - (b.changePercent ?? 0));
    } else if (filter === 'alphabetical') {
      list = [...list].sort((a, b) => a.symbol.localeCompare(b.symbol));
    }

    return list;
  }, [board, query, filter]);

  return (
    <section className="mt-4 space-y-4">
      {chartSymbol && (
        <TradingViewChartDialog
          symbol={chartSymbol}
          onClose={() => setChartSymbol(null)}
        />
      )}

      <div className="space-y-1">
        <h2 className="text-lg font-extrabold text-fg sm:text-xl">أسهم البورصة المصرية</h2>
        <p className="text-xs text-fg-muted">
          اختر أي سهم لبدء صفقة جديدة أو عاين الشارت التفاعلي المباشر.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث بالرمز أو بالاسم (مثال: COMI)..."
          className="w-full rounded-xl border border-border-default bg-surface-low px-4 py-3 text-sm font-semibold outline-none focus:border-brand-ink transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-fg-subtle hover:text-fg"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filter Presets Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {FILTER_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setFilter(p.id)}
            aria-pressed={filter === p.id}
            className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
              filter === p.id
                ? 'border-transparent bg-brand text-on-brand shadow-xs'
                : 'border-border-default bg-surface-high text-fg-muted hover:bg-surface-subtle'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* States */}
      {loading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-high" />
          ))}
        </div>
      )}

      {error !== null && (
        <p role="alert" className="rounded-xl border border-loss-border bg-loss-surface p-4 text-xs font-bold text-loss">
          {error}
        </p>
      )}

      {!loading && error === null && filteredRows.length === 0 ? (
        <div className="rounded-2xl border border-border-default bg-surface p-8 text-center text-xs text-fg-muted">
          مفيش نتائج مطابقة للبحث الحجم ده.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRows.map((stock) => (
            <StockCard
              key={stock.symbol}
              stock={stock}
              onPick={onPick}
              onChart={setChartSymbol}
            />
          ))}
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-fg-subtle pt-2">
        الأسعار {DELAY_LABEL} — رادار يمنحك التغطية الشاملة ولا يقدم أي توصيات استثمارية ماليّة.
      </p>
    </section>
  );
}
