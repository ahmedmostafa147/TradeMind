import { site } from '@/lib/site';

/**
 * Four figures, directly under the hero.
 *
 * Every one is checkable against the source: the metric count comes from
 * JournalAnalytics plus JournalStats, the twelve tools from the list in
 * tools.tsx, the six items from ChecklistItem, and the zero from the privacy
 * policy's own "no ads, no trackers" clause. Nothing here is a growth figure,
 * because there are no users yet — see `site.userCount`, which stays hidden
 * until the number is real.
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

export function StatsStrip() {
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

        {/* Appears only once the figure exists. */}
        {site.userCount != null && (
          <p className="mt-12 text-center text-sm text-fg-muted">
            <span className="num font-bold text-fg">
              {site.userCount.toLocaleString('en-US')}
            </span>{' '}
            متداول بيسجّلوا صفقاتهم على رادار
          </p>
        )}
      </div>
    </section>
  );
}
