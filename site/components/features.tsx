import { CalculatorWidget } from '@/components/calculator-widget';
import {
  ChartIcon,
  CloudIcon,
  EyeIcon,
  GaugeIcon,
  TagIcon,
  TimelineIcon,
} from '@/components/icons';
import { Card, IconChip, SectionHeader } from '@/components/section-header';

const features = [
  {
    Icon: GaugeIcon,
    title: 'درجة انضباط لكل صفقة',
    body: 'من 0 لـ 100، على خمس نقاط: تشيك ليست مكتملة، مخاطرة داخل الحد، استوب محدد، سبب مكتوب، وصورة مرفقة. بتقيس التزامك بالخطة، مش نتيجة الصفقة — صفقة خسرانة اتعملت صح بتاخد 100.',
  },
  {
    Icon: ChartIcon,
    title: 'تحليل أداء بيجاوب على أسئلة',
    body: 'التوقّع الرياضي، معامل الربح، متوسط الـ R ووسيطه، أطول سلسلة ربح وخسارة، أحسن وأوحش يوم في الأسبوع وشهر في السنة، ومتوسط مدة الاحتفاظ.',
  },
  {
    Icon: TagIcon,
    title: 'بتكسب من إيه بالظبط',
    body: 'أداء مقسّم حسب التصنيف (بريك أوت، سوينج، توزيعات…) وحسب المصدر — مين رشّح لك الصفقة وهل توصياته بتكسب فعلًا.',
  },
  {
    Icon: EyeIcon,
    title: 'قائمة مراقبة وقرار اليوم',
    body: 'أسهم بتراقبها بسعر شراء مستهدف واستوب، وشاشة بتقولك النهاردة عندك إيه: إيه اللي وصل لسعره، وإيه اللي محتاج قرار.',
  },
  {
    Icon: TimelineIcon,
    title: 'سجل مؤرخ لكل صفقة',
    body: 'ملاحظات بتاريخها على طول عمر الصفقة — «حرّكت الاستوب»، «خرجت نص الكمية» — وصور من الشارت مرفقة معاها.',
  },
  {
    Icon: CloudIcon,
    title: 'صفقاتك بترجعلك',
    body: 'كل صفقة بتتحفظ على جهازك وعلى حسابك. غيّرت التليفون أو شلت التطبيق؟ سجّل دخول ودفترك كله يرجعلك زي ما هو.',
  },
];

export function Features() {
  return (
    <section id="features" className="border-b border-border-default scroll-mt-20">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
        <SectionHeader
          eyebrow="قبل الصفقة"
          title="مش بس بيسجّل. بيمنعك من الغلطة قبل ما تحصل."
        />

        {/* The calculator is LIVE, not a picture of one.
            It is the only feature that acts BEFORE the trade, which is the
            product's actual claim — and a claim you can operate in ten seconds
            is worth more than one you have to install to evaluate. */}
        <div id="calculator" className="mt-14 scroll-mt-20">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <h3 className="text-2xl font-bold">حاسبة الحجم — جرّبها دلوقتي</h3>
            <p className="mt-3 text-fg-muted">
              انت بتحدد رأس مالك وأقصى نسبة مخاطرة تقبلها. تكتب سعر الدخول
              والاستوب، وتطلعلك أقصى كمية مسموح بيها. دي نفس المعادلة اللي
              شغّالة جوه رادار بالظبط — مش نسخة مبسّطة.
            </p>
          </div>
          <CalculatorWidget />
        </div>

        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ Icon, title, body }) => (
            <li key={title}>
              <Card className="h-full">
                <IconChip>
                  <Icon />
                </IconChip>
                <h3 className="mt-4 font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                  {body}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
