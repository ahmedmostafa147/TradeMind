/**
 * The header every section shares: a pill label, a title, and an optional lead.
 *
 * Written once because the page's biggest structural problem was that each
 * section invented its own header — different sizes, different spacing, some
 * with an eyebrow and some without. A landing page reads as designed when the
 * same shape recurs down the scroll; it reads as assembled when it does not.
 *
 * The eyebrow is a bordered pill rather than bare coloured text. Bare text at
 * 14px sitting alone above a 48px heading has no weight of its own and looks
 * like a stray line; the pill gives it a job.
 */
export function SectionHeader({
  eyebrow,
  title,
  lead,
}: {
  eyebrow?: string;
  title: string;
  lead?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow && (
        <p className="inline-flex rounded-full border border-border-default bg-surface px-3.5 py-1.5 text-xs font-bold text-fg-muted">
          {eyebrow}
        </p>
      )}
      <h2
        className={`text-3xl font-bold tracking-normal leading-relaxed sm:text-4xl sm:leading-snug lg:text-5xl lg:leading-snug ${
          eyebrow ? 'mt-5' : ''
        }`}
      >
        {title}
      </h2>
      {lead && (
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-fg-muted">
          {lead}
        </p>
      )}
    </div>
  );
}

/**
 * The card shell the feature and tool grids share.
 *
 * `gap-px over a border-coloured background` was the old device — twelve cells
 * welded into one ruled table. It is why the page read as a spreadsheet. Real
 * gaps and a per-card border let each card be an object, and give the hover
 * state something to act on.
 */
export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`group rounded-lg border border-border-default bg-surface p-6 transition duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * The icon chip inside a card.
 *
 * Brand appears here only as a FILL, and only on hover or when featured — it is
 * a background colour in this palette, not an ink, and `on-brand` rides on top
 * of it. The resting state is a neutral chip so twelve of them in a grid do not
 * turn the section into a field of lime squares.
 */
export function IconChip({
  children,
  featured = false,
}: {
  children: React.ReactNode;
  featured?: boolean;
}) {
  return (
    <span
      className={`grid size-11 shrink-0 place-items-center rounded-md transition-colors ${
        featured
          ? 'bg-brand text-on-brand'
          : 'bg-surface-high text-fg-muted group-hover:bg-brand group-hover:text-on-brand'
      }`}
    >
      {children}
    </span>
  );
}
