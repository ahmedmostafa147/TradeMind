'use client';

import { money } from '@/lib/format';
import type { BoardRow } from '@/lib/tradingview';
import { CandlesIcon, PlusIcon } from '@/components/icons';
import { StockLogo } from '@/components/dashboard/stock-logo';

export function StockCard({
  stock,
  onPick,
  onChart,
}: {
  stock: BoardRow;
  onPick: (ticker: string) => void;
  onChart: (ticker: string) => void;
}) {
  const { symbol, name, price, changePercent, logoId } = stock;
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
      {/* THE NAME GETS ITS OWN LINE, under everything else.
          It used to sit beside the ticker inside the left group, which was fine
          until the logo took 36px and a gap out of that group's width — and
          TradingView's descriptions are long («O B Financial Holding»,
          «Arabia for Investment and Development»), so the column truncated them
          to «…lding» and «…ment». A name cut to its last four letters is not a
          shorter name, it is no name. Full width still truncates the longest of
          them, but at the end of a readable phrase rather than at the start. */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <StockLogo logoId={logoId} name={name} />
          <span className="num inline-block rounded-md bg-surface-high px-2 py-0.5 text-xs font-extrabold text-fg">
            {symbol}
          </span>
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

      {/* `dir="auto"` because these names arrive in TWO directions: the curated
          Arabic ones and TradingView's English descriptions. An LTR name inside
          the page's RTL block truncates at its VISUAL start — «…estment and
          Development» — which hides the words that identify the company and
          keeps the ones that do not. Per-string direction puts the ellipsis at
          the end of the phrase in both languages. */}
      <p dir="auto" className="-mt-1 truncate text-xs font-semibold text-fg-muted">
        {name}
      </p>

      <div className="flex items-center gap-2 pt-1 border-t border-border-default/60">
        <button
          type="button"
          onClick={() => onPick(symbol)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand/10 py-2 text-center text-xs font-bold text-brand-ink hover:bg-brand/20 transition-colors"
        >
          <PlusIcon className="size-3.5" />
          صفقة جديدة
        </button>
        <button
          type="button"
          onClick={() => onChart(symbol)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border-default bg-surface-high py-2 text-center text-xs font-bold text-fg hover:bg-surface-subtle transition-colors"
        >
          <CandlesIcon className="size-3.5" />
          الشارت
        </button>
      </div>
    </div>
  );
}
