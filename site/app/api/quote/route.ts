import { NextResponse } from 'next/server';

import { EGX_DIRECTORY, normalizeTicker } from '@/lib/egx-directory';
import { parseYahooChart, yahooChartUrl } from '@/lib/quote';

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

export async function GET(request: Request) {
  const url = new URL(request.url);

  const requested = (url.searchParams.get('symbols') ?? '')
    .split(',')
    .map((s) => normalizeTicker(s))
    .filter((s) => s !== '');

  const symbols = [...new Set(requested)].filter((s) => s in EGX_DIRECTORY);

  if (symbols.length === 0) {
    return NextResponse.json(
      { ok: false, reason: 'مفيش رموز معروفة في الطلب', quotes: [] },
      { status: 400 }
    );
  }

  const settled = await Promise.all(
    symbols.map(async (symbol) => {
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
    { ok: true, quotes },
    {
      // Closing prices move once a day; a minute of CDN caching collapses a
      // dashboard full of open positions into one upstream call.
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' },
    }
  );
}
