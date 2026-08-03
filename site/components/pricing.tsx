import { DownloadButton } from '@/components/download-button';
import { BanIcon, CheckIcon, ShieldIcon } from '@/components/icons';
import { SectionHeader } from '@/components/section-header';

/**
 * There is one tier, and it costs nothing.
 *
 * Written as a real pricing section rather than a footnote because "free" is
 * the strongest claim on the page and burying it wastes it — but it is written
 * as the CURRENT state, not as a promise of eternity. The FAQ and the privacy
 * policy both say the same thing in the same words; if this ever gains a paid
 * tier, all three change together or the legal pages start contradicting the
 * marketing.
 */
const included = [
  'كل الـ 12 أداة، من غير استثناء',
  'عدد صفقات غير محدود',
  'كل التحليلات ومنحنى رأس المال',
  'النسخة الاحتياطية السحابية',
  'التحديثات الجاية',
];

const never = [
  'مفيش إعلانات',
  'مفيش بيع لبياناتك',
  'مفيش ميزة مقفولة ورا دفع',
];

export function Pricing() {
  return (
    <section id="pricing" className="border-b border-border-default scroll-mt-20">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
        <SectionHeader
          eyebrow="السعر"
          title="مفيش باقات. فيه نسخة واحدة، وهي مجانية."
          lead="مش نسخة تجريبية بتخلص، ومش نسخة ناقصة عشان تدفع للكاملة. اللي بتحمّله هو التطبيق كامل."
        />

        <div className="mx-auto mt-14 grid max-w-4xl gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-lg bg-inverse-surface p-8 text-on-inverse-surface">
            <p className="text-sm font-semibold opacity-70">النسخة الكاملة</p>

            {/* The lime appears as a FILL — a pill — not as ink on the price.
                This card is the inverse surface, which is charcoal in the
                light theme but cream in the dark one, and lime type on cream
                is 1.01:1. A filled chip carries its own dark text and is
                correct against either. */}
            <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-2">
              <p className="flex items-baseline gap-2">
                <span className="num text-6xl font-bold">0</span>
                <span className="text-xl font-semibold">ج.م</span>
              </p>
              <span className="rounded-full bg-brand px-3 py-1 text-xs font-bold text-on-brand">
                مجاني للأبد
              </span>
            </div>
            <p className="mt-2 text-sm opacity-70">مش لفترة تجريبية</p>

            <ul className="mt-8 space-y-3">
              {included.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 opacity-70" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-8 border-t border-white/10 pt-6">
              <DownloadButton variant="inverse" className="w-full" />
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-lg border border-border-default bg-surface p-6">
              <BanIcon className="size-5 text-fg-muted" />
              <h3 className="mt-4 font-bold">ومش هيحصل</h3>
              <ul className="mt-4 space-y-2.5">
                {never.map((item) => (
                  <li
                    key={item}
                    className="text-sm text-fg-muted"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* The one place money can change hands, stated before anybody
                installs and discovers it. */}
            <div className="rounded-lg border border-border-default bg-surface-low p-6">
              <ShieldIcon className="size-5 text-fg-muted" />
              <h3 className="mt-4 font-bold">استثناء واحد نقوله بصراحة</h3>
              <p className="mt-3 text-sm leading-relaxed text-fg-muted">
                ميزة قراءة التوصية من صورة بتشتغل بمفتاح Gemini بتاعك انت، مش
                بتاعنا. لو Google حاسبتك على استخدامه، ده بينك وبينهم — إحنا
                مبناخدش منك حاجة. ومن غير المفتاح التطبيق شغّال عادي والميزة دي
                بس هي المقفولة.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
