'use client';

import { dateLabel } from '@/lib/format';
import type { Post } from '@/lib/posts';

/**
 * The feed the operator publishes into — product announcements.
 *
 * Trade ideas used to arrive in this same stream, badged «فكرة صفقة» and
 * carrying a disclaimer. Both the feature and that disclaimer are gone: see the
 * note in lib/posts.ts for why a per-post disclaimer could not reconcile a
 * priced-out ticker with a product that states outright it gives no
 * recommendations. With one kind of post left there is nothing to badge, so the
 * badge went too rather than labelling every row «إعلان» to no purpose.
 */
export function UpdatesPanel({ posts }: { posts: Post[] }) {
  if (posts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border-default p-12 text-center">
        <h2 className="text-lg font-bold">مفيش مستجدات لسه</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">
          أول ما يتنشر إعلان هتلاقيه هنا.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <article
          key={post.id}
          className="rounded-lg border border-border-default bg-surface p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3 className="font-bold">{post.title}</h3>
            {post.createdAt && (
              <p className="num shrink-0 text-xs text-fg-subtle">
                {dateLabel(post.createdAt)}
              </p>
            )}
          </div>

          {/* whitespace-pre-wrap: the admin console writes into a plain
              textarea, so the author's line breaks are the only structure the
              text has. Collapsing them would run a multi-paragraph note into
              one block. */}
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-fg-muted">
            {post.body}
          </p>
        </article>
      ))}
    </div>
  );
}
