import { NextResponse } from 'next/server';

import { nameForTicker, normalizeTicker } from '@/lib/egx-directory';
import { fetchEgxBotQuotes } from '@/lib/egxbot-fetch';
import type { QuoteSource, QuoteWire } from '@/lib/quote';
import { fetchTradingViewBoard } from '@/lib/tradingview-fetch';

/**
 * The last price for one or more EGX symbols.
 *
 * Server-side for the same reason the other market routes are: neither source
 * sends CORS headers, so a `fetch` from the dashboard is blocked before it
 * leaves the browser. The app calls this route too, so both surfaces quote the
 * same number for the same open position.
 *
 * Not authenticated, on purpose — it returns prices the exchange publishes to
 * everyone, and takes no input beyond a list of tickers.
 *
 * ── ONE SOURCE PER ANSWER: EGXBOT, OR TRADINGVIEW ONLY WHEN EGXBOT IS DOWN ──
 *
 * Owner's call (11 سبتمبر 2026): EGXBot is the first source for every price in
 * the product, TradingView the fallback, and Yahoo — the original source, thirty
 * hardcoded symbols at yesterday's close — is deleted rather than kept as a
 * third tier. Three sources for one number is two more ways for the phone and
 * the browser to disagree.
 *
 * The fallback is PER REQUEST, not per symbol (13 سبتمبر, owner's call again).
 * The first version filled the handful of tickers EGXBot does not carry from
 * TradingView, which put two feeds' numbers side by side on one screen. Now a
 * response is entirely one source: a ticker EGXBot lacks is simply absent and
 * renders as «مفيش سعر», and TradingView answers only when EGXBot answered
 * nothing at all.
 *
 * ── NO INPUT REACHES AN UPSTREAM URL PATH ──────────────────────────────────
 *
 * The Yahoo path interpolated the symbol into a URL, which is why this route
 * used to reject anything outside the bundled directory. EGXBot takes the codes
 * as a query value that `encodeURIComponent` encloses, and TradingView takes no
 * input at all. The directory now only supplies the Arabic name.
 */

// Today's number, so never captured at build.
export const dynamic = 'force-dynamic';

/** Up to four EGXBot batches in parallel, plus one board fetch if needed. */
export const maxDuration = 20;

/** Fraction, the shape every consumer of this route expects. */
function fraction(percent: number | null): number | null {
  return percent === null ? null : percent / 100;
}

/** The day's move as money, back-derived from the percent. */
function moneyChange(price: number, percent: number | null): number | null {
  return percent === null ? null : price - price / (1 + percent / 100);
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  const symbols = [
    ...new Set(
      (url.searchParams.get('symbols') ?? '')
        .split(',')
        .map((s) => normalizeTicker(s))
        .filter((s) => s !== '')
    ),
  ];

  if (symbols.length === 0) {
    return NextResponse.json(
      { ok: false, reason: 'مفيش رموز في الطلب', quotes: [] },
      { status: 400 }
    );
  }

  const asOf = new Date().toISOString();
  const quotes: QuoteWire[] = [];
  let source: QuoteSource | 'none' = 'none';
  // Whether the exchange is in session, as the source sees it. The dashboard
  // polls quickly while this is true and slowly otherwise; null means the
  // source did not say, and the client treats that as "keep polling".
  let open: boolean | null = null;

  const egxbot = await fetchEgxBotQuotes(symbols);
  if (egxbot !== null) {
    source = 'egxbot';
    open = egxbot.open;
    for (const symbol of symbols) {
      const q = egxbot.quotes.get(symbol);
      if (q === undefined) continue;
      quotes.push({
        symbol,
        name: nameForTicker(symbol),
        price: q.price,
        changePercent: fraction(q.changePercent),
        change: moneyChange(q.price, q.changePercent),
        asOf,
        source,
      });
    }
  } else {
    const board = await fetchTradingViewBoard();
    if (board !== null) {
      source = 'tradingview';
      const bySymbol = new Map(board.map((row) => [row.symbol, row]));
      for (const symbol of symbols) {
        const row = bySymbol.get(symbol);
        if (row === undefined) continue;
        quotes.push({
          symbol,
          name: nameForTicker(symbol) ?? row.name,
          price: row.price,
          changePercent: fraction(row.changePercent),
          change: moneyChange(row.price, row.changePercent),
          asOf,
          source,
        });
      }
    }
  }

  return NextResponse.json(
    { ok: true, source, open, quotes },
    {
      // Half a minute of CDN caching collapses every open dashboard into one
      // upstream call per tick, and matches the client's in-session poll —
      // a longer window would have the poll re-reading the same answer.
      headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' },
    }
  );
}
