'use client';

import { useEffect, useState } from 'react';

import type { BoardRow } from '@/lib/tradingview';

/** Who answered the board. Named so the caption can say so, never «مباشر». */
export type BoardSource = 'egxbot' | 'tradingview';

export function boardSourceLabel(
  source: BoardSource | null,
  delaySeconds: number | null
): string {
  if (source === 'egxbot') return 'المصدر: EGXBot — الأسعار مش لحظية';
  if (source === 'tradingview') {
    const minutes = delaySeconds === null ? null : Math.round(delaySeconds / 60);
    return minutes === null
      ? 'المصدر: TradingView — الأسعار مش لحظية'
      : `المصدر: TradingView — الأسعار متأخرة ${minutes} دقيقة`;
  }
  return 'الأسعار مش لحظية';
}

/**
 * The whole EGX board, from `/api/stocks`.
 *
 * ONE REQUEST FOR EVERY LISTING, which is the entire reason this exists rather
 * than reusing `useQuotes`: that one asks per symbol and is right for the four
 * tickers a user has positions in. Asking it for 293 would open 293 upstream
 * lookups to answer a screen that one request already answers.
 *
 * A FAILURE IS REPORTED, NOT SWALLOWED — unlike `useQuotes`, deliberately. There,
 * a missing price is one blank cell beside a trade that is otherwise fine. Here
 * it is the entire screen, and an empty list with no explanation reads as "the
 * Egyptian exchange has no stocks".
 */
export function useBoard(): {
  rows: BoardRow[];
  loading: boolean;
  error: string | null;
  delaySeconds: number | null;
  source: BoardSource | null;
} {
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [delaySeconds, setDelaySeconds] = useState<number | null>(null);
  const [source, setSource] = useState<BoardSource | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch('/api/stocks/');
        const body = (await response.json()) as {
          ok?: boolean;
          stocks?: BoardRow[];
          delaySeconds?: number | null;
          source?: string;
          reason?: string;
        };

        if (cancelled) return;

        if (!response.ok || body.ok !== true || !Array.isArray(body.stocks)) {
          setError(body.reason ?? 'تعذّر تحميل الأسعار.');
          return;
        }

        setRows(body.stocks);
        setDelaySeconds(body.delaySeconds ?? null);
        setSource(
          body.source === 'egxbot' || body.source === 'tradingview'
            ? body.source
            : null
        );
      } catch {
        if (!cancelled) setError('تعذّر الوصول للسيرفر. اتأكد من النت.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { rows, loading, error, delaySeconds, source };
}
