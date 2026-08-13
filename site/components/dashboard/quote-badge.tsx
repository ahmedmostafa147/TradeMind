'use client';

import { money, percent } from '@/lib/format';
import { normalizeTicker } from '@/lib/egx-directory';
import { useQuotes } from '@/lib/use-quotes';

/**
 * Live stock market quote badge displaying symbol, company name, and live price.
 */
export function QuoteBadge({
  symbol,
  enabled,
}: {
  symbol: string;
  enabled: boolean;
}) {
  const trimmed = symbol.trim();
  const normalized = normalizeTicker(trimmed);
  const { quotes, loading } = useQuotes(enabled && trimmed !== '' ? [trimmed] : []);

  if (!enabled || trimmed === '') return null;

  const quote =
    quotes.get(trimmed.toUpperCase()) ??
    quotes.get(normalized.toUpperCase()) ??
    Array.from(quotes.values()).find(
      (q) => q.symbol.toUpperCase() === trimmed.toUpperCase()
    );

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
        <span className="num shrink-0 rounded-md bg-surface-high px-2 py-1 font-semibold text-fg-subtle">
          مباشر
        </span>
      )}
    </div>
  );
}
