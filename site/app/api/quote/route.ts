import { NextResponse } from 'next/server';

import { EGX_DIRECTORY, normalizeTicker } from '@/lib/egx-directory';
import { parseYahooChart, yahooChartUrl } from '@/lib/quote';
import {
  parseBoard,
  SCANNER_BODY,
  SCANNER_URL,
  type BoardRow,
} from '@/lib/tradingview';

/**
 * Last close for one or more EGX symbols.
 *
 * Server-side for the same reason /api/egx-flows is: Yahoo's chart endpoint
 * sends no CORS headers, so a `fetch` from the dashboard is blocked before it
 * leaves the browser. The app calls the identical URL directly because a phone
 * has no same-origin policy to satisfy.
 *
 * Not authenticated, on purpose — it returns closing prices the exchange
 * publishes to anyone, and takes no input beyond a ticker.
 *
 * THE SYMBOL IS CHECKED AGAINST THE BUNDLED DIRECTORY BEFORE IT IS USED. This
 * route interpolates its input into an outbound URL, so an unbounded parameter
 * would make it a proxy for fetching whatever a caller likes on our egress.
 * The directory is thirty fixed codes; anything else is rejected here rather
 * than sanitised, because there is no legitimate call this excludes.
 *
 * UNVERIFIED AGAINST THE LIVE ENDPOINT. Outbound network is blocked from the
 * environment this was written in, so the parsing is covered by its own shape
 * and the request itself has never run. Yahoo is unofficial and undocumented
 * and can change or start refusing datacentre IPs without notice — which is
 * why every failure below is quiet and the UI degrades to «مفيش سعر» rather
 * than to an error.
 */

// Today's number, so never captured at build.
export const dynamic = 'force-dynamic';

/** One upstream request per symbol, run in parallel, with room for a slow one. */
export const maxDuration = 20;

/**
 * TradingView's board, keyed by symbol. Null when the source is unreachable.
 *
 * TRIED FIRST, BECAUSE IT IS BETTER ON BOTH AXES: it prices during the session
 * (fifteen minutes behind) where Yahoo gives yesterday's close, and it covers
 * every listing where Yahoo covers the thirty in the directory. One request
 * answers any number of symbols, so this is cheaper than the fan-out below even
 * when only one ticker was asked for.
 *
 * Yahoo stays as the fallback rather than being deleted: `scanner.tradingview.com`
 * is undocumented and may stop answering without notice, and an open position
 * showing no price at all is worse than one showing yesterday's.
 */
async function fromTradingView(): Promise<Map<string, BoardRow> | null> {
  try {
    const response = await fetch(SCANNER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Origin: 'https://www.tradingview.com',
      },
      body: JSON.stringify(SCANNER_BODY),
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    });
    if (!response.ok) return null;

    const rows = parseBoard(await response.json());
    if (rows.length === 0) return null;
    return new Map(rows.map((row) => [row.symbol, row]));
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  const requested = (url.searchParams.get('symbols') ?? '')
    .split(',')
    .map((s) => normalizeTicker(s))
    .filter((s) => s !== '');

  // THE DIRECTORY NO LONGER LIMITS WHAT MAY BE ASKED FOR, only what may be
  // FETCHED FROM YAHOO. The board covers every listing, so restricting callers to
  // thirty codes would make the stocks screen unable to price the other 263 — and
  // the security reason for the check applies only to the Yahoo path, which
  // interpolates the symbol into an outbound URL. TradingView is a fixed POST
  // with no caller input in it at all.
  const symbols = [...new Set(requested)];

  if (symbols.length === 0) {
    return NextResponse.json(
      { ok: false, reason: 'مفيش رموز في الطلب', quotes: [] },
      { status: 400 }
    );
  }

  const board = await fromTradingView();
  if (board !== null) {
    const quotes = symbols
      .map((symbol) => board.get(symbol))
      .filter((row) => row !== undefined)
      .map((row) => ({
        symbol: row.symbol,
        name: row.name,
        price: row.price,
        // The board reports a percent (2.15 = +2.15%); every consumer of this
        // route expects a FRACTION, the shape Yahoo's path produces. Converting
        // here rather than at four call sites.
        changePercent: row.changePercent === null ? 0 : row.changePercent / 100,
        change:
          row.changePercent === null
            ? 0
            : row.price - row.price / (1 + row.changePercent / 100),
        asOf: new Date().toISOString(),
        delaySeconds: row.delaySeconds,
      }));

    if (quotes.length > 0) {
      return NextResponse.json(
        { ok: true, source: 'tradingview', quotes },
        {
          headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' },
        }
      );
    }
  }

  // ── FALLBACK: Yahoo, one request per symbol, directory-checked. ────────────
  const yahooSymbols = symbols.filter((s) => s in EGX_DIRECTORY);
  if (yahooSymbols.length === 0) {
    return NextResponse.json(
      { ok: true, source: 'none', quotes: [] },
      { headers: { 'Cache-Control': 's-maxage=60' } }
    );
  }

  const settled = await Promise.all(
    yahooSymbols.map(async (symbol) => {
      try {
        const response = await fetch(yahooChartUrl(symbol), {
          headers: {
            // Yahoo serves an interstitial to clients without a browser UA.
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
              '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(10_000),
          cache: 'no-store',
        });
        if (!response.ok) return null;
        const quote = parseYahooChart(await response.json(), symbol);
        if (quote === null) return null;
        return { ...quote, asOf: quote.asOf.toISOString() };
      } catch {
        // One dead symbol must not fail the batch — ESRS genuinely returns no
        // candles at all, and that is a normal answer, not an outage.
        return null;
      }
    })
  );

  const quotes = settled.filter((q) => q !== null);

  return NextResponse.json(
    { ok: true, source: 'yahoo', quotes },
    {
      // Closing prices move once a day; a minute of CDN caching collapses a
      // dashboard full of open positions into one upstream call.
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' },
    }
  );
}
