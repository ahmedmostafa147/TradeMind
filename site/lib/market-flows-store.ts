'use client';

/**
 * Reading and writing the stored EGX sessions.
 *
 * Kept apart from lib/market-flows.ts so that file stays pure and testable
 * without Firebase — everything here touches Firestore, nothing here parses.
 */

import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { firestore } from '@/lib/firebase';
import {
  CLASSES,
  NATIONALITIES,
  type FlowTable,
  type MarketFlows,
} from '@/lib/market-flows';

export type StoredFlows = MarketFlows & { scope: string };

/**
 * Rebuilds a document into a MarketFlows, or returns null.
 *
 * Validated field by field rather than cast, for the same reason decodeTrade
 * is: this data is rendered as money with a direction, and a missing
 * nationality that defaulted to zero would read as «الأجانب ما اشتروش النهاردة»
 * — a confident statement about the market that nobody made.
 */
export function decodeFlows(data: Record<string, unknown>): StoredFlows | null {
  const date = typeof data.date === 'string' ? data.date : null;
  if (date === null) return null;

  const table = (value: unknown): FlowTable | null => {
    if (!value || typeof value !== 'object') return null;
    const row = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};

    for (const nationality of NATIONALITIES) {
      const cell = row[nationality];
      if (!cell || typeof cell !== 'object') return null;
      const c = cell as Record<string, unknown>;
      if (
        typeof c.bought !== 'number' ||
        typeof c.sold !== 'number' ||
        typeof c.net !== 'number'
      ) {
        return null;
      }
      out[nationality] = {
        bought: c.bought,
        sold: c.sold,
        net: c.net,
        netMismatch: c.netMismatch === true,
      };
    }
    return out as unknown as FlowTable;
  };

  const all = table(data.all);
  const institutions = table(data.institutions);
  const individuals = table(data.individuals);
  if (!all || !institutions || !individuals) return null;

  return {
    date,
    all,
    institutions,
    individuals,
    scope: typeof data.scope === 'string' ? data.scope : 'Securities',
  };
}

/**
 * The most recent sessions, newest first.
 *
 * Ordered by document id — the id IS the date in YYYY-MM-DD, which sorts
 * lexicographically in true chronological order and needs no index. Ordering by
 * a `date` field would demand a composite index for the same result.
 */
export async function loadRecentFlows(count = 30): Promise<StoredFlows[]> {
  const snap = await getDocs(
    query(
      collection(firestore(), 'marketFlows'),
      orderBy('__name__', 'desc'),
      limit(count)
    )
  );

  return snap.docs
    .map((d) => decodeFlows(d.data()))
    .filter((f): f is StoredFlows => f !== null);
}

/**
 * Stores one session, keyed by its own date so a re-run of the same day
 * overwrites rather than duplicating — the exchange revises figures during the
 * session, and the last read of a day is the right one.
 */
export async function saveFlows(
  flows: MarketFlows,
  scope: string
): Promise<void> {
  await setDoc(doc(firestore(), 'marketFlows', flows.date), {
    date: flows.date,
    scope,
    all: flows.all,
    institutions: flows.institutions,
    individuals: flows.individuals,
    fetchedAt: serverTimestamp(),
    source: 'egx.com.eg/investorstypepiechart',
  });
}

/** Fetches today's session through the API route. Throws with the server's own reason. */
export async function fetchFlowsFromApi(
  scope: 'Securities' | 'All' | 'Bonds' = 'Securities'
): Promise<MarketFlows> {
  // Trailing slash deliberate. next.config.ts sets `trailingSlash: true`, so
  // `/api/egx-flows?scope=…` answers 308 to the slashed form — harmless, since
  // fetch follows it, but it doubles a request that already waits on a slow
  // origin behind two more.
  const response = await fetch(`/api/egx-flows/?scope=${scope}`);
  const payload = (await response.json()) as
    | { ok: true; flows: MarketFlows }
    | { ok: false; reason?: string };

  if (!response.ok || !payload.ok) {
    throw new Error(
      ('reason' in payload && payload.reason) ||
        `تعذّر جلب البيانات (HTTP ${response.status}).`
    );
  }
  return payload.flows;
}

export { CLASSES, NATIONALITIES };
