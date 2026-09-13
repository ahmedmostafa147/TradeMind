'use client';

import { useEffect, useState } from 'react';

import { pollDelay, type SessionFlag } from '@/lib/market-polling';
import type { BoardRow } from '@/lib/tradingview';

/**
 * The whole EGX board, from `/api/stocks` — kept current.
 *
 * ONE REQUEST FOR EVERY LISTING, which is the entire reason this exists rather
 * than reusing `useQuotes`: that one asks per symbol and is right for the four
 * tickers a user has positions in. Asking it for 300 would open four upstream
 * batches to answer a screen that one request already answers.
 *
 * IT POLLS on the same cadence as `useQuotes` (see market-polling.ts): the
 * first version fetched once on mount, so the board was as old as the tab.
 *
 * A FAILURE IS REPORTED, NOT SWALLOWED — unlike `useQuotes`, deliberately.
 * There, a missing price is one blank cell beside a trade that is otherwise
 * fine. Here it is the entire screen, and an empty list with no explanation
 * reads as "the Egyptian exchange has no stocks". A failure AFTER a good load
 * keeps the last board rather than blanking it.
 */
export function useBoard(): {
  rows: BoardRow[];
  loading: boolean;
  error: string | null;
} {
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let open: SessionFlag = null;
    let loadedOnce = false;

    async function load() {
      if (document.visibilityState === 'hidden') return;
      try {
        const response = await fetch('/api/stocks/');
        const body = (await response.json()) as {
          ok?: boolean;
          stocks?: BoardRow[];
          open?: unknown;
          reason?: string;
        };
        if (cancelled) return;

        if (!response.ok || body.ok !== true || !Array.isArray(body.stocks)) {
          if (!loadedOnce) setError(body.reason ?? 'تعذّر تحميل الأسعار.');
          return;
        }

        loadedOnce = true;
        open = typeof body.open === 'boolean' ? body.open : null;
        setRows(body.stocks);
        setError(null);
      } catch {
        if (!cancelled && !loadedOnce) {
          setError('تعذّر الوصول للسيرفر. اتأكد من النت.');
        }
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
  }, []);

  return { rows, loading, error };
}
