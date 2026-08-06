/**
 * «مين اشترى ومين باع» — the EGX investor-flow breakdown.
 *
 * This is the number that makes Radar different from every other trade
 * journal: not what a stock did, but who moved it. The exchange reports each
 * session's turnover split two ways at once — by nationality (Egyptian, Arab,
 * non-Arab foreign) and by investor class (institution vs individual) — and the
 * interesting signal is in the cross: foreign institutions buying while local
 * individuals sell is a different market from the reverse, at the same index
 * level.
 *
 * THE SOURCE
 * https://www.egx.com.eg/en/investorstypepiechart.aspx — an ASP.NET WebForms
 * page that renders three GridView tables:
 *
 *   ctl00_C_Pc_GridView1            all investors, by nationality
 *   ctl00_C_Pc_gvInstByNationality  institutions only
 *   ctl00_C_Pc_gvIndByNationality   individuals only
 *
 * Each has one row per nationality and three money columns: bought, sold, net.
 *
 * WHY THE POST NEEDS __VIEWSTATE, AND WHY IT IS NOT HARDCODED HERE
 * The page is a postback form: selecting All/Securities/Bonds posts back with
 * `ctl00$C$rblSecuritiesBonds` plus ASP.NET's `__VIEWSTATE` and
 * `__VIEWSTATEGENERATOR`. A VIEWSTATE is a signed, server-generated blob tied
 * to the page instance — pasting a captured one into the source works right up
 * until the server rotates its machine key or changes the control tree, and
 * then it fails with a 500 that says nothing useful. The fetcher therefore GETs
 * the page, reads the tokens out of the returned HTML, and posts them back.
 *
 * PARSING IS SEPARATE FROM FETCHING ON PURPOSE. Everything below is pure: HTML
 * string in, typed data out, no network. That is what makes it testable without
 * reaching egx.com.eg — which matters more than usual here, because the site
 * answers automated requests with 403 and cannot be exercised from CI.
 */

import * as cheerio from 'cheerio';

export const NATIONALITIES = ['egyptian', 'arab', 'foreign'] as const;
export type Nationality = (typeof NATIONALITIES)[number];

export const CLASSES = ['all', 'institutions', 'individuals'] as const;
export type InvestorClass = (typeof CLASSES)[number];

/** The GridView that carries each investor class. */
export const TABLE_IDS: Record<InvestorClass, string> = {
  all: 'ctl00_C_Pc_GridView1',
  institutions: 'ctl00_C_Pc_gvInstByNationality',
  individuals: 'ctl00_C_Pc_gvIndByNationality',
};

export type FlowRow = {
  bought: number;
  sold: number;
  /**
   * Positive = net buyer. TAKEN FROM THE PAGE, NOT RECOMPUTED as bought − sold:
   * if EGX ever disagrees with that subtraction (a correction, a rounding rule,
   * a column meaning something subtly different), the number shown must be the
   * exchange's, not ours. `netMismatch` flags the disagreement instead of
   * hiding it.
   */
  net: number;
  netMismatch: boolean;
};

export type FlowTable = Record<Nationality, FlowRow>;

export type MarketFlows = {
  /** Session date, YYYY-MM-DD. */
  date: string;
  all: FlowTable;
  institutions: FlowTable;
  individuals: FlowTable;
};

/**
 * Matches an EGX row label to a nationality.
 *
 * Substring matching rather than equality because the labels are not stable
 * strings: the English page says "Non-Arab Foreigners", the Arabic one
 * «أجانب غير عرب», and either can pick up a footnote marker or a stray
 * non-breaking space. ORDER MATTERS — "Non-Arab Foreigners" contains "Arab",
 * so foreign must be tested before arab or every foreign row is filed as Arab.
 */
const LABELS: { nationality: Nationality; needles: string[] }[] = [
  { nationality: 'foreign', needles: ['non-arab', 'foreign', 'أجانب', 'اجانب'] },
  { nationality: 'arab', needles: ['arab', 'عرب'] },
  { nationality: 'egyptian', needles: ['egyptian', 'مصري', 'مصر'] },
];

export function nationalityOf(label: string): Nationality | null {
  const text = label.toLowerCase().replace(/ /g, ' ').trim();
  for (const { nationality, needles } of LABELS) {
    if (needles.some((n) => text.includes(n))) return nationality;
  }
  return null;
}

/**
 * "368,885,661" → 368885661, "(49,501,526)" → -49501526, "-" → null.
 *
 * Accepts Arabic-Indic digits for the same reason lib/risk-math.ts does: the
 * Arabic page may serve them, and a parser that silently returns NaN on ٣ would
 * store a broken session rather than fail loudly. Parentheses are accepted as
 * negative because accounting-style tables use them and a dropped minus sign
 * inverts the entire meaning of the figure.
 */
export function parseMoney(raw: string): number | null {
  const western = raw.replace(/[٠-٩]/g, (d) =>
    String(d.charCodeAt(0) - 0x0660)
  );

  const trimmed = western.replace(/ /g, ' ').trim();
  if (trimmed === '' || trimmed === '-' || trimmed === '—') return null;

  const negative = /^\(.*\)$/.test(trimmed) || trimmed.startsWith('-');
  const digits = trimmed.replace(/[^0-9.]/g, '');
  if (digits === '' || digits === '.') return null;

  const value = Number(digits);
  if (!Number.isFinite(value)) return null;

  return negative ? -value : value;
}

/**
 * Which column is which, read from the header row rather than assumed.
 *
 * THIS IS NOT DEFENSIVENESS FOR ITS OWN SAKE — IT IS THE CORRECTNESS OF THE
 * WHOLE FEATURE. A captured sample of this page has, for non-Arab foreigners,
 * the three figures 68,319,014 / 129,318,526 / 60,999,512, and the third is
 * exactly the second minus the first. Read one way that is foreigners buying
 * 61M net; read the other it is foreigners SELLING 61M net. The values alone
 * cannot distinguish them, and a dashboard that gets it backwards does not
 * degrade — it confidently tells a trader the opposite of what happened.
 *
 * So the column order is never guessed. If the headers cannot be identified the
 * table is rejected and nothing is stored, because no data is recoverable and
 * inverted data is not.
 */
const COLUMN_NEEDLES = {
  bought: ['buy', 'bought', 'purchas', 'شراء', 'مشتريات'],
  sold: ['sell', 'sold', 'sale', 'بيع', 'مبيعات'],
  net: ['net', 'صافي', 'صافى'],
} as const;

export type ColumnMap = { bought: number; sold: number; net: number };

export function readColumns(headers: string[]): ColumnMap | null {
  const found: Partial<ColumnMap> = {};

  headers.forEach((raw, index) => {
    const text = raw.toLowerCase().replace(/ /g, ' ').trim();
    // `net` is tested first: a header like «صافي الشراء» / "Net Buy" contains
    // both needles, and it is the net column.
    for (const key of ['net', 'bought', 'sold'] as const) {
      if (found[key] !== undefined) continue;
      if (COLUMN_NEEDLES[key].some((n) => text.includes(n))) {
        found[key] = index;
        return;
      }
    }
  });

  if (
    found.bought === undefined ||
    found.sold === undefined ||
    found.net === undefined
  ) {
    return null;
  }
  return found as ColumnMap;
}

/** Reads one GridView into a FlowTable. Returns null if the table is absent. */
export function parseTable(html: string, tableId: string): FlowTable | null {
  const $ = cheerio.load(html);
  const table = $(`#${tableId}`);
  if (table.length === 0) return null;

  const headerCells = table
    .find('th')
    .toArray()
    .map((th: Parameters<typeof $>[0]) => $(th).text());
  const columns = readColumns(headerCells);
  if (columns === null) return null;

  const out: Partial<FlowTable> = {};

  table.find('tr').each((_: number, tr: Parameters<typeof $>[0]) => {
    const cells = $(tr)
      .find('td')
      .toArray()
      .map((td: Parameters<typeof $>[0]) => $(td).text());

    // Header rows carry <th>, and the GridView emits a footer row with a
    // different column count. Anything without every mapped column is not a
    // data row.
    const widest = Math.max(columns.bought, columns.sold, columns.net);
    if (cells.length <= widest) return;

    const nationality = nationalityOf(cells[0]);
    if (nationality === null || out[nationality]) return;

    const bought = parseMoney(cells[columns.bought]);
    const sold = parseMoney(cells[columns.sold]);
    const net = parseMoney(cells[columns.net]);
    if (bought === null || sold === null || net === null) return;

    out[nationality] = {
      bought,
      sold,
      net,
      // One EGP of tolerance absorbs the exchange's own rounding without
      // masking a real disagreement.
      netMismatch: Math.abs(bought - sold - net) > 1,
    };
  });

  // A partial table is worse than none: a missing nationality would render as
  // a confident zero and read as "foreigners did nothing today".
  if (NATIONALITIES.some((n) => !out[n])) return null;

  return out as FlowTable;
}

/**
 * Parses a whole page. Returns null unless all three tables are present and
 * complete — a session stored half-parsed would be indistinguishable from a
 * quiet day on the dashboard.
 */
export function parseFlowsPage(html: string, date: string): MarketFlows | null {
  const all = parseTable(html, TABLE_IDS.all);
  const institutions = parseTable(html, TABLE_IDS.institutions);
  const individuals = parseTable(html, TABLE_IDS.individuals);

  if (!all || !institutions || !individuals) return null;

  return { date, all, institutions, individuals };
}

/**
 * ASP.NET's postback tokens, read out of a GET of the page.
 *
 * Returns whatever it finds rather than throwing: the caller decides whether a
 * missing token means "post without it and hope" or "give up", and that choice
 * belongs at the call site where the response can be logged.
 */
export function readViewState(html: string): {
  viewState: string | null;
  generator: string | null;
} {
  const $ = cheerio.load(html);
  const value = (name: string) => {
    const v = $(`input[name="${name}"]`).attr('value');
    return typeof v === 'string' && v !== '' ? v : null;
  };
  return {
    viewState: value('__VIEWSTATE'),
    generator: value('__VIEWSTATEGENERATOR'),
  };
}

/** Session date in Cairo, as YYYY-MM-DD. */
export function cairoDate(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD, which avoids assembling the string by hand
  // from parts that would need padding.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
