import { readPublicStats } from '@/lib/public-stats';
import { site } from '@/lib/site';

/**
 * Four figures, directly under the hero.
 *
 * Every one is checkable against the source: the metric count comes from
 * JournalAnalytics plus JournalStats, the twelve tools from the list in
 * tools.tsx, and the six items from ChecklistItem.
 *
 * THE ONE UNDERNEATH IS THE ONLY GROWTH FIGURE ON THE SITE, and it is the only
 * one not counted from the code — it is read live from `publicStats/counts`,
 * because a growth number is the one kind that cannot be checked by reading a
 * file. See lib/public-stats.ts. The line is absent, not zeroed, whenever that
 * read comes back empty.
 *
 * DELIBERATELY UNFRAMED. This used to be a charcoal block with four bordered
 * cells and an icon in each. Sitting directly beneath the hero's framed chart
 * panel, that put two heavy filled rectangles back to back and the page read as
 * a stack of containers. The numerals are large enough to hold the eye on their
 * own; the icons were competing with them at 60% opacity and losing.
 */
const stats = [
  {
    // Three nationalities against two investor classes — the grid the exchange
    // publishes and the whole point of the market half.
    value: '6',
    label: 'فئات مستثمرين',
    detail: 'مصريين وعرب وأجانب × مؤسسات وأفراد، كل جلسة',
  },
  {
    value: '40+',
    label: 'مؤشر أداء',
    detail: 'توقّع رياضي، معامل ربح، وسيط R، سلاسل، أفضل يوم وشهر',
  },
  {
    value: '12',
    label: 'أداة',
    detail: 'من حاسبة الحجم لتحليل الأداء حسب المصدر',
  },
];

export async function StatsStrip() {
  // Awaited on the server, during prerender and each revalidation — so the
  // number ships inside the HTML. Fetching it in the browser instead would
  // trade a clean marketing page for a line that pops in after hydration and
  // shoves everything below it down.
  const published = await readPublicStats();

  return (
    <section className="border-b border-border-default">
      <div className="mx-auto max-w-5xl px-5 py-12 lg:py-16">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-3">
          {stats.map(({ value, label, detail }) => (
            <div key={label} className="text-center">
              <dd className="num text-5xl font-bold tracking-tight lg:text-6xl">
                {value}
              </dd>
              <dt className="mt-3 text-sm font-bold">{label}</dt>
              <p className="mx-auto mt-2 max-w-[24ch] text-xs leading-relaxed text-fg-muted">
                {detail}
              </p>
            </div>
          ))}
        </dl>

        {/* Appears only once the figure exists — see readPublicStats.

            IT IS EVERY ACCOUNT, WITH NO DATE ATTACHED. This carried «من 30
            أغسطس 2026» and counted only accounts created on or after it, to
            keep pre-launch development accounts out of a public figure. The
            owner's call is that the number is simply how many people are on
            Radar — and the filter turned out to be hiding real traders rather
            than hiding us, because people had signed up the day before the
            recorded launch date.

            `.num` is on the numeral ALONE and not on the paragraph. It carries
            `direction: ltr`, and putting it on Arabic prose throws the trailing
            token to the wrong end of the line — the trap in CLAUDE.md §7, which
            has already produced «‎%دخول 78.40 ج.م» once. */}
        {published !== null && (
          <p className="mt-12 text-center text-sm text-fg-muted">
            <span className="num font-bold text-fg">
              {published.userCount.toLocaleString('en-US')}
            </span>{' '}
            متداول بيسجّلوا صفقاتهم على رادار
          </p>
        )}
      </div>
    </section>
  );
}
