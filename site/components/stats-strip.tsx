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
    value: '40+',
    label: 'مؤشر أداء',
    detail: 'توقّع رياضي، معامل ربح، وسيط R، سلاسل، أفضل يوم وشهر',
  },
  {
    value: '12',
    label: 'أداة',
    detail: 'من حاسبة الحجم لتحليل الأداء حسب المصدر',
  },
  {
    value: '6',
    label: 'بنود قبل كل صفقة',
    detail: 'تشيك ليست لازم تعدّيها قبل ما تحفظ',
  },
  {
    // The one figure that is a promise rather than a count, and the only one a
    // user can verify by watching their own network traffic.
    value: '0',
    label: 'إعلانات ومتتبّعات',
    detail: 'مفيش تتبّع، مفيش تحليلات استخدام، مفيش معرّف إعلاني',
  },
];

export function StatsStrip() {
  return (
    <section className="border-b border-border-default">
      <div className="mx-auto max-w-6xl px-5 py-14 lg:py-20">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-12 lg:grid-cols-4">
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
