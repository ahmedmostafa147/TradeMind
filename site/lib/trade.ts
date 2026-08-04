/**
 * The trade record as the app stores it, and the metrics derived from it.
 *
 * Decoding mirrors SyncCodec.tradeFromMap in the Flutter app field for field,
 * including its two defensive rules, because the dashboard reads the exact
 * documents that codec wrote:
 *
 *   - dates are ISO-8601 STRINGS, not Firestore Timestamps (the app's codec
 *     comment explains why: the same encoding then works for a local JSON
 *     export, with no server-vs-client clock ambiguity)
 *   - exitPrice and exitDate are both-or-neither; a half-written record is
 *     normalised to "still open" rather than trusted
 *
 * Metrics repeat TradeMetrics rather than being re-invented, so a figure here
 * and the same figure on the phone cannot disagree.
 */

export type TradeStatus = 'planned' | 'open' | 'closed' | 'cancelled';

/**
 * One dated note on a trade's life — «حرّكت الاستوب»، «خرجت نص الكمية».
 *
 * Mirrors lib/trades/timeline_entry.dart. The single `notes` field is separate
 * and stays: it is the lesson, this is the log.
 */
export type TimelineEntry = {
  date: Date;
  text: string;
};

export type Trade = {
  id: string;
  entryDate: Date;
  ticker: string;
  reason: string;
  entryPrice: number;
  stopPrice: number;
  quantity: number;
  exitPrice: number | null;
  exitDate: Date | null;
  notes: string | null;
  status: TradeStatus;
  tags: string[];
  isFavorite: boolean;
  completedChecklistItems: string[];
  source: string | null;
  takeProfitPrice: number | null;
  /**
   * Dated notes across the trade's life. Read AND written now — the form has a
   * timeline editor, and {@link encodeTrade} sends the whole array.
   *
   * It has to be the whole array: the write is `merge: true`, and Firestore
   * replaces an array field wholesale rather than merging its items. So every
   * edit must start from the stored list. The form is seeded from the loaded
   * trade for exactly this reason.
   */
  timeline: TimelineEntry[];
  /**
   * READ-ONLY here, and never written back.
   *
   * These are absolute paths into the phone's documents directory — worthless
   * to a browser, which cannot open one. They are decoded anyway because the
   * discipline score awards 20 points for "a chart screenshot is attached", and
   * without the count this surface would score every trade 20 points below what
   * the app scores it. {@link encodeTrade} omits the field so merge preserves
   * whatever the phone put there.
   */
  screenshotPaths: string[];
};

const STATUSES: TradeStatus[] = ['planned', 'open', 'closed', 'cancelled'];

function toNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

/**
 * Mirrors the app's codec: entries that are not objects are skipped, a missing
 * or unparseable date falls back to now, and missing text to an empty string —
 * one malformed entry must not cost the whole timeline.
 */
function toTimeline(value: unknown): TimelineEntry[] {
  if (!Array.isArray(value)) return [];
  const entries: TimelineEntry[] = [];
  for (const raw of value) {
    if (typeof raw !== 'object' || raw === null) continue;
    const item = raw as Record<string, unknown>;
    entries.push({
      date: toDate(item.date) ?? new Date(),
      text: typeof item.text === 'string' ? item.text : '',
    });
  }
  return entries;
}

/** Returns null for a document too malformed to be a trade at all. */
export function decodeTrade(data: Record<string, unknown>): Trade | null {
  const id = typeof data.id === 'string' ? data.id : null;
  if (!id) return null;

  const exitPrice = toNumber(data.exitPrice);
  const exitDate = toDate(data.exitDate);

  const rawStatus = typeof data.status === 'string' ? data.status : null;
  const status: TradeStatus = STATUSES.includes(rawStatus as TradeStatus)
    ? (rawStatus as TradeStatus)
    : // Same migration rule the app applies to records written before the
      // status field existed.
      exitPrice === null
      ? 'open'
      : 'closed';

  return {
    id,
    entryDate: toDate(data.entryDate) ?? new Date(),
    ticker: typeof data.ticker === 'string' ? data.ticker : '',
    reason: typeof data.reason === 'string' ? data.reason : '',
    entryPrice: toNumber(data.entryPrice) ?? 0,
    stopPrice: toNumber(data.stopPrice) ?? 0,
    quantity: toNumber(data.quantity) ?? 0,
    exitPrice: exitDate === null ? null : exitPrice,
    exitDate: exitPrice === null ? null : exitDate,
    notes: typeof data.notes === 'string' ? data.notes : null,
    status,
    tags: toStringList(data.tags),
    isFavorite: data.isFavorite === true,
    completedChecklistItems: toStringList(data.completedChecklistItems),
    source: typeof data.source === 'string' ? data.source : null,
    takeProfitPrice: toNumber(data.takeProfitPrice),
    timeline: toTimeline(data.timeline),
    screenshotPaths: toStringList(data.screenshotPaths),
  };
}

/**
 * The inverse of {@link decodeTrade}, matching SyncCodec.tradeToMap field for
 * field so a trade written here is indistinguishable from one the app wrote.
 *
 * THREE RULES THAT ARE NOT NEGOTIABLE, because the app reads these documents:
 *
 *   1. Dates are ISO-8601 STRINGS, never Firestore Timestamps. The app's codec
 *      does `value is String ? DateTime.tryParse(value) : null` — hand it a
 *      Timestamp and the date silently becomes null, which for `entryDate`
 *      means every trade written from the web jumps to "now" on the phone.
 *   2. `status` is the RESOLVED name, so a record round-trips as what it
 *      behaves as rather than as an absent field.
 *   3. `screenshotPaths` is omitted, never written empty. It holds absolute
 *      paths into the phone's own storage — data the browser cannot produce or
 *      display — and every write goes out with merge:true, so omitting it
 *      preserves whatever the phone put there. Writing `[]` would erase a
 *      user's chart screenshots from a surface that never showed them.
 *
 *      `timeline` USED TO BE in that sentence and no longer is. It was omitted
 *      for the same reason, but the cost was real: «قرار اليوم» computes "last
 *      touch" from the newest timeline entry, so with the field permanently
 *      absent every trade's last touch was its entry date and «محتاجة ملاحظة»
 *      fired on trades the phone considered handled. The form edits the list
 *      now, so it is written — as the COMPLETE array, because Firestore
 *      replaces an array field rather than merging into it.
 */
export function encodeTrade(trade: Trade): Record<string, unknown> {
  return {
    id: trade.id,
    entryDate: trade.entryDate.toISOString(),
    ticker: trade.ticker,
    reason: trade.reason,
    entryPrice: trade.entryPrice,
    stopPrice: trade.stopPrice,
    quantity: trade.quantity,
    exitPrice: trade.exitPrice,
    exitDate: trade.exitDate ? trade.exitDate.toISOString() : null,
    notes: trade.notes,
    status: trade.status,
    tags: trade.tags,
    isFavorite: trade.isFavorite,
    completedChecklistItems: trade.completedChecklistItems,
    // Same shape SyncCodec.tradeToMap writes: a list of {date, text} with the
    // date as an ISO string, for the reason rule 1 gives.
    timeline: trade.timeline.map((entry) => ({
      date: entry.date.toISOString(),
      text: entry.text,
    })),
    source: trade.source,
    takeProfitPrice: trade.takeProfitPrice,
  };
}

/**
 * A fresh trade id.
 *
 * `crypto.randomUUID` needs a secure context, which every page here is (the
 * site is HTTPS-only and localhost counts) — but the fallback keeps a trade
 * from being unsavable on an older browser rather than throwing at the moment
 * the user hits save.
 */
export function newTradeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export type TradeResult = 'win' | 'loss' | 'breakeven' | 'open';

export type TradeMetrics = {
  positionValue: number;
  riskEgp: number;
  riskPct: number | null;
  pnl: number | null;
  rMultiple: number | null;
  result: TradeResult;
};

export function metricsOf(trade: Trade, capital: number): TradeMetrics {
  const positionValue = trade.entryPrice * trade.quantity;
  const riskEgp = (trade.entryPrice - trade.stopPrice) * trade.quantity;
  const riskPct = capital > 0 ? riskEgp / capital : null;

  const pnl =
    trade.exitPrice === null
      ? null
      : (trade.exitPrice - trade.entryPrice) * trade.quantity;

  // Zero-risk trades are excluded rather than reported as an infinite R.
  const rMultiple = pnl === null || riskEgp === 0 ? null : pnl / riskEgp;

  const result: TradeResult =
    pnl === null ? 'open' : pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'breakeven';

  return { positionValue, riskEgp, riskPct, pnl, rMultiple, result };
}

/** Only executed positions belong in performance statistics. */
export const isExecuted = (t: Trade) =>
  t.status === 'open' || t.status === 'closed';

export const isClosed = (t: Trade) =>
  t.status === 'closed' && t.exitDate !== null;

export type JournalSummary = {
  closedCount: number;
  openCount: number;
  plannedCount: number;
  winCount: number;
  lossCount: number;
  breakevenCount: number;
  /** Null on an empty journal — 0% would read as "you lose every trade". */
  winRate: number | null;
  totalPnl: number;
  averageR: number | null;
  /** Gross profit ÷ gross loss. Null with no losses: the ratio is unbounded. */
  profitFactor: number | null;
};

export function summarise(trades: Trade[], capital: number): JournalSummary {
  let closedCount = 0;
  let openCount = 0;
  let plannedCount = 0;
  let winCount = 0;
  let lossCount = 0;
  let breakevenCount = 0;
  let totalPnl = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  const rValues: number[] = [];

  for (const trade of trades) {
    if (trade.status === 'planned') plannedCount++;
    if (trade.status === 'open') openCount++;
    if (!isClosed(trade)) continue;

    const { pnl, rMultiple, result } = metricsOf(trade, capital);
    if (pnl === null) continue;

    closedCount++;
    totalPnl += pnl;
    if (result === 'win') {
      winCount++;
      grossProfit += pnl;
    } else if (result === 'loss') {
      lossCount++;
      grossLoss += pnl;
    } else {
      breakevenCount++;
    }
    if (rMultiple !== null) rValues.push(rMultiple);
  }

  return {
    closedCount,
    openCount,
    plannedCount,
    winCount,
    lossCount,
    breakevenCount,
    // Breakeven trades stay in the denominator — they were real, closed
    // positions — but count as neither a win nor a loss.
    winRate: closedCount === 0 ? null : winCount / closedCount,
    totalPnl,
    averageR:
      rValues.length === 0
        ? null
        : rValues.reduce((a, b) => a + b, 0) / rValues.length,
    profitFactor: grossLoss === 0 ? null : grossProfit / Math.abs(grossLoss),
  };
}
