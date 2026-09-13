/**
 * How often a price screen asks again.
 *
 * ── THE CADENCE FOLLOWS THE EXCHANGE, NOT THE CLOCK ────────────────────────
 *
 * The routes pass through the source's own `open` flag. While it is true the
 * dashboard asks every half minute — quick enough that a figure is never older
 * than the CDN window in front of the route, which is the same thirty seconds
 * (see /api/quote), and polite enough that a hundred open dashboards are still
 * one upstream call per tick. When the exchange is closed nothing moves, so a
 * slow tick is only there to notice the next session starting. Null — the
 * source did not say, which is what the TradingView fallback returns — is
 * treated as open, because guessing "closed" is the direction that leaves a
 * stale number on screen.
 *
 * Hidden tabs never fetch at all; the hooks check `visibilityState` before
 * every request and refresh the moment the tab is looked at again.
 */
export type SessionFlag = boolean | null;

export const OPEN_POLL_MS = 30_000;
export const CLOSED_POLL_MS = 5 * 60_000;

export function pollDelay(open: SessionFlag): number {
  return open === false ? CLOSED_POLL_MS : OPEN_POLL_MS;
}

/**
 * The one line every price screen may say about its figures.
 *
 * NO SOURCE IS NAMED — owner's call (13 سبتمبر 2026). The captions used to read
 * «المصدر: EGXBot» / «المصدر: TradingView»; that advertised another product
 * inside ours and named feeds we read without a licence. And nothing here may
 * claim a live price: the exchange licenses real-time data and sells it, and
 * neither source we read is that. «استرشادية» says both things without a
 * delay figure we cannot back.
 */
export const PRICES_CAPTION = 'الأسعار استرشادية';
