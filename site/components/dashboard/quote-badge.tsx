'use client';

import { money, percent } from '@/lib/format';
import { useQuotes } from '@/lib/use-quotes';

/**
 * Last close for the ticker being typed, under the ticker field.
 *
 * MIRROR OF lib/features/market/widgets/stock_quote_badge.dart. The app has
 * shown this since the form was written and the browser never did — the last
 * remaining difference between the two «التفاصيل الكاملة» screens.
 *
 * IT RENDERS NOTHING RATHER THAN A ZERO. A price that did not arrive must not
 * look like a stock that did not move: the app's rule, and the reason is that a
 * 0 is arithmetic-ed into a 100% loss on a position that is fine.
 *
 * Gated, because the last close is one of the four paid surfaces. A free
 * account simply does not see the row — no lock, no teaser: the field it sits
 * under is free and works without it.
 */
export function QuoteBadge({
  symbol,
  enabled,
}: {
  symbol: string;
  enabled: boolean;
}) {
  const trimmed = symbol.trim();
  const { quotes } = useQuotes(enabled && trimmed !== '' ? [trimmed] : []);

  if (!enabled || trimmed === '') return null;

  const quote = quotes.get(trimmed.toUpperCase());
  if (!quote) return null;

  const up = (quote.changePercent ?? 0) >= 0;

  return (
    <div className="mt-2 flex items-center justify-between gap-3 rounded-md border border-border-default bg-surface-low px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-xs font-bold">
          <span className="num">{quote.symbol}</span>
          {quote.name && <span className="text-fg-muted"> — {quote.name}</span>}
        </p>
        <p className="mt-0.5 text-xs text-fg-muted">
          آخر إغلاق: <span className="num font-semibold">{money(quote.price)}</span>
        </p>
      </div>

      {quote.changePercent !== null && (
        <span
          className={`num shrink-0 rounded-md px-2 py-1 text-xs font-bold ${
            up ? 'bg-win-surface text-win' : 'bg-loss-surface text-loss'
          }`}
        >
          {up ? '+' : ''}
          {percent(quote.changePercent)}
        </span>
      )}
    </div>
  );
}
