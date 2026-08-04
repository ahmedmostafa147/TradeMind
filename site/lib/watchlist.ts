/**
 * A port of lib/watchlist/watchlist_item.dart and its half of SyncCodec.
 *
 * Deliberately NOT a trade, and stored in its own collection: nothing here may
 * ever reach the journal's statistics, because a watched idea has never risked
 * money. Converting one produces a real trade with status `planned`.
 */

import { newTradeId, type Trade } from '@/lib/trade';

export type WatchPriority = 'high' | 'medium' | 'low';

export const PRIORITY_LABELS: Record<WatchPriority, string> = {
  high: 'عالية',
  medium: 'متوسطة',
  low: 'منخفضة',
};

/** Sort weight — high first. Mirrors WatchPriority.rank. */
const PRIORITY_RANK: Record<WatchPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export type WatchlistItem = {
  id: string;
  ticker: string;
  targetBuyPrice: number;
  stopPrice: number;
  reason: string;
  priority: WatchPriority;
  dateAdded: Date;
  /**
   * Who recommended it — a channel, an analyst, «تحليلي». Carried onto the
   * trade when converted, so performance can be attributed back to it.
   */
  source: string | null;
};

/** Anything else falls back to medium, exactly as WatchPriority.fromName does. */
function toPriority(value: unknown): WatchPriority {
  return value === 'high' || value === 'medium' || value === 'low'
    ? value
    : 'medium';
}

export function decodeWatchlistItem(
  data: Record<string, unknown>
): WatchlistItem | null {
  const id = typeof data.id === 'string' ? data.id : null;
  if (!id) return null;

  const num = (v: unknown) =>
    typeof v === 'number' && Number.isFinite(v) ? v : 0;

  const added =
    typeof data.dateAdded === 'string' ? new Date(data.dateAdded) : null;

  return {
    id,
    ticker: typeof data.ticker === 'string' ? data.ticker : '',
    targetBuyPrice: num(data.targetBuyPrice),
    stopPrice: num(data.stopPrice),
    reason: typeof data.reason === 'string' ? data.reason : '',
    priority: toPriority(data.priority),
    dateAdded: added && !Number.isNaN(added.getTime()) ? added : new Date(),
    source: typeof data.source === 'string' ? data.source : null,
  };
}

/** Dates as ISO strings, for the same reason trades use them. */
export function encodeWatchlistItem(
  item: WatchlistItem
): Record<string, unknown> {
  return {
    id: item.id,
    ticker: item.ticker,
    targetBuyPrice: item.targetBuyPrice,
    stopPrice: item.stopPrice,
    reason: item.reason,
    priority: item.priority,
    dateAdded: item.dateAdded.toISOString(),
    source: item.source,
  };
}

/** Highest priority first, then oldest first within a priority. */
export function sortWatchlist(items: WatchlistItem[]): WatchlistItem[] {
  return [...items].sort((a, b) => {
    const byRank = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (byRank !== 0) return byRank;
    const byDate = a.dateAdded.getTime() - b.dateAdded.getTime();
    return byDate !== 0 ? byDate : a.id.localeCompare(b.id);
  });
}

/**
 * Turns a watched idea into a PLANNED trade.
 *
 * Status `planned`, never `open`: converting is an intention, not an execution,
 * and a planned trade is excluded from every performance statistic until it is
 * actually taken. Quantity is left at zero for the trade form to size — the
 * watchlist never recorded one.
 */
export function toPlannedTrade(item: WatchlistItem): Trade {
  return {
    id: newTradeId(),
    entryDate: new Date(),
    ticker: item.ticker,
    reason: item.reason,
    entryPrice: item.targetBuyPrice,
    stopPrice: item.stopPrice,
    quantity: 0,
    exitPrice: null,
    exitDate: null,
    notes: null,
    status: 'planned',
    tags: [],
    isFavorite: false,
    completedChecklistItems: [],
    source: item.source,
    takeProfitPrice: null,
    timeline: [],
    screenshotPaths: [],
  };
}
