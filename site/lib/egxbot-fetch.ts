import { normalizeTicker } from '@/lib/egx-directory';

/**
 * EGXBot's headline pair: the index level, and whoever led the board.
 *
 * ── PERCENTS ARE IN PERCENT UNITS ──────────────────────────────────────────
 *
 * `changePercent: 2.15` means +2.15%, exactly as in `BoardRow`. An earlier
 * version stored the fraction here and multiplied by 100 at the one call site,
 * which put two conventions for one quantity inside a single panel — the shape
 * that eventually ships a 100x error when a third caller reads the field and
 * assumes the other convention.
 *
 * ── THE SOURCE DECLARES NO DELAY ───────────────────────────────────────────
 *
 * TradingView states its EGX delay in every row (`delayed_streaming_900`) and
 * the UI repeats that number back. This payload states nothing. An undeclared
 * delay is not a zero delay, so nothing built on this may say «مباشر» or
 * «لحظي» — the project's standing rule, and here there is not even a figure to
 * argue with.
 */
export type EgxBotHeroData = {
  egx30: {
    price: number;
    /** Percent units: 2.15 means +2.15%. */
    changePercent: number;
  } | null;
  gainer: {
    code: string;
    /** Percent units: 2.15 means +2.15%. */
    changePercent: number;
  } | null;
  asOf: string;
};

const EGXBOT_BASE_URL = 'https://egxbot.com';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/**
 * Parses EGXBot's `/live/hero` JSON response safely.
 */
export function parseEgxBotHeroPayload(body: unknown): EgxBotHeroData | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;

  let egx30: EgxBotHeroData['egx30'] = null;
  if (typeof b.egx30 === 'object' && b.egx30 !== null) {
    const e = b.egx30 as Record<string, unknown>;
    if (typeof e.price === 'number' && Number.isFinite(e.price) && e.price > 0) {
      const changePercent =
        typeof e.change_pct === 'number' && Number.isFinite(e.change_pct)
          ? e.change_pct
          : 0;
      egx30 = { price: e.price, changePercent };
    }
  }

  let gainer: EgxBotHeroData['gainer'] = null;
  if (typeof b.gainer === 'object' && b.gainer !== null) {
    const g = b.gainer as Record<string, unknown>;
    if (typeof g.code === 'string' && g.code.trim() !== '') {
      const changePercent =
        typeof g.change_pct === 'number' && Number.isFinite(g.change_pct)
          ? g.change_pct
          : 0;
      gainer = { code: normalizeTicker(g.code), changePercent };
    }
  }

  if (egx30 === null && gainer === null) return null;

  return {
    egx30,
    gainer,
    asOf: new Date().toISOString(),
  };
}

/**
 * Fetches the live EGX30 index and top gainer from EGXBot's hero endpoint.
 */
export async function fetchEgxBotLiveHero(): Promise<EgxBotHeroData | null> {
  try {
    const res = await fetch(`${EGXBOT_BASE_URL}/live/hero`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
      signal: AbortSignal.timeout(5_000),
      cache: 'no-store',
    });

    if (!res.ok) return null;
    const body = await res.json();
    return parseEgxBotHeroPayload(body);
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// STOCK PRICES — EGXBot is the FIRST source for every price in the product
// (owner's call, 11 سبتمبر 2026). TradingView is the fallback; Yahoo is gone.
// ═══════════════════════════════════════════════════════════════════════════

/** One stock as `/live/quotes` reports it. Percent units, like everything here. */
export type EgxBotQuote = {
  price: number;
  /** Percent units: 2.15 means +2.15%. Null when the payload carried none. */
  changePercent: number | null;
  /** The source's own flag: it is not confident the figure is current. */
  stale: boolean;
};

export type EgxBotQuotes = {
  /** Whether the exchange is in session, as the source sees it. Null if unsaid. */
  open: boolean | null;
  quotes: Map<string, EgxBotQuote>;
};

/**
 * How many codes one `/live/quotes` call answers.
 *
 * MEASURED, NOT DOCUMENTED — the endpoint has no documentation. Asked for 60,
 * 80, 100, 120, 150 and 200 codes it answered 58, 77, 77, 77, 77 and 77 (the
 * few short of the ask are codes it does not carry at all). Everything past
 * the eightieth code is dropped WITHOUT ANY ERROR, and a silent drop is exactly
 * the failure that reads as "the board got smaller". So: chunks of eighty, in
 * parallel. The full board is four requests, each answered in ~0.4 s.
 */
export const EGXBOT_QUOTES_BATCH = 80;

/** `/live/quotes` payload → quotes keyed by ticker. Unusable rows are dropped, never zeroed. */
export function parseEgxBotQuotes(body: unknown): EgxBotQuotes | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;
  const raw = b.quotes;
  if (typeof raw !== 'object' || raw === null) return null;

  const quotes = new Map<string, EgxBotQuote>();
  for (const [code, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== 'object' || value === null) continue;
    const q = value as Record<string, unknown>;
    const price = q.price;
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
      continue;
    }
    const symbol = normalizeTicker(code);
    if (symbol === '') continue;
    quotes.set(symbol, {
      price,
      changePercent:
        typeof q.change_pct === 'number' && Number.isFinite(q.change_pct)
          ? q.change_pct
          : null,
      stale: q.stale === true,
    });
  }

  return {
    open: typeof b.open === 'boolean' ? b.open : null,
    quotes,
  };
}

/**
 * Prices for a set of tickers, in batches of {@link EGXBOT_QUOTES_BATCH}.
 *
 * Null ONLY when nothing came back at all — every batch failed. A batch that
 * failed while others answered degrades to "those codes have no price", which
 * every caller already renders; and a code the source does not carry is simply
 * absent, which is the signal the route uses to fall back for that code alone.
 */
export async function fetchEgxBotQuotes(
  codes: string[]
): Promise<EgxBotQuotes | null> {
  const wanted = [...new Set(codes.map(normalizeTicker).filter((c) => c !== ''))];
  if (wanted.length === 0) return { open: null, quotes: new Map() };

  const batches: string[][] = [];
  for (let i = 0; i < wanted.length; i += EGXBOT_QUOTES_BATCH) {
    batches.push(wanted.slice(i, i + EGXBOT_QUOTES_BATCH));
  }

  const settled = await Promise.all(
    batches.map(async (batch) => {
      try {
        const res = await fetch(
          `${EGXBOT_BASE_URL}/live/quotes?codes=${encodeURIComponent(batch.join(','))}`,
          {
            headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
            signal: AbortSignal.timeout(6_000),
            cache: 'no-store',
          }
        );
        if (!res.ok) return null;
        return parseEgxBotQuotes(await res.json());
      } catch {
        return null;
      }
    })
  );

  const answered = settled.filter((s) => s !== null);
  if (answered.length === 0) return null;

  const quotes = new Map<string, EgxBotQuote>();
  let open: boolean | null = null;
  for (const part of answered) {
    for (const [k, v] of part.quotes) quotes.set(k, v);
    if (part.open !== null) open = part.open;
  }
  return { open, quotes };
}

/** One row of EGXBot's `/stocks` table. */
export type EgxBotListing = {
  symbol: string;
  /** Arabic company name — EGXBot has one for every listing; TradingView does not. */
  name: string;
  price: number;
  /** Percent units. Null when the cell was not a number. */
  changePercent: number | null;
};

/**
 * The whole board from the `/stocks` page.
 *
 * ── THIS IS AN HTML SCRAPE, AND IT IS WRITTEN TO REFUSE RATHER THAN GUESS ──
 *
 * EGXBot has no JSON listing of the board; `/live/quotes` prices codes you
 * already know. The `/stocks` page is one `<table class="stk-table">` under a
 * header row, and MEASURED (11 سبتمبر 2026): 303 rows, 303 unique codes, 302
 * with a numeric price, every one with an Arabic name.
 *
 * COLUMN ORDER IS READ FROM THE HEADER AND NEVER ASSUMED — the rule
 * worker/radar_flows/parse.py keeps for the exchange's own tables, for the
 * same reason: a column inserted upstream would otherwise put every price on
 * the wrong ticker with no error anywhere. If the four headers this needs are
 * not all present the whole page is rejected and the route falls back.
 */
export function parseEgxBotStocksPage(html: string): EgxBotListing[] {
  const start = html.indexOf('<table class="stk-table"');
  if (start === -1) return [];
  const end = html.indexOf('</table>', start);
  const table = html.slice(start, end === -1 ? undefined : end);

  const headers = [...table.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map((m) =>
    stripTags(m[1])
  );
  const col = {
    symbol: headers.indexOf('الرمز'),
    name: headers.indexOf('السهم'),
    price: headers.indexOf('السعر'),
    change: headers.indexOf('التغير'),
  };
  if (Object.values(col).some((i) => i === -1)) return [];
  const width = Math.max(col.symbol, col.name, col.price, col.change);

  const rows: EgxBotListing[] = [];
  const seen = new Set<string>();
  for (const match of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...match[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map((m) =>
      stripTags(m[1])
    );
    if (cells.length <= width) continue;

    const symbol = normalizeTicker(cells[col.symbol]);
    if (symbol === '' || seen.has(symbol)) continue;

    const price = Number(cells[col.price].replace(/,/g, ''));
    // A ROW WITH NO PRICE IS DROPPED, NOT ZEROED — the product's rule wherever
    // a price is shown. One listing on the measured page prints a dash.
    if (!Number.isFinite(price) || price <= 0) continue;

    const changeText = cells[col.change].replace(/[%,\s]/g, '');
    const change = changeText === '' ? NaN : Number(changeText);

    seen.add(symbol);
    rows.push({
      symbol,
      name: cells[col.name] !== '' ? cells[col.name] : symbol,
      price,
      changePercent: Number.isFinite(change) ? change : null,
    });
  }
  return rows;
}

/** The `/stocks` page parsed, or null when it could not be fetched or read. */
export async function fetchEgxBotBoard(): Promise<EgxBotListing[] | null> {
  try {
    const res = await fetch(`${EGXBOT_BASE_URL}/stocks`, {
      headers: { Accept: 'text/html', 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(8_000),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const rows = parseEgxBotStocksPage(await res.text());
    return rows.length > 0 ? rows : null;
  } catch {
    return null;
  }
}

function stripTags(fragment: string): string {
  return fragment
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim();
}
