'use client';

import { useEffect, useState } from 'react';

import { decodeQuote, type Quote } from '@/lib/quote';

/**
 * Last closes for a set of tickers, keyed by symbol.
 *
 * One request for the whole screen rather than one per card: a dashboard with
 * six open positions would otherwise open six connections to the same route on
 * every render pass.
 *
 * EVERY FAILURE IS SILENT AND LEAVES THE MAP EMPTY. A missing price renders as
 * «مفيش سعر» and never as a zero — the app's own rule, and the reason is that a
 * 0 would be arithmetic-ed into a 100% loss on a position that is fine.
 */
export function useQuotes(symbols: string[]): {
  quotes: Map<string, Quote>;
  loading: boolean;
} {
  // Sorted and joined so the effect depends on the CONTENT of the list, not on
  // the array identity — which changes on every render of the parent.
  const key = [...new Set(symbols.filter((s) => s.trim() !== ''))]
    .sort()
    .join(',');

  const [quotes, setQuotes] = useState<Map<string, Quote>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (key === '') {
      setQuotes(new Map());
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/quote?symbols=${encodeURIComponent(key)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body: unknown) => {
        if (cancelled || body === null) return;
        const list = (body as { quotes?: unknown }).quotes;
        if (!Array.isArray(list)) return;
        const next = new Map<string, Quote>();
        for (const raw of list) {
          const quote = decodeQuote(raw);
          if (quote !== null) next.set(quote.symbol, quote);
        }
        setQuotes(next);
      })
      .catch(() => {
        // Offline, or the route gave up on Yahoo. Both mean "no price", which
        // the caller already renders.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [key]);

  return { quotes, loading };
}
