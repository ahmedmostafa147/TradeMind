'use client';

import { useMemo, useState } from 'react';

import { money } from '@/lib/format';
import { useBoard } from '@/lib/use-board';
import { DELAY_LABEL } from '@/lib/tradingview';
import { TradingViewChartDialog } from '@/components/dashboard/tradingview-chart-dialog';

type SortKey = 'name' | 'change';

export function StocksPanel({
  onPick,
}: {
  onPick: (ticker: string) => void;
}) {
  const { rows: board, loading, error } = useBoard();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('change');
  const [chartSymbol, setChartSymbol] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim();
    const upper = q.toUpperCase();

    const list = board.filter(
      (row) =>
        q === '' || row.symbol.includes(upper) || row.name.includes(q)
    );

    if (sort === 'name') {
      return [...list].sort((a, b) => a.symbol.localeCompare(b.symbol));
    }
    return [...list].sort((a, b) => {
      const av = a.changePercent;
      const bv = b.changePercent;
      if (av == null && bv == null) return a.symbol.localeCompare(b.symbol);
      if (av == null) return 1;
      if (bv == null) return -1;
      return bv - av;
    });
  }, [board, query, sort]);

  return (
    <section className="mt-4 space-y-4">
      {chartSymbol && (
        <TradingViewChartDialog
          symbol={chartSymbol}
          onClose={() => setChartSymbol(null)}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold">الأسهم</h2>
          <p className="mt-1 text-xs text-fg-muted">
            كل الأسهم المقيدة في البورصة المصرية. اضغط على أي سهم لبدء صفقة أو عاين الشارت.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSort(sort === 'name' ? 'change' : 'name')}
            className="rounded-md border border-border-default px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-surface-high"
          >
            {sort === 'name' ? 'رتّب بالتغيّر' : 'رتّب بالاسم'}
          </button>
        </div>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="دوّر بالرمز أو بالاسم…"
        aria-label="ابحث عن سهم"
        className="w-full rounded-md border border-border-default bg-surface-low px-3 py-2.5 text-sm outline-none focus:border-brand-ink"
      />

      {loading && (
        <p role="status" className="text-xs text-fg-subtle">
          جاري تحميل الأسعار…
        </p>
      )}

      {error !== null && (
        <p
          role="alert"
          className="rounded-md border border-loss-border bg-loss-surface p-4 text-sm font-semibold text-loss"
        >
          {error}
        </p>
      )}

      {!loading && error === null && rows.length === 0 ? (
        <p className="rounded-lg border border-border-default bg-surface p-6 text-center text-sm text-fg-muted">
          مفيش سهم بالاسم ده.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ symbol, name, price, changePercent }) => {
            const pct = changePercent;
            const tone =
              pct == null || pct === 0
                ? 'text-fg-muted'
                : pct > 0
                  ? 'text-win'
                  : 'text-loss';

            return (
              <li
                key={symbol}
                className="flex items-center justify-between gap-2 rounded-lg border border-border-default bg-surface p-3 transition-colors hover:border-border-strong hover:bg-surface-high"
              >
                <button
                  type="button"
                  onClick={() => onPick(symbol)}
                  className="flex flex-1 items-center justify-between text-start"
                >
                  <span className="min-w-0">
                    <span className="num block text-sm font-bold" dir="ltr">
                      {symbol}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-fg-muted">
                      {name}
                    </span>
                  </span>

                  <span className="shrink-0 text-end">
                    <span className="num block text-sm font-bold">
                      {money(price)}
                    </span>
                    <span className={`num mt-0.5 block text-xs font-semibold ${tone}`}>
                      {pct == null ? '' : `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  title="عرض شارت TradingView"
                  onClick={() => setChartSymbol(symbol)}
                  className="rounded p-1.5 text-fg-subtle hover:bg-surface-highest hover:text-fg"
                >
                  📈
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs leading-relaxed text-fg-subtle">
        الأسعار {DELAY_LABEL} ومن مصدر غير رسمي — مش أسعار لحظية. رادار بيعرضها
        كما هي ومش بيقدّم أي توصية بيع أو شراء.
      </p>
    </section>
  );
}
