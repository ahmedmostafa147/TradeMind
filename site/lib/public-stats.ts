/**
 * The one figure the landing page publishes about itself.
 *
 * `publicStats/counts` in Firestore holds how many accounts have been created
 * since `site.launchedAt`, plus a server-stamped `updatedAt`. An admin writes
 * it from /admin; firestore.rules lets anybody read it and only an admin write
 * it, and the reasoning for both halves is in that file.
 *
 * ── WHY THE REST API AND NOT THE FIREBASE SDK ───────────────────────────────
 *
 * The landing page is the page whose entire job is to convince somebody in the
 * first few seconds. Importing lib/firebase.ts to read ONE INTEGER would pull
 * firebase/app and firebase/firestore in behind it — a six-figure byte count of
 * SDK to fetch a number smaller than this sentence. The REST endpoint is a plain
 * GET with the project's public API key, which is the same key already shipped
 * in the client bundle on the dashboard and is not a secret (see the note at the
 * top of lib/firebase.ts).
 *
 * It also means this runs on the SERVER during prerender and revalidation, so
 * the number is in the delivered HTML: no loading state, no layout shift, and
 * nothing for a visitor's browser to do.
 *
 * ── AND WHY THE COUNT IS NOT COMPUTED HERE ──────────────────────────────────
 *
 * Counting users means reading every user document, and the rules do not grant
 * an anonymous reader a single one of them — nor should they. Even with a
 * service account it would be the wrong shape: N document reads per visitor, so
 * the bill grows with users multiplied by traffic, for a number that changes a
 * few times a day. One document, cached, is the whole point.
 */

import { site } from '@/lib/site';

/**
 * Mirrors the fallbacks in lib/firebase.ts.
 *
 * The env var NAMES are the same, so pointing the site at a staging project
 * moves both together. Only the defaults are written twice, and importing
 * firebase.ts to share them would drag the SDK in — which is the one thing this
 * module exists to avoid.
 */
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'trademind-6222c';
const API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??
  'AIzaSyA4vBu8r2qD-nVs3Nd1l2-SMoSI7frtB9M';

const ENDPOINT =
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}` +
  '/databases/(default)/documents/publicStats/counts';

/**
 * How long a rendered page may keep the figure before Next fetches it again.
 *
 * An hour, because the number moves in single digits per day and the page is
 * cached at the edge either way. It is also the ceiling on how often this is
 * requested at all: one upstream read per hour per region, regardless of how
 * many people visit.
 */
const REVALIDATE_SECONDS = 3600;

export type PublicStats = {
  /** Accounts created on or after `site.launchedAt`. */
  userCount: number;
  /** The cutoff the count was taken from, as stored. YYYY-MM-DD. */
  since: string;
  /** When an admin last published it. Server clock — see firestore.rules. */
  updatedAt: Date | null;
};

/**
 * Reads one Firestore field out of the REST shape.
 *
 * The REST API tags every value with its type, and A WHOLE NUMBER ARRIVES AS
 * EITHER `integerValue` OR `doubleValue` depending on how the writing SDK
 * serialised it — the same disagreement firestore.rules documents on
 * `waitingThresholdDays`, and the reason the rule says `is number` rather than
 * `is int`. Reading only one of the two would work until the day the other
 * turned up, and then show nothing with no error.
 *
 * `integerValue` is additionally a STRING in the REST payload, which is why
 * this cannot just index the object and hope.
 */
function readNumber(field: unknown): number | null {
  if (!field || typeof field !== 'object') return null;
  const f = field as Record<string, unknown>;

  if (typeof f.integerValue === 'string') {
    const parsed = Number(f.integerValue);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof f.integerValue === 'number') return f.integerValue;
  if (typeof f.doubleValue === 'number') return f.doubleValue;
  return null;
}

function readString(field: unknown): string | null {
  if (!field || typeof field !== 'object') return null;
  const f = field as Record<string, unknown>;
  return typeof f.stringValue === 'string' ? f.stringValue : null;
}

function readTimestamp(field: unknown): Date | null {
  const raw = (() => {
    if (!field || typeof field !== 'object') return null;
    const f = field as Record<string, unknown>;
    return typeof f.timestampValue === 'string' ? f.timestampValue : null;
  })();
  if (raw === null) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * The published figure, or null.
 *
 * NULL IS A SUPPORTED ANSWER AND NOT AN ERROR, and every caller must treat it
 * as one — the document does not exist until an admin has opened /admin once,
 * and the landing page has to render perfectly well before that happens. It is
 * also what a network failure during a build returns, which is deliberate: a
 * marketing line is not worth failing a deploy over, and a hidden line is a
 * strictly better outcome than a page that does not ship.
 *
 * The count is validated rather than cast. A malformed document renders no line
 * at all, because the failure mode of trusting it is a wrong number stated
 * confidently on a public page — which is the exact thing typing the number by
 * hand used to risk, and the reason it stopped being typed by hand.
 */
export async function readPublicStats(): Promise<PublicStats | null> {
  try {
    const response = await fetch(`${ENDPOINT}?key=${API_KEY}`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });

    // 404 is the ordinary "not published yet" answer, not a fault.
    if (!response.ok) return null;

    const body: unknown = await response.json();
    if (!body || typeof body !== 'object') return null;

    const fields = (body as Record<string, unknown>).fields;
    if (!fields || typeof fields !== 'object') return null;
    const f = fields as Record<string, unknown>;

    const userCount = readNumber(f.userCount);
    if (userCount === null || userCount < 0 || !Number.isFinite(userCount)) {
      return null;
    }

    return {
      userCount: Math.floor(userCount),
      since: readString(f.since) ?? site.launchedAt,
      updatedAt: readTimestamp(f.updatedAt),
    };
  } catch {
    return null;
  }
}
