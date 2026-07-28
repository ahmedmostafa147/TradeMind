import { CalculatorWidget } from '@/components/calculator-widget';

const features = [
  {
    title: 'درجة انضباط لكل صفقة',
    body: 'من 0 لـ 100، على خمس نقاط: تشيك ليست مكتملة، مخاطرة داخل الحد، استوب محدد، سبب مكتوب، وصورة مرفقة. بتقيس التزامك بالخطة، مش نتيجة الصفقة — صفقة خسرانة اتعملت صح بتاخد 100.',
  },
  {
    title: 'تحليل أداء بيجاوب على أسئلة',
    body: 'التوقّع الرياضي، معامل الربح، متوسط الـ R ووسيطه، أطول سلسلة ربح وخسارة، أحسن وأوحش يوم في الأسبوع وشهر في السنة، ومتوسط مدة الاحتفاظ.',
  },
  {
    title: 'بتكسب من إيه بالظبط',
    body: 'أداء مقسّم حسب التصنيف (بريك أوت، سوينج، توزيعات…) وحسب المصدر — مين رشّح لك الصفقة وهل توصياته بتكسب فعلًا.',
  },
  {
    title: 'قائمة مراقبة وقرار اليوم',
    body: 'أسهم بتراقبها بسعر شراء مستهدف واستوب، وشاشة بتقولك النهاردة عندك إيه: إيه اللي وصل لسعره، وإيه اللي محتاج قرار.',
  },
  {
    title: 'سجل مؤرخ لكل صفقة',
    body: 'ملاحظات بتاريخها على طول عمر الصفقة — «حرّكت الاستوب»، «خرجت نص الكمية» — وصور من الشارت مرفقة معاها.',
  },
  {
    title: 'صفقاتك بترجعلك',
    body: 'كل صفقة بتتحفظ على جهازك وعلى حسابك. غيّرت التليفون أو شلت التطبيق؟ سجّل دخول ودفترك كله يرجعلك زي ما هو.',
  },
];

export function Features() {
  return (
    <section id="features" className="border-b border-border-default scroll-mt-20">
      <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
        <h2 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
          مش بس بيسجّل. بيمنعك من الغلطة قبل ما تحصل.
        </h2>

        {/* The calculator is LIVE, not a picture of one.
            It is the only feature that acts BEFORE the trade, which is the
            product's actual claim — and a claim you can operate in ten seconds
            is worth more than one you have to install to evaluate. */}
        <div
          id="calculator"
          className="mt-10 scroll-mt-20"
        >
          <div className="mb-6 max-w-2xl">
            <h3 className="text-xl font-bold">حاسبة الحجم — جرّبها دلوقتي</h3>
            <p className="mt-3 text-fg-muted">
              انت بتحدد رأس مالك وأقصى نسبة مخاطرة تقبلها. تكتب سعر الدخول
              والاستوب، وتطلعلك أقصى كمية مسموح بيها. دي نفس المعادلة اللي
              شغّالة جوه التطبيق بالظبط — مش نسخة مبسّطة.
            </p>
          </div>
          <CalculatorWidget />
        </div>

        <ul className="mt-6 grid gap-px overflow-hidden rounded-lg border border-border-default bg-border-default sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <li key={feature.title} className="bg-surface p-6">
              <h3 className="font-bold">{feature.title}</h3>
              <p className="mt-2 text-sm text-fg-muted">{feature.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
