'use client';

import { useEffect, useState } from 'react';

import { decodeQuote, type Quote } from '@/lib/quote';
import { pollDelay, type SessionFlag } from '@/lib/market-polling';

/**
 * Last prices for a set of tickers, keyed by symbol — kept current.
 *
 * One request for the whole screen rather than one per card: a dashboard with
 * six open positions would otherwise open six connections to the same route on
 * every render pass.
 *
 * ── IT POLLS, BECAUSE A PRICE FETCHED ONCE IS A PRICE FROM WHEN THE TAB OPENED ──
 *
 * The first version fetched on mount and never again, so a dashboard opened at
 * ten in the morning showed ten-o'clock prices all session — the owner read it
 * as "the prices are not live" and was right. The cadence comes from the
 * route's `open` flag (see market-polling.ts): quick while the exchange is in
 * session, slow otherwise, and never while the tab is hidden.
 *
 * EVERY FAILURE IS SILENT AND KEEPS THE LAST MAP. A missing price renders as
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
    let timer: ReturnType<typeof setTimeout> | null = null;
    let open: SessionFlag = null;
    setLoading(true);

    async function load() {
      if (document.visibilityState === 'hidden') return;
      try {
        // WITH THE TRAILING SLASH. `trailingSlash: true` is on, so the bare
        // path answered 308 and the browser followed it — one extra round trip
        // on every screen with an open position, measured on production.
        const r = await fetch(`/api/quote/?symbols=${encodeURIComponent(key)}`);
        if (!r.ok || cancelled) return;
        const body = (await r.json()) as { quotes?: unknown; open?: unknown };
        if (cancelled) return;
        open = typeof body.open === 'boolean' ? body.open : null;
        if (!Array.isArray(body.quotes)) return;
        const next = new Map<string, Quote>();
        for (const raw of body.quotes) {
          const quote = decodeQuote(raw);
          if (quote !== null) next.set(quote.symbol, quote);
        }
        setQuotes(next);
      } catch {
        // Offline, or both sources were down. Either means "no price", which
        // the caller already renders — and the last good map stays.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    function schedule() {
      if (cancelled) return;
      timer = setTimeout(async () => {
        await load();
        schedule();
      }, pollDelay(open));
    }

    function onVisible() {
      if (document.visibilityState !== 'visible') return;
      // A tab coming back refreshes now rather than waiting out its tick.
      if (timer !== null) clearTimeout(timer);
      load().then(schedule);
    }

    load().then(schedule);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [key]);

  return { quotes, loading };
}
