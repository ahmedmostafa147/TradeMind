import {
  CalculatorIcon,
  CalendarIcon,
  ChartIcon,
  ChecklistIcon,
  CloudIcon,
  EyeIcon,
  GaugeIcon,
  ImageIcon,
  SparkIcon,
  TagIcon,
  TimelineIcon,
} from '@/components/icons';
import { Card, IconChip, SectionHeader } from '@/components/section-header';

/**
 * Everything the app actually does, one card each.
 *
 * Each entry maps to real code — the file is named so a claim here can be
 * checked rather than taken on trust. Nothing on this list is planned,
 * partial, or coming soon; a marketing page that lists a feature the build
 * does not have is the fastest way to earn a one-star review that is entirely
 * deserved.
 *
 * GROUPED BY WHEN YOU USE THEM, not dumped in one wall.
 * Twelve identical cards in a flat grid is a list the eye slides off — there is
 * no entry point and no reason for any card to come before another. The three
 * stages are also the section's own argument: the product claims to act BEFORE
 * the trade as well as after it, and a reader can now see that claim in the
 * shape of the section instead of having to take the headline's word for it.
 */
const groups = [
  {
    stage: 'قبل ما تشتري',
    note: 'القرار بيتاخد هنا، مش بعدين',
    tools: [
      {
        Icon: CalculatorIcon,
        title: 'حاسبة حجم المركز',
        body: 'رأس مالك ونسبة المخاطرة بيحدّدوا أقصى عدد أسهم مسموح. أي كمية أعلى بتتعلّم بالأحمر لحظيًا.',
        featured: true,
      },
      {
        Icon: ChecklistIcon,
        title: 'تشيك ليست ما قبل الصفقة',
        body: 'ستة بنود لازم تعدّيها: الاتجاه، الدعم والمقاومة، الحجم، المخاطرة، حجم المركز، الأخبار.',
      },
      {
        Icon: EyeIcon,
        title: 'قائمة مراقبة',
        body: 'أسهم بتراقبها بسعر شراء مستهدف واستوب وأولوية، جاهزة تتحوّل لصفقة.',
      },
      {
        Icon: SparkIcon,
        title: 'قراءة التوصية من صورة',
        body: 'ترفع صورة توصية، والتطبيق يستخرج منها الأسعار. بمفتاحك انت، ومقفولة من غيره.',
      },
    ],
  },
  {
    stage: 'وانت ماسك الصفقة',
    note: 'اللي بيحصل بين الدخول والخروج',
    tools: [
      {
        Icon: CalendarIcon,
        title: 'قرار اليوم',
        body: 'شاشة بتقولك النهاردة عندك إيه: إيه اللي وصل لسعره، وإيه اللي محتاج قرار.',
      },
      {
        Icon: ChartIcon,
        title: 'أسعار الإغلاق',
        body: 'آخر إغلاق للسهم من البورصة المصرية، وربح وخسارة غير محققة للمراكز المفتوحة.',
      },
      {
        Icon: TimelineIcon,
        title: 'تايم لاين لكل صفقة',
        body: 'ملاحظات بتاريخها على طول عمر الصفقة — «حرّكت الاستوب»، «خرجت نص الكمية».',
      },
      {
        Icon: ImageIcon,
        title: 'صور الشارت',
        body: 'ترفق لقطات بالصفقة، بتتنسخ لمجلد التطبيق ومبتترفعش لأي مكان.',
      },
    ],
  },
  {
    stage: 'بعد ما تقفل',
    note: 'الجزء اللي بيخلّيك تتعلّم',
    tools: [
      {
        Icon: GaugeIcon,
        title: 'درجة الانضباط',
        body: 'من 0 لـ 100 على خمس نقاط. بتقيس التزامك بالخطة، مش نتيجة الصفقة.',
      },
      {
        Icon: ChartIcon,
        title: 'منحنى رأس المال',
        body: 'رأس مالك بيتحرك إزاي مع الوقت، نقطة لكل صفقة مقفولة.',
      },
      {
        Icon: TagIcon,
        title: 'أداء حسب التصنيف والمصدر',
        body: 'بريك أوت ولا سوينج بيكسب أكتر؟ ومين رشّح لك الصفقة، وتوصياته بتكسب فعلًا ولا لأ.',
      },
      {
        Icon: CloudIcon,
        title: 'صفقاتك بترجعلك',
        body: 'محفوظة على جهازك وعلى حسابك. غيّرت التليفون؟ سجّل دخول ودفترك يرجع زي ما هو.',
      },
    ],
  },
];

export function Tools() {
  return (
    <section id="tools" className="border-b border-border-default scroll-mt-20">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
        <SectionHeader
          eyebrow="الأدوات"
          title="12 أداة، كلها بتخدم سؤال واحد."
          lead="«الصفقة دي كانت قرار صح ولا لأ؟» — كل حاجة في التطبيق موجودة عشان تجاوب على ده، قبل الصفقة وبعدها."
        />

        <div className="mt-16 space-y-14">
          {groups.map(({ stage, note, tools }) => (
            <div key={stage}>
              {/* A rule that runs off both ends of the label, so the stage
                  reads as a divider in a sequence rather than as a third
                  heading level competing with the section title. */}
              <div className="flex items-center gap-4">
                <h3 className="shrink-0 text-lg font-bold">{stage}</h3>
                <span className="text-sm text-fg-subtle">{note}</span>
                <span
                  className="h-px flex-1 bg-border-default"
                  aria-hidden
                />
              </div>

              <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {tools.map(({ Icon, title, body, featured }) => (
                  <li key={title}>
                    <Card className="h-full">
                      <IconChip featured={featured}>
                        <Icon />
                      </IconChip>
                      <h4 className="mt-4 font-bold">{title}</h4>
                      <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                        {body}
                      </p>
                    </Card>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
