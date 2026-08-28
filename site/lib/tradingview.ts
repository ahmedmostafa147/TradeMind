/**
 * The EGX board from TradingView's scanner. PURE PARSING — the fetch lives in
 * the route, this file only shapes what came back.
 *
 * ── WHY THIS EXISTS ALONGSIDE /api/quote ───────────────────────────────────
 *
 * Yahoo gives us thirty hardcoded symbols at YESTERDAY'S CLOSE. This gives the
 * whole board — 293 listings when it was wired up — DURING the session, in one
 * request, with the Arabic company name attached.
 *
 * ── IT IS DELAYED, AND THE DELAY IS NOT OURS TO CHOOSE ─────────────────────
 *
 * Every row comes back with `update_mode: "delayed_streaming_900"`. That is
 * TradingView stating a 900-second — fifteen minute — delay on EGX, and it is
 * read off the response rather than assumed, so if they ever change it the UI
 * says the new number instead of a stale promise. Real-time EGX data is licensed
 * and sold by the exchange; nothing free is live, and the product must not claim
 * otherwise. See `DELAY_LABEL`.
 *
 * ── AND IT IS AN UNDOCUMENTED ENDPOINT ─────────────────────────────────────
 *
 * `scanner.tradingview.com` is what their own screener calls. It has no contract,
 * no versioning, and their terms discourage redistribution — the owner weighed
 * that and chose to use it (12 أغسطس). What follows from that decision is a
 * design constraint, not a disclaimer: this source may vanish without notice, so
 * every caller keeps the Yahoo path as a fallback and no screen may be built that
 * only works when this responds.
 */

/** TradingView's own word for the EGX feed, decoded. */
export const DELAY_SECONDS = 900;

export const DELAY_LABEL = 'متأخر 15 دقيقة';

export type BoardRow = {
  /** `COMI` — no exchange prefix, no suffix. */
  symbol: string;
  /** Company name as TradingView has it. Arabic for some, English for others. */
  name: string;
  price: number;
  /** Percent, already in percent units: 2.15 means +2.15%. */
  changePercent: number | null;
  volume: number | null;
  /** Seconds of delay the response declared, or null when it did not. */
  delaySeconds: number | null;
  /**
   * TradingView's slug for the company's logo — `commercial-international-bank-egypt`.
   *
   * Null for the ~3% of listings that have none, and the UI must treat that as
   * a normal state rather than a broken image: see `StockLogo`, which falls
   * back to the ticker chip that was there before logos existed.
   *
   * It rides along in the board response that was already being fetched, so
   * showing a logo costs no extra request to learn WHICH logo.
   */
  logoId: string | null;
};

/** The columns requested, in order. The parser reads by index, so these match. */
export const SCANNER_COLUMNS = [
  'name',
  'description',
  'close',
  'change',
  'volume',
  'update_mode',
  // APPENDED, never inserted: the parser below reads cells BY INDEX, so a new
  // column in the middle would silently shift every field after it.
  'logoid',
] as const;

export const SCANNER_BODY = {
  filter: [{ left: 'market', operation: 'equal', right: 'egypt' }],
  markets: ['egypt'],
  options: { lang: 'ar' },
  columns: SCANNER_COLUMNS,
  sort: { sortBy: 'volume', sortOrder: 'desc' },
  range: [0, 300],
};

export const SCANNER_URL = 'https://scanner.tradingview.com/egypt/scan';

/** `"delayed_streaming_900"` → 900. Null for anything else, including realtime. */
export function delayOf(mode: unknown): number | null {
  if (typeof mode !== 'string') return null;
  const match = /(\d+)\s*$/.exec(mode);
  return match ? Number(match[1]) : null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * A logo slug, or null.
 *
 * The pattern is the whole security story for /api/logo: the value is
 * interpolated into an upstream URL path, so anything that could carry a
 * scheme, a host, a traversal or a query is not a slug. Kept next to the
 * parser so the check travels with the field rather than being remembered at
 * each call site.
 */
// MEASURED, not guessed: all 284 slugs the board returned use `[a-z0-9-]` and
// nothing else, and the longest is 64 characters
// (`paints-and-chemical-industries-company-sae-gdr-repr-1-3-shr-144a`). No dot
// is allowed on purpose — it is the only character in the observed set's
// neighbourhood that could start to look like traversal or an extension swap.
export const LOGO_ID = /^[a-z0-9][a-z0-9-]{0,79}$/;

function slug(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return LOGO_ID.test(trimmed) ? trimmed : null;
}

/**
 * One scanner response into rows, dropping anything unusable.
 *
 * A ROW WITH NO PRICE IS DROPPED, NOT ZEROED. The project's rule wherever a
 * price is shown: a figure that did not arrive must never look like a stock that
 * did not move, because a 0 is arithmetic-ed into a 100% loss.
 */
export function parseBoard(body: unknown): BoardRow[] {
  if (typeof body !== 'object' || body === null) return [];
  const data = (body as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];

  const rows: BoardRow[] = [];

  for (const entry of data) {
    if (typeof entry !== 'object' || entry === null) continue;
    const cells = (entry as { d?: unknown }).d;
    if (!Array.isArray(cells)) continue;

    const [name, description, close, change, volume, mode, logoId] = cells;

    const rawTicker =
      typeof (entry as { s?: string }).s === 'string'
        ? (entry as { s?: string }).s!
        : typeof name === 'string'
        ? name
        : '';

    const symbol = rawTicker
      .trim()
      .toUpperCase()
      .replace(/^EGX:/i, '')
      .replace(/\.CA$/i, '');

    const price = num(close);
    if (symbol === '' || price === null || price <= 0) continue;

    rows.push({
      symbol,
      name:
        typeof description === 'string' && description.trim() !== ''
          ? description.trim()
          : symbol,
      price,
      changePercent: num(change),
      volume: num(volume),
      delaySeconds: delayOf(mode),
      // Validated HERE and not at the point of use, because this string ends up
      // in a URL path. The same shape /api/logo enforces, so a value that got
      // through here cannot be one the route rejects.
      logoId: slug(logoId),
    });
  }

  return rows;
}
