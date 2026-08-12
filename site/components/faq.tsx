import { SectionHeader } from '@/components/section-header';

/**
 * Native <details>/<summary>, not a JS accordion: it is keyboard accessible,
 * screen-reader correct, findable by the browser's own in-page search, and
 * works before hydration. A custom accordion would have to re-earn all four.
 */
export const faq = [
  {
    // The old answer split the product into free and paid and named four paid
    // surfaces. All four are open now — see EVERYTHING_FREE in lib/subscription.ts.
    q: 'إيه اللي مجاني وإيه اللي بفلوس؟',
    a: 'كل حاجة مجانية دلوقتي، من غير اشتراك ومن غير بطاقة: تدفّقات السوق، وأسعار الإغلاق، وقراءة التوصيات بالذكاء الاصطناعي، وشاشات الأداء والتحليلات، وطبعًا تسجيل الصفقات وحاسبة الصفقة وحاسبة الهدف. رادار لسه في مرحلة مبكرة، ولو بقى فيه اشتراك بعدين هنقول قبلها بوقت كافي — واللي سجّلته يفضل ليك في الحالتين. ومفيش إعلانات ولا أدوات تتبّع.',
  },
  {
    // The market half had no FAQ entry at all, and it is the half that raises
    // the "where does this come from" question hardest — a number about who
    // moved the market is worth nothing if its source is unstated.
    q: 'بيانات مين اشترى ومين باع دي جايه منين؟',
    a: 'من البورصة المصرية نفسها — هي بتنشر كل جلسة قيمة الشراء والبيع مقسّمة حسب جنسية المستثمر (مصري، عربي، أجنبي) وحسب نوعه (مؤسسة ولا فرد). إحنا بنعرضها زي ما هي من غير أي تعديل أو تفسير، ومعاها تاريخ الجلسات السابقة عشان تشوف الاتجاه. دي وقائع عن اللي حصل، مش تحليل ولا توصية.',
  },
  {
    q: 'لازم أعمل حساب؟',
    a: 'أيوه. رادار بيشتغل بحساب، عشان صفقاتك تتحفظ ليك وترجعلك لو غيّرت أو فقدت التليفون، وعشان تقدر تفتحها من المتصفح كمان. التسجيل مجاني وبياخد أقل من دقيقة، بالإيميل أو بحساب جوجل.',
  },
  {
    // The app is not on Play yet, so for every visitor arriving today the
    // browser is not an alternative to the product — it IS the product. The
    // page said nothing about that anywhere, which left the most likely
    // question of all unanswered.
    //
    // ONE EXCLUSION, AND IT USED TO CLAIM THREE.
    //
    // The comment here said closing prices "have no web fetch at all" and that
    // the Gemini key "lives in app settings". Both stopped being true and nobody
    // came back to this answer: `use-quotes.ts` fetches prices through the same
    // /api/quote route the phone uses, and `ai-parser.ts` + `gemini-key.ts` run
    // the reader in the browser against a key in localStorage.
    //
    // So the page was telling visitors to wait for an UNPUBLISHED app to get two
    // features they could already use. Naming a real limit is cheaper than a
    // one-star review; naming two invented ones just loses the signup.
    //
    // Chart images are the genuine exclusion — absolute paths inside the phone's
    // own storage, with only the paths syncing.
    q: 'أقدر أستخدمه من المتصفح من غير ما أستنى التطبيق؟',
    a: 'أيوه، والموقع شغّال دلوقتي. تقدر تسجّل صفقاتك وتعدّلها وتمسحها، وتمشّي قائمة المراقبة، وتشوف قرار اليوم وأسعار الإغلاق وكل التحليلات ودرجة الانضباط، وتقرا التوصية من صورة، وتظبط رأس مالك ونسبة المخاطرة — وكله بيتحفظ على حسابك، فلما التطبيق ينزل هتلاقي دفترك كامل مستنيك. حاجة واحدة بس محتاجة التطبيق على التليفون: إرفاق صور الشارت، لأنها متخزّنة على الجهاز نفسه.',
  },
  {
    q: 'بياناتي بتروح فين؟',
    a: 'صفقاتك بتتخزّن على جهازك وعلى حسابك انت. قواعد الأمان على السيرفر بتمنع أي مستخدم تاني من قراءتها أو تعديلها — كل حساب بيوصل لبياناته هو بس. وتقدر تمسح حسابك وكل بياناته من داخل التطبيق أو من الموقع في أي وقت.',
  },
  {
    q: 'بيشتغل من غير نت؟',
    a: 'أول تسجيل دخول محتاج إنترنت. بعد كده تطبيق التليفون بيفتح أوفلاين عادي، والتسجيل والحسابات والتحليلات كلها شغّالة من غير نت. الحاجات اللي بتحتاج اتصال هي أسعار الإغلاق، ورفع النسخة الاحتياطية، وقراءة التوصية من صورة.',
  },
  {
    q: 'رادار بيقولي أشتري إيه؟',
    a: 'لأ، وده مش هدفه أصلًا. رادار مبيقدّمش نصائح ولا توصيات استثمارية، ومبيتصلش بأي وسيط أو حساب تداول. دوره إنه يسجّل قراراتك انت ويحسبلك المخاطرة قبل ما تدخل.',
  },
  {
    // «إعدادات التطبيق» before this, which is only half of where the key lives:
    // the browser keeps it in localStorage (`gemini-key.ts`) exactly as the phone
    // keeps it in Hive. Naming one surface implied the feature belongs to it —
    // the same mistake the «تلات حاجات» answer above was making.
    q: 'ميزة قراءة التوصية من صورة بتشتغل إزاي؟',
    a: 'بتحط مفتاح Gemini بتاعك انت في الإعدادات، وبيتخزّن على جهازك انت — على التليفون أو في المتصفح، وميتزامنش بينهم. الصورة بتتبعت لخدمة Google وقت الاستخدام بس، ومش بتتخزّن على أي سيرفر بتاعنا. من غير المفتاح الميزة بتبقى مقفولة ومفيش أي صورة بتخرج من جهازك.',
  },
  {
    q: 'بيدعم البيع على المكشوف أو أسواق تانية؟',
    a: 'لأ في النسخة الحالية. رادار مصمّم للبورصة المصرية وللمراكز الشرائية (long) بس.',
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
