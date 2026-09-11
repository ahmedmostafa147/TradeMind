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
 * ── EGXBOT FIRST, TRADINGVIEW FOR WHAT IT DID NOT ANSWER, NOTHING ELSE ──────
 *
 * Owner's call (11 سبتمبر 2026): EGXBot is the first source for every price in
 * the product, TradingView the fallback, and Yahoo — the original source, thirty
 * hardcoded symbols at yesterday's close — is deleted rather than kept as a
 * third tier. Three sources for one number is two more ways for the phone and
 * the browser to disagree.
 *
 * The fallback is PER SYMBOL, not per request. EGXBot carries ~277 of the ~292
 * listings TradingView does; a ticker it lacks is looked up on the board, and
 * the board is fetched at all only when something is still missing. So a
 * request for four positions is usually one upstream call.
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
  const quotes = new Map<string, QuoteWire>();

  const egxbot = await fetchEgxBotQuotes(symbols);
  if (egxbot !== null) {
    for (const symbol of symbols) {
      const q = egxbot.quotes.get(symbol);
      if (q === undefined) continue;
      quotes.set(symbol, {
        symbol,
        name: nameForTicker(symbol),
        price: q.price,
        changePercent: fraction(q.changePercent),
        change: moneyChange(q.price, q.changePercent),
        asOf,
        source: 'egxbot',
      });
    }
  }

  const missing = symbols.filter((s) => !quotes.has(s));
  if (missing.length > 0) {
    const board = await fetchTradingViewBoard();
    if (board !== null) {
      const bySymbol = new Map(board.map((row) => [row.symbol, row]));
      for (const symbol of missing) {
        const row = bySymbol.get(symbol);
        if (row === undefined) continue;
        quotes.set(symbol, {
          symbol,
          name: nameForTicker(symbol) ?? row.name,
          price: row.price,
          changePercent: fraction(row.changePercent),
          change: moneyChange(row.price, row.changePercent),
          asOf,
          source: 'tradingview',
        });
      }
    }
  }

  // Which source answered, for the caller: 'egxbot' when everything came from
  // it, 'mixed' when the fallback filled a gap, 'tradingview' when EGXBot was
  // down, 'none' when nothing answered. A symbol neither carries is simply
  // absent — the UI renders «مفيش سعر», never a zero.
  const sources = new Set<QuoteSource>(
    [...quotes.values()].map((q) => q.source as QuoteSource)
  );
  const source =
    sources.size === 0
      ? 'none'
      : sources.size > 1
        ? 'mixed'
        : [...sources][0];

  return NextResponse.json(
    { ok: true, source, quotes: symbols.map((s) => quotes.get(s)).filter(Boolean) },
    {
      // One minute of CDN caching collapses a dashboard full of open positions
      // into one upstream call, and a minute is inside either source's delay.
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' },
    }
  );
}
