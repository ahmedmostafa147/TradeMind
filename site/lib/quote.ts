/**
 * The last traded price for an EGX symbol, and what a browser is allowed to
 * know about it.
 *
 * The counterpart of `EgxStockInfo` in
 * lib/features/market/services/egx_market_service.dart, and the shape
 * `/api/quote` sends to both the dashboard and the app.
 *
 * ── THE PRICE IS NOT A LIVE TICK, AND THE UI HAS TO SAY SO ─────────────────
 *
 * It comes from EGXBot first and TradingView second (see the route). Neither
 * is the exchange's licensed feed: TradingView declares a fifteen-minute delay
 * and EGXBot declares nothing, and an undeclared delay is not a zero delay.
 * `source` rides along so the screen can say which of the two it is quoting.
 *
 * ── THERE IS NO SESSION TIMESTAMP ANY MORE ─────────────────────────────────
 *
 * Yahoo, now gone, was the one source that handed back the candle's own time,
 * and the UI printed it under the price as the date of the close. Neither
 * remaining source says WHEN its figure was struck — outside trading hours it
 * is the last session's close with no date attached — so `asOf` is the moment
 * the route answered, and nothing may render it as the date of a close.
 */
export type QuoteSource = 'egxbot' | 'tradingview';

export type Quote = {
  symbol: string;
  /** Arabic name: the bundled directory first, then whatever the source had. */
  name: string | null;
  price: number;
  /** The day's move as money, and the same as a FRACTION (0.0215 = +2.15%). Null together. */
  change: number | null;
  changePercent: number | null;
  /** When the route answered — NOT when the price was struck. See above. */
  asOf: Date;
  source: QuoteSource | null;
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
  const num = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v : null;

  return {
    symbol: w.symbol,
    name: typeof w.name === 'string' ? w.name : null,
    price: w.price,
    change: num(w.change),
    changePercent: num(w.changePercent),
    asOf,
    source:
      w.source === 'egxbot' || w.source === 'tradingview' ? w.source : null,
  };
}

/** What a screen may say about where a quote came from. Never «مباشر». */
export function quoteSourceLabel(source: QuoteSource | null): string {
  switch (source) {
    case 'egxbot':
      return 'المصدر: EGXBot — مش سعر لحظي';
    case 'tradingview':
      return 'المصدر: TradingView — متأخر 15 دقيقة';
    default:
      return 'مش سعر لحظي';
  }
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
