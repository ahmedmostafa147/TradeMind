/**
 * One price, and everything a caller needs to judge whether to trust it.
 *
 * `asOf`, `source` and `stale` are not decoration. This service exists because
 * one feed goes down and another takes over, so the answer to "what is COMI
 * worth" is always accompanied by where the number came from and how old it is.
 * A consumer that renders a cached price from a dead provider as if it were
 * live is the failure this shape is designed to prevent.
 */
export interface Quote {
  /** Normalised: upper case, no exchange suffix. */
  symbol: string;
  price: number;
  /** The close before `price`. Null when the source does not carry one. */
  previousClose: number | null;
  change: number | null;
  /** A fraction, not a percentage — 0.0414 is +4.14%. */
  changePercent: number | null;
  /** Volume for the session, when the source reports it. */
  volume: number | null;
  /** When the price was struck upstream, NOT when we fetched it. */
  asOf: Date;
  /** Which provider produced it, or `cache`. */
  source: string;
  /**
   * True when this came from the cache because every provider was down.
   *
   * Separate from `asOf` on purpose: a fresh-looking timestamp on a cached
   * quote is still a cached quote, and the caller has to be able to say so
   * without doing arithmetic on a clock it does not control.
   */
  stale: boolean;
}

export interface Candle {
  /** Session date, midnight UTC. */
  date: Date;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  volume: number | null;
}

/** Strips an exchange suffix and normalises case, so `comi.ca` === `COMI`. */
export function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/\.(CA|EG|EGX)$/i, '');
}

/**
 * Whether a new quote is worth telling subscribers about.
 *
 * Price AND timestamp, because a re-print at the same price is still news to a
 * chart, while a repeated poll returning the identical candle is not. Without
 * this the socket rebroadcasts the whole book on every poll interval, which is
 * bandwidth spent to tell clients nothing changed.
 */
export function isMeaningfulChange(
  previous: Quote | undefined,
  next: Quote,
): boolean {
  if (previous === undefined) return true;
  if (previous.price !== next.price) return true;
  return previous.asOf.getTime() !== next.asOf.getTime();
}
