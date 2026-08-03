/**
 * What the operator publishes and every signed-in user reads.
 *
 * Two collections with one shape: `announcements` (product news) and `signals`
 * (trade ideas). The admin console has written to both since it was built, and
 * until now nothing anywhere read them — the app does not, and neither did this
 * site, so every post went into a collection no surface consulted.
 *
 * Reads require a session, which firestore.rules enforces: these are a product
 * surface, not a marketing page, and an open read would let anyone scrape the
 * whole feed without ever installing anything.
 */

export type PostKind = 'announcements' | 'signals';

export type Post = {
  id: string;
  kind: PostKind;
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
  kind: PostKind,
  data: Record<string, unknown>
): Post {
  return {
    id,
    kind,
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
