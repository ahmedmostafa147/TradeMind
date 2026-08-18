'use client';

import { money, percent } from '@/lib/format';
import { normalizeTicker } from '@/lib/egx-directory';
import { useQuotes } from '@/lib/use-quotes';
import type { Quote } from '@/lib/quote';

/**
 * Last close for one ticker, under the field that named it.
 *
 * ── PASS `quote` WHEN THE CALLER ALREADY HAS ONE ───────────────────────────
 *
 * Left to itself the badge fetches its own quote, which is right under a single
 * ticker field and wrong in a list: a watchlist of fifteen rows opened fifteen
 * connections to `/api/quote` for one screen. A caller rendering many rows
 * should call `useQuotes` once for every ticker it holds and hand each badge its
 * row's answer. `undefined` means «fetch it yourself»; `null` means «I looked
 * and there wasn't one», and the badge renders the same «—» it would have.
 */
export function QuoteBadge({
  symbol,
  enabled,
  quote: provided,
  loading: providedLoading,
}: {
  symbol: string;
  enabled: boolean;
  quote?: Quote | null;
  loading?: boolean;
}) {
  const trimmed = symbol.trim();
  const normalized = normalizeTicker(trimmed);
  const selfFetches = provided === undefined;
  const own = useQuotes(selfFetches && enabled && trimmed !== '' ? [trimmed] : []);

  if (!enabled || trimmed === '') return null;

  const quotes = own.quotes;
  const loading = selfFetches ? own.loading : providedLoading === true;

  const quote = selfFetches
    ? (quotes.get(trimmed.toUpperCase()) ??
      quotes.get(normalized.toUpperCase()) ??
      Array.from(quotes.values()).find(
        (q) => q.symbol.toUpperCase() === trimmed.toUpperCase()
      ))
    : (provided ?? undefined);

  const price = quote?.price ?? 0;
  const changePercent = quote?.changePercent ?? null;
  const up = (changePercent ?? 0) >= 0;

  return (
    <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-border-default bg-surface-low px-3 py-2 text-xs">
      <div className="min-w-0">
        <p className="truncate font-bold text-fg">
          <span className="num">{trimmed.toUpperCase()}</span>
          {quote?.name ? (
            <span className="text-fg-muted font-normal"> — {quote.name}</span>
          ) : (
            <span className="text-fg-subtle font-normal"> (بورصة مصر)</span>
          )}
        </p>
        <p className="mt-0.5 text-fg-muted">
          السعر الحالي بالبورصة:{' '}
          <span className="num font-bold text-fg">
            {price > 0 ? money(price) : loading ? 'جاري التحميل...' : '—'}
          </span>
        </p>
      </div>

      {changePercent !== null && changePercent !== undefined ? (
        <span
          className={`num shrink-0 rounded-md px-2 py-1 font-bold ${
            up ? 'bg-win-surface text-win' : 'bg-loss-surface text-loss'
          }`}
        >
          {up ? '+' : ''}
          {percent(changePercent)}
        </span>
      ) : (
        // «مباشر» used to sit here. Nothing on this path is live: the route
        // answers from TradingView's 15-minute-delayed board, or from Yahoo's
        // last daily close.
        <span className="shrink-0 rounded-md bg-surface-high px-2 py-1 font-semibold text-fg-subtle">
          آخر سعر
        </span>
      )}
    </div>
  );
}
