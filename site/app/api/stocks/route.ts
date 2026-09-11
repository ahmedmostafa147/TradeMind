import { NextResponse } from 'next/server';

import { fetchEgxBotBoard, fetchEgxBotQuotes } from '@/lib/egxbot-fetch';
import LOGO_IDS from '@/lib/generated/logo-ids.json';
import { fetchTradingViewBoard } from '@/lib/tradingview-fetch';
import { LOGO_ID, type BoardRow } from '@/lib/tradingview';

/**
 * The whole EGX board — every listed stock, with its price.
 *
 * ── WHY THIS IS A SECOND ROUTE AND NOT A CHANGE TO /api/quote ──────────────
 *
 * They answer different questions. `/api/quote` is asked "what is COMI worth"
 * for the handful of tickers a user has positions in. This is asked "what is
 * on the board", and needs a LISTING before it needs a price.
 *
 * ── EGXBOT FIRST, TRADINGVIEW SECOND ───────────────────────────────────────
 *
 * Owner's call (11 سبتمبر 2026). EGXBot's `/stocks` page is the listing —
 * 303 codes, each with an Arabic name, where TradingView's descriptions are
 * English for most — and its `/live/quotes` endpoint refreshes the prices on
 * top of it during the session. The page alone would be enough outside trading
 * hours; the overlay is what keeps the screen moving inside them. When the
 * overlay fails the page's own figures stand, and when the page fails the
 * TradingView board answers instead, so the screen only goes dark when both
 * sources are.
 *
 * ── LOGOS COME FROM A COMMITTED MAP, NOT FROM EITHER SOURCE ────────────────
 *
 * The slug that names the SVG in public/logos/ is TradingView's, and EGXBot
 * has never heard of it. Rather than call TradingView on every board request
 * just to learn which file to show, `node tool/fetch-logos.mjs` writes
 * ticker→slug into lib/generated/logo-ids.json at the same moment it fetches
 * the files. A logo therefore depends on no upstream answering at runtime.
 *
 * ── SERVER-SIDE BECAUSE OF CORS, LIKE THE OTHER MARKET ROUTES ──────────────
 *
 * NOT AUTHENTICATED, on purpose: prices the exchange publishes to everyone, and
 * the route takes NO INPUT AT ALL — there is no parameter to smuggle anything
 * through.
 */

export const dynamic = 'force-dynamic';

/** One page fetch and four quote batches in parallel, with room for a slow origin. */
export const maxDuration = 20;

const logoIds: Record<string, string> = LOGO_IDS;

function logoFor(symbol: string): string | null {
  const id = logoIds[symbol];
  return typeof id === 'string' && LOGO_ID.test(id) ? id : null;
}

async function fromEgxBot(): Promise<BoardRow[] | null> {
  const listing = await fetchEgxBotBoard();
  if (listing === null) return null;

  // The overlay is best-effort: a failed batch leaves the page's figure for
  // those codes, which is at worst a few minutes older.
  const live = await fetchEgxBotQuotes(listing.map((row) => row.symbol));

  return listing.map((row) => {
    const q = live?.quotes.get(row.symbol);
    return {
      symbol: row.symbol,
      name: row.name,
      price: q?.price ?? row.price,
      changePercent: q?.changePercent ?? row.changePercent,
      // EGXBot's table carries no volume, and a 0 would read as "nothing
      // traded". Null is the field's own word for "not reported".
      volume: null,
      // The source declares no delay, and an undeclared delay is not a zero
      // delay. Null lets the UI say «مش لحظي» without inventing a number.
      delaySeconds: null,
      logoId: logoFor(row.symbol),
    };
  });
}

export async function GET() {
  const egxbot = await fromEgxBot();
  if (egxbot !== null && egxbot.length > 0) {
    return NextResponse.json(
      { ok: true, source: 'egxbot', stocks: egxbot, delaySeconds: null },
      {
        headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' },
      }
    );
  }

  const tradingview = await fetchTradingViewBoard();
  if (tradingview !== null && tradingview.length > 0) {
    const stocks = tradingview.map((row) => ({
      ...row,
      logoId: row.logoId ?? logoFor(row.symbol),
    }));
    return NextResponse.json(
      {
        ok: true,
        source: 'tradingview',
        stocks,
        delaySeconds: stocks[0].delaySeconds,
      },
      {
        headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' },
      }
    );
  }

  return NextResponse.json(
    { ok: false, reason: 'تعذّر جلب أسعار البورصة من المصدرين', stocks: [] },
    { status: 502 }
  );
}
