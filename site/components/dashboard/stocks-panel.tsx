'use client';

import { useMemo, useState } from 'react';
import { useBoard } from '@/lib/use-board';
import { DELAY_LABEL } from '@/lib/tradingview';
import { TradingViewChartDialog } from '@/components/dashboard/tradingview-chart-dialog';
import { StockCard } from '@/components/dashboard/stock-card';
import {
  ArrowDownIcon,
  SortAlphaIcon,
  TrendingUpIcon,
  XIcon,
} from '@/components/icons';

type FilterType = 'all' | 'gainers' | 'losers' | 'alphabetical';

type IconComponent = (props: { className?: string }) => React.ReactElement;

const FILTER_PRESETS: {
  id: FilterType;
  label: string;
  Icon: IconComponent | null;
}[] = [
  { id: 'all', label: 'الجميع', Icon: null },
  { id: 'gainers', label: 'الأكثر صعودًا', Icon: TrendingUpIcon },
  { id: 'losers', label: 'الأكثر هبوطًا', Icon: ArrowDownIcon },
  { id: 'alphabetical', label: 'أبجدي', Icon: SortAlphaIcon },
];

/**
 * How many cards land in the DOM before the reader asks for more.
 *
 * The board is ~293 listings and every card is a dozen nodes with two buttons.
 * Rendering the lot cost several thousand nodes on a phone for a screen whose
 * first job is a search box.
 */
const PAGE_SIZE = 60;

export function StocksPanel({ onPick }: { onPick: (ticker: string) => void }) {
  const { rows: board, loading, error } = useBoard();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [chartSymbol, setChartSymbol] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE_SIZE);

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

  // A narrowed list starts from the top again — otherwise a search that returns
  // 12 rows would still be sitting on a 240-row page count from before it.
  const visibleRows = filteredRows.slice(0, shown);
  const remaining = filteredRows.length - visibleRows.length;

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
          اختر أي سهم لبدء صفقة جديدة أو لمعاينة الشارت التفاعلي.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShown(PAGE_SIZE);
          }}
          placeholder="ابحث بالرمز أو بالاسم (مثال: COMI)..."
          className="w-full rounded-xl border border-border-default bg-surface-low px-4 py-3 text-sm font-semibold outline-none focus:border-brand-ink transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setShown(PAGE_SIZE);
            }}
            aria-label="امسح البحث"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg"
          >
            <XIcon className="size-4" />
          </button>
        )}
      </div>

      {/* Filter Presets Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {FILTER_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setFilter(p.id);
              setShown(PAGE_SIZE);
            }}
            aria-pressed={filter === p.id}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
              filter === p.id
                ? 'border-transparent bg-brand text-on-brand shadow-xs'
                : 'border-border-default bg-surface-high text-fg-muted hover:bg-surface-subtle'
            }`}
          >
            {p.Icon && <p.Icon className="size-3.5" />}
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
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleRows.map((stock) => (
              <StockCard
                key={stock.symbol}
                stock={stock}
                onPick={onPick}
                onChart={setChartSymbol}
              />
            ))}
          </div>

          {remaining > 0 && (
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE_SIZE)}
              className="w-full rounded-xl border border-border-default bg-surface-high py-2.5 text-center text-xs font-bold text-fg transition-colors hover:bg-surface-subtle"
            >
              عرض المزيد (<span className="num">{remaining}</span> سهم)
            </button>
          )}
        </>
      )}

      <p className="text-[11px] leading-relaxed text-fg-subtle pt-2">
        الأسعار {DELAY_LABEL} — رادار يمنحك التغطية الشاملة ولا يقدم أي توصيات استثمارية ماليّة.
      </p>
    </section>
  );
}
