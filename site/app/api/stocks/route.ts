import { NextResponse } from 'next/server';

import { parseBoard, SCANNER_BODY, SCANNER_URL } from '@/lib/tradingview';

/**
 * The whole EGX board — every listed stock, with its price during the session.
 *
 * ── WHY THIS IS A SECOND ROUTE AND NOT A CHANGE TO /api/quote ──────────────
 *
 * They answer different questions. `/api/quote` is asked "what is COMI worth"
 * for the handful of tickers a user has open positions in, and its Yahoo source
 * is a per-symbol lookup. This is asked "what is on the board", and no
 * per-symbol source can answer it without 293 requests.
 *
 * Splitting them also contains the risk. `scanner.tradingview.com` is
 * undocumented and may stop answering at any time; when it does, this route
 * fails and the stocks screen says so, while every open position on the
 * dashboard keeps its price from the older, duller path.
 *
 * ── SERVER-SIDE BECAUSE OF CORS, THE SAME REASON AS THE OTHER TWO ──────────
 *
 * The scanner sends no CORS headers, so the browser cannot call it directly. The
 * app can and does — a phone has no same-origin policy — but it goes through
 * here anyway so that both surfaces quote the same board from the same response.
 *
 * NOT AUTHENTICATED, on purpose: closing prices the exchange publishes to
 * everyone, and the route takes NO INPUT AT ALL. There is no parameter to
 * smuggle a URL through, which is the hole /api/quote had to close with a
 * directory check.
 */

export const dynamic = 'force-dynamic';

/** One upstream request, but a slow origin behind it. */
export const maxDuration = 20;

export async function GET() {
  try {
    const response = await fetch(SCANNER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // The scanner answers a plain client, but sends a challenge to some
        // datacentre ranges without these. Honest values, not a disguise.
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Origin: 'https://www.tradingview.com',
      },
      body: JSON.stringify(SCANNER_BODY),
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    });

    if (!response.ok) {
      // 502, not 500: the failure is upstream, and a caller retrying its way out
      // of our bug is a different thing from a caller waiting for TradingView.
      return NextResponse.json(
        { ok: false, reason: `المصدر رفض الطلب (${response.status})`, stocks: [] },
        { status: 502 }
      );
    }

    const stocks = parseBoard(await response.json());

    if (stocks.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          reason: 'الرد وصل بس مفيهوش أسهم — الشكل اتغيّر على الأغلب.',
          stocks: [],
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { ok: true, stocks, delaySeconds: stocks[0].delaySeconds },
      {
        // The feed is fifteen minutes behind anyway, so a minute of CDN caching
        // costs no freshness and collapses every visitor into one upstream call.
        headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' },
      }
    );
  } catch {
    return NextResponse.json(
      { ok: false, reason: 'تعذّر الوصول لمصدر الأسعار.', stocks: [] },
      { status: 502 }
    );
  }
}
