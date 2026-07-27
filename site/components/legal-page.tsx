import Link from 'next/link';

/**
 * Shared shell for the legal pages: a constrained measure, a title, and a
 * last-updated line.
 *
 * The measure is capped in `ch` rather than `rem` so it tracks the font size —
 * Arabic legal text at a full container width is unreadable, and the comfort
 * range is a character count, not a pixel width.
 */
export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto max-w-[72ch] px-5 py-14 lg:py-20">
      <nav aria-label="مسار التنقل" className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
        >
          {/* Points right, because "back" in an RTL layout is toward the start
              of the reading direction. */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
            aria-hidden
          >
            <path d="m14 6 6 6-6 6" />
            <path d="M20 12H4" />
          </svg>
          الرجوع للصفحة الرئيسية
        </Link>
      </nav>

      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>

      {updatedAt && (
        <p className="mt-2 text-sm text-fg-subtle">
          آخر تحديث: <span className="num">{updatedAt}</span>
        </p>
      )}

      <div className="legal-prose mt-8">{children}</div>
    </article>
  );
}
