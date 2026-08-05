import { SectionHeader } from '@/components/section-header';

/**
 * Native <details>/<summary>, not a JS accordion: it is keyboard accessible,
 * screen-reader correct, findable by the browser's own in-page search, and
 * works before hydration. A custom accordion would have to re-earn all four.
 */
export const faq = [
  {
    q: 'التطبيق مجاني فعلًا؟',
    a: 'أيوه، مجاني بالكامل. مفيش اشتراكات، مفيش نسخة مدفوعة، ومفيش إعلانات ولا أدوات تتبّع.',
  },
  {
    q: 'لازم أعمل حساب؟',
    a: 'أيوه. التطبيق بيشتغل بحساب، عشان صفقاتك تتحفظ ليك وترجعلك لو غيّرت أو فقدت التليفون، وعشان تقدر تفتحها من المتصفح كمان. التسجيل مجاني وبياخد أقل من دقيقة، بالإيميل أو بحساب جوجل.',
  },
  {
    // The app is not on Play yet, so for every visitor arriving today the
    // browser is not an alternative to the product — it IS the product. The
    // page said nothing about that anywhere, which left the most likely
    // question of all unanswered.
    //
    // The three exclusions are exact, not hedging: chart images are absolute
    // paths inside the phone's own storage (only the paths sync), closing
    // prices have no web fetch at all, and the Gemini key lives in app
    // settings. Naming them here is cheaper than a one-star review from
    // somebody who signed up expecting them.
    q: 'أقدر أستخدمه من المتصفح من غير ما أستنى التطبيق؟',
    a: 'أيوه، والموقع شغّال دلوقتي. تقدر تسجّل صفقاتك وتعدّلها وتمسحها، وتمشّي قائمة المراقبة، وتشوف قرار اليوم وكل التحليلات ودرجة الانضباط، وتظبط رأس مالك ونسبة المخاطرة — وكله بيتحفظ على حسابك، فلما التطبيق ينزل هتلاقي دفترك كامل مستنيك. تلات حاجات بس بتشتغل من التطبيق على التليفون: إرفاق صور الشارت، أسعار الإغلاق، وقراءة التوصية من صورة.',
  },
  {
    q: 'بياناتي بتروح فين؟',
    a: 'صفقاتك بتتخزّن على جهازك وعلى حسابك انت. قواعد الأمان على السيرفر بتمنع أي مستخدم تاني من قراءتها أو تعديلها — كل حساب بيوصل لبياناته هو بس. وتقدر تمسح حسابك وكل بياناته من داخل التطبيق أو من الموقع في أي وقت.',
  },
  {
    q: 'بيشتغل من غير نت؟',
    a: 'أول تسجيل دخول محتاج إنترنت. بعد كده التطبيق بيفتح أوفلاين عادي، والتسجيل والحسابات والتحليلات كلها شغّالة من غير نت. الحاجات اللي بتحتاج اتصال هي أسعار الإغلاق، ورفع النسخة الاحتياطية، وقراءة التوصية من صورة.',
  },
  {
    q: 'التطبيق بيقولي أشتري إيه؟',
    a: 'لأ، وده مش هدفه أصلًا. رادار مبيقدّمش نصائح ولا توصيات استثمارية، ومبيتصلش بأي وسيط أو حساب تداول. دوره إنه يسجّل قراراتك انت ويحسبلك المخاطرة قبل ما تدخل.',
  },
  {
    q: 'ميزة قراءة التوصية من صورة بتشتغل إزاي؟',
    a: 'بتحط مفتاح Gemini بتاعك انت في إعدادات التطبيق، وبيتخزّن على جهازك. الصورة بتتبعت لخدمة Google وقت الاستخدام بس، ومش بتتخزّن على أي سيرفر بتاعنا. من غير المفتاح الميزة بتبقى مقفولة ومفيش أي صورة بتخرج من جهازك.',
  },
  {
    q: 'بيدعم البيع على المكشوف أو أسواق تانية؟',
    a: 'لأ في النسخة الحالية. التطبيق مصمّم للبورصة المصرية وللمراكز الشرائية (long) بس.',
  },
  {
    q: 'فيه نسخة لـ iPhone؟',
    a: 'حاليًا أندرويد بس. الكود نفسه مش مرتبط بمنصة معيّنة، فإضافة iOS ممكنة من غير تغيير في المنطق.',
  },
];

export function Faq() {
  return (
    <section id="faq" className="border-b border-border-default scroll-mt-20">
      <div className="mx-auto max-w-3xl px-5 py-20 lg:py-28">
        <SectionHeader eyebrow="أسئلة" title="أسئلة شائعة" />

        {/* Each question is its own card rather than a row between hairlines.
            A ruled list of eight makes the open one look like every closed one;
            a card that lifts and brightens when it opens shows which question
            is being answered without the reader having to find the boundary. */}
        <div className="mt-12 space-y-3">
          {faq.map((item) => (
            <details
              key={item.q}
              className="group rounded-lg border border-border-default bg-surface transition-colors open:bg-surface-low hover:border-border-strong"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-semibold [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  className="grid size-7 shrink-0 place-items-center rounded-full border border-border-default bg-surface text-fg-muted transition-transform duration-200 group-open:rotate-45"
                  aria-hidden
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    className="size-3.5"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </summary>
              <p className="border-t border-border-default px-5 py-4 leading-relaxed text-fg-muted">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
