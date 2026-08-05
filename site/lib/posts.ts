/**
 * What the operator publishes and every signed-in user reads: product news,
 * from the `announcements` collection.
 *
 * Reads require a session, which firestore.rules enforces: this is a product
 * surface, not a marketing page, and an open read would let anyone scrape the
 * whole feed without ever installing anything.
 *
 * THERE WAS A SECOND COLLECTION, `signals`, AND IT IS GONE ON PURPOSE.
 * It carried trade ideas — a ticker with an entry price and a stop, published
 * by the operator to every user. That is a recommendation however it is
 * labelled, and it contradicted the product outright: `disclaimer` in site.ts
 * says «التطبيق لا يقدّم نصائح أو توصيات استثمارية», the terms repeat it, and
 * the FAQ answers «التطبيق بيقولي أشتري إيه؟» with a flat no. A per-post
 * disclaimer under a priced-out idea does not reconcile those — it sits under
 * the thing it contradicts. RELEASE.md wants the no-advice claim stated so Play
 * keeps the app out of its restricted financial categories, and handing out
 * tickers is also the FRA licensing exposure CLAUDE.md already recorded as a
 * decided no.
 *
 * Do not reintroduce it without changing the legal pages FIRST, and taking
 * advice on whether they can say that at all.
 */

export type Post = {
  id: string;
  title: string;
  body: string;
  createdAt: Date | null;
};

/**
 * The admin console writes `createdAt` with serverTimestamp(), so this side
 * gets a Firestore Timestamp — not the ISO string the trade codec uses. Both
 * shapes are accepted rather than assuming one: a post written by some future
 * surface that stores a string must not silently lose its date.
 */
export function toDate(value: unknown): Date | null {
  if (value && typeof value === 'object' && 'toDate' in value) {
    try {
      return (value as { toDate: () => Date }).toDate();
    } catch {
      return null;
    }
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

export function decodePost(
  id: string,
  data: Record<string, unknown>
): Post {
  return {
    id,
    title: typeof data.title === 'string' ? data.title : '',
    body: typeof data.body === 'string' ? data.body : '',
    createdAt: toDate(data.createdAt),
  };
}

/**
 * Newest first, with undated posts last.
 *
 * A post written a moment ago briefly has a null `createdAt` — Firestore
 * resolves serverTimestamp() on the server, so the local snapshot sees null
 * until it round-trips. Sorting those to the end rather than the front keeps a
 * half-written post from displacing the real newest one.
 */
export function sortPosts(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => {
    if (a.createdAt === null && b.createdAt === null) return 0;
    if (a.createdAt === null) return 1;
    if (b.createdAt === null) return -1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}
