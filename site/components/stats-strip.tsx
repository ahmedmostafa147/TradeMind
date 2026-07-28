import { BanIcon, ChartIcon, ChecklistIcon, OfflineIcon } from '@/components/icons';
import { site } from '@/lib/site';

/**
 * Four numbers, directly under the hero.
 *
 * Every one is checkable against the source: the metric count comes from
 * JournalAnalytics plus JournalStats, the six items from ChecklistItem, and
 * the two zeroes from the privacy policy's own "no ads, no analytics" clause.
 * Nothing here is a growth figure, because there are no users yet — see
 * `site.userCount`, which stays hidden until the number is real.
 *
 * Rendered as a charcoal block against the paper canvas. It is the first
 * inversion on the page, and it is here so the eye has somewhere to land after
 * the hero rather than falling into another stretch of off-white.
 */
const stats = [
  {
    value: '40+',
    label: 'مؤشر أداء',
    detail: 'توقّع رياضي، معامل ربح، وسيط R، سلاسل، أفضل يوم وشهر',
    Icon: ChartIcon,
  },
  {
    value: '6',
    label: 'بنود قبل كل صفقة',
    detail: 'تشيك ليست لازم تعدّيها قبل ما تحفظ',
    Icon: ChecklistIcon,
  },
  {
    value: '0',
    label: 'إعلانات ومتتبّعات',
    detail: 'مفيش تتبّع، مفيش تحليلات استخدام، مفيش معرّف إعلاني',
    Icon: BanIcon,
  },
  {
    value: '100%',
    label: 'شغّال أوفلاين',
    detail: 'التسجيل والحسابات والتحليلات من غير إنترنت',
    Icon: OfflineIcon,
  },
];

export function StatsStrip() {
  return (
    <section className="border-b border-border-default">
      <div className="mx-auto max-w-6xl px-5 py-10 lg:py-14">
        <div className="overflow-hidden rounded-lg bg-inverse-surface text-on-inverse-surface">
          <dl className="grid grid-cols-1 divide-y divide-white/10 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-x-reverse lg:divide-y-0">
            {stats.map(({ value, label, detail, Icon }) => (
              <div key={label} className="p-6">
                {/* NOT text-brand. The inverse surface flips with the theme —
                    charcoal in light, cream in dark — so lime ink here reads
                    1.01:1 for anyone on a dark device. Inside an inverted
                    block the only safe ink is onInverseSurface. */}
                <Icon className="size-5 opacity-60" />
                <dd className="num mt-4 text-3xl font-bold">{value}</dd>
                <dt className="mt-1 text-sm font-semibold">{label}</dt>
                <p className="mt-2 text-xs leading-relaxed opacity-70">
                  {detail}
                </p>
              </div>
            ))}
          </dl>
        </div>

        {/* Appears only once the figure exists. */}
        {site.userCount != null && (
          <p className="mt-4 text-center text-sm text-fg-muted">
            <span className="num font-bold text-fg">
              {site.userCount.toLocaleString('en-US')}
            </span>{' '}
            متداول بيسجّلوا صفقاتهم على TradePilot
          </p>
        )}
      </div>
    </section>
  );
}
