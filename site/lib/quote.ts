import { nameForTicker, normalizeTicker } from '@/lib/egx-directory';

/**
 * The last traded price for an EGX symbol, and what a browser is allowed to
 * know about it.
 *
 * The counterpart of `EgxStockInfo` / `fetchStockInfo` in
 * lib/features/market/services/egx_market_service.dart. Deliberately smaller
 * than the Dart model: the app also derives 52-week highs and lows from a year
 * of candles, and the only thing the dashboard needs is the last close, so this
 * asks for the last few days instead of a year.
 *
 * THE PRICE IS A LAST CLOSE, NOT A LIVE TICK, and the UI has to say so. The
 * source is Yahoo's unofficial chart endpoint — the same one the app uses,
 * unchanged in reliability by being called from a server.
 */
export type Quote = {
  symbol: string;
  /** Arabic name from the bundled directory, when the code is one we know. */
  name: string | null;
  price: number;
  /** When that price was struck, from the candle's own timestamp. */
  asOf: Date;
};

/** What the API route sends; `asOf` crosses as an ISO string. */
export type QuoteWire = Omit<Quote, 'asOf'> & { asOf: string };

export function decodeQuote(wire: unknown): Quote | null {
  if (typeof wire !== 'object' || wire === null) return null;
  const w = wire as Record<string, unknown>;
  if (typeof w.symbol !== 'string' || typeof w.price !== 'number') return null;
  if (!Number.isFinite(w.price) || w.price <= 0) return null;
  const asOf = typeof w.asOf === 'string' ? new Date(w.asOf) : null;
  if (asOf === null || Number.isNaN(asOf.getTime())) return null;
  return {
    symbol: w.symbol,
    name: typeof w.name === 'string' ? w.name : null,
    price: w.price,
    asOf,
  };
}

/**
 * Unrealised profit on an open position at `price`.
 *
 * Mirrors what LivePnlView computes. Null rather than zero when the price is
 * missing: a quote that failed to load must never render as a flat result,
 * because "no data" and "no movement" are different answers and only one of
 * them is a fact.
 */
export function unrealised(
  entryPrice: number,
  quantity: number,
  price: number
): { pnl: number; pct: number } | null {
  if (!Number.isFinite(entryPrice) || entryPrice <= 0) return null;
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  if (!Number.isFinite(price) || price <= 0) return null;
  const pnl = (price - entryPrice) * quantity;
  if (!Number.isFinite(pnl)) return null;
  const pct = (price - entryPrice) / entryPrice;
  return { pnl, pct: Number.isFinite(pct) ? pct : 0 };
}

/**
 * Parses Yahoo's chart payload down to the last close.
 *
 * Server-side, but exported and pure so the shape of the response is something
 * that can be reasoned about without a network. The `range`/`interval` pair is
 * required rather than cosmetic — the Dart original documents that omitting it
 * makes Yahoo return empty `indicators` and leaves only a stale `meta` price.
 */
export function parseYahooChart(body: unknown, symbol: string): Quote | null {
  if (typeof body !== 'object' || body === null) return null;
  const chart = (body as Record<string, unknown>).chart;
  if (typeof chart !== 'object' || chart === null) return null;
  const results = (chart as Record<string, unknown>).result;
  if (!Array.isArray(results) || results.length === 0) return null;

  const first = results[0] as Record<string, unknown>;
  const timestamps = first.timestamp;
  const indicators = first.indicators as Record<string, unknown> | undefined;
  const quoteBlocks = indicators?.quote;
  if (!Array.isArray(timestamps) || !Array.isArray(quoteBlocks)) return null;

  const closes = (quoteBlocks[0] as Record<string, unknown> | undefined)?.close;
  if (!Array.isArray(closes)) return null;

  // Walk back from the end: Yahoo pads the series with nulls for sessions that
  // have no print yet, and taking the last element blindly yields null on any
  // day the exchange has not traded.
  for (let i = closes.length - 1; i >= 0; i -= 1) {
    const close = closes[i];
    const at = timestamps[i];
    if (typeof close !== 'number' || !Number.isFinite(close) || close <= 0) {
      continue;
    }
    if (typeof at !== 'number' || !Number.isFinite(at)) continue;
    return {
      symbol,
      name: nameForTicker(symbol),
      price: close,
      asOf: new Date(at * 1000),
    };
  }
  return null;
}

/** `.CA` is Yahoo's suffix for the Egyptian exchange. */
export function yahooChartUrl(symbol: string): string {
  return (
    `https://query1.finance.yahoo.com/v8/finance/chart/${normalizeTicker(symbol)}.CA` +
    '?range=5d&interval=1d'
  );
}
