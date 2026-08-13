'use client';

import { money } from '@/lib/format';
import type { BoardRow } from '@/lib/tradingview';

export function StockCard({
  stock,
  onPick,
  onChart,
}: {
  stock: BoardRow;
  onPick: (ticker: string) => void;
  onChart: (ticker: string) => void;
}) {
  const { symbol, name, price, changePercent } = stock;
  const pct = changePercent;
  const positive = pct != null && pct > 0;
  const negative = pct != null && pct < 0;

  const badgeTone = positive
    ? 'border-win-border bg-win-surface text-win'
    : negative
      ? 'border-loss-border bg-loss-surface text-loss'
      : 'border-border-default bg-surface-high text-fg-muted';

  return (
    <div className="flex flex-col justify-between gap-3 rounded-2xl border border-border-default bg-surface p-4 shadow-xs transition-all hover:border-border-strong hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="num rounded-md bg-surface-high px-2 py-0.5 text-xs font-extrabold text-fg">
              {symbol}
            </span>
          </div>
          <p className="mt-1 truncate text-xs font-semibold text-fg-muted">{name}</p>
        </div>

        <div className="text-end">
          <span className="num block text-sm font-extrabold text-fg sm:text-base">
            {money(price)}
          </span>
          <span
            className={`num mt-0.5 inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold ${badgeTone}`}
          >
            {pct == null ? '—' : `${positive ? '+' : ''}${pct.toFixed(2)}%`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-border-default/60">
        <button
          type="button"
          onClick={() => onPick(symbol)}
          className="flex-1 rounded-xl bg-brand/10 py-2 text-center text-xs font-bold text-brand-ink hover:bg-brand/20 transition-colors"
        >
          ⚡ صفقة جديدة
        </button>
        <button
          type="button"
          onClick={() => onChart(symbol)}
          className="flex-1 rounded-xl border border-border-default bg-surface-high py-2 text-center text-xs font-bold text-fg hover:bg-surface-subtle transition-colors"
        >
          📊 الشارت
        </button>
      </div>
    </div>
  );
}
