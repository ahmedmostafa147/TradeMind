'use client';

import { dateLabel } from '@/lib/format';
import type { Post } from '@/lib/posts';

/**
 * The feed the operator publishes into — announcements and trade ideas.
 *
 * Signals are marked, not separated into their own tab. They arrive in the same
 * stream and the reader should see them in the order they were published; a
 * second tab would hide today's idea behind a click for no gain.
 *
 * The disclaimer under a signal is not decoration. RELEASE.md requires the
 * product to state outright that it gives no investment advice so Play does not
 * classify it under the restricted financial categories, and this is the one
 * surface where the operator hands the user a specific ticker. Saying it here,
 * next to the thing it applies to, is the whole point.
 */
export function UpdatesPanel({ posts }: { posts: Post[] }) {
  if (posts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border-default p-12 text-center">
        <h2 className="text-lg font-bold">مفيش مستجدات لسه</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">
          أول ما يتنشر إعلان أو فكرة صفقة هتلاقيها هنا.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <article
          key={`${post.kind}-${post.id}`}
          className="rounded-lg border border-border-default bg-surface p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Badge kind={post.kind} />
              <h3 className="font-bold">{post.title}</h3>
            </div>
            {post.createdAt && (
              <p className="num shrink-0 text-xs text-fg-subtle">
                {dateLabel(post.createdAt)}
              </p>
            )}
          </div>

          {/* whitespace-pre-wrap: the admin console writes into a plain
              textarea, so the author's line breaks are the only structure the
              text has. Collapsing them would run a priced-out trade idea into
              one paragraph. */}
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-fg-muted">
            {post.body}
          </p>

          {post.kind === 'signals' && (
            <p className="mt-4 rounded-md border border-border-default bg-surface-low p-3 text-xs leading-relaxed text-fg-subtle">
              دي مش نصيحة استثمارية. رادار مبيقدّمش توصيات ومبينفّذش أي عملية —
              احسب مخاطرتك بنفسك قبل ما تدخل، والقرار مسؤوليتك وحدك.
            </p>
          )}
        </article>
      ))}
    </div>
  );
}

function Badge({ kind }: { kind: Post['kind'] }) {
  // Neutral, not brand and not win/loss. A trade idea is not a profit, and
  // colouring it green would borrow the one signal the money figures own.
  const isSignal = kind === 'signals';
  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
        isSignal
          ? 'border-border-strong bg-surface-highest text-fg'
          : 'border-border-default bg-surface-high text-fg-muted'
      }`}
    >
      {isSignal ? 'فكرة صفقة' : 'إعلان'}
    </span>
  );
}
