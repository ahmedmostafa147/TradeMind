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

type Tool = {
  Icon: (props: { className?: string }) => React.ReactElement;
  title: string;
  body: string;
  featured?: boolean;
  /**
   * Shows the «التطبيق بس» badge. ONLY TRUE FOR THINGS A BROWSER GENUINELY
   * CANNOT DO — currently just chart images, whose paths point into the phone's
   * own storage.
   *
   * It was also on «قراءة التوصية من صورة» and «أسعار الإغلاق», both of which
   * the website has done for a while. The badge was telling visitors to wait for
   * an unpublished app to get features they could already use.
   */
  appOnly?: boolean;
};

/**
 * Everything the app actually does, one card each.
 *
 * TYPED EXPLICITLY, not inferred. With `appOnly` on a single entry, TypeScript
 * narrows the array to a union in which most members have no such property, and
 * the render below stops compiling — the annotation is what lets an optional flag
 * be optional.
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
const groups: { stage: string; note: string; tools: Tool[] }[] = [
  {
    stage: 'قبل ما تشتري',
    note: 'القرار بيتاخد هنا، مش بعدين',
    tools: [
      {
        Icon: CalculatorIcon,
        title: 'حاسبة حجم المركز',
        body: 'رأس مالك ونسبة المخاطرة بيحدّدوا أقصى عدد أسهم مسموح. أي كمية أعلى بتتعلّم بالأحمر على طول.',
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
        // NOT appOnly. It runs in the browser too — `ai-trade-sheet.tsx` and
        // `ai-parser.ts` are a full mirror of the Dart service, and the dashboard
        // renders the sheet from its own sparkle action. The badge was sending
        // visitors to wait for an unpublished app for something they can use now.
        body: 'ترفع صورة توصية، ورادار يستخرج منها الأسعار. بمفتاحك انت، ومقفولة من غيره.',
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
        // NOT appOnly either. `use-quotes.ts` drives this in «قرار اليوم» on the
        // web through the SAME /api/quote route the phone calls — that shared
        // route exists precisely so neither surface quotes a position differently.
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
        appOnly: true,
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
        // Four, not five. The screenshot component is gone — see the note in
        // features.tsx and on lib/core/calc/risk_score.dart.
        body: 'من 0 لـ 100 على أربع نقاط. بتقيس التزامك بالخطة، مش نتيجة الصفقة.',
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
          lead="«الصفقة دي كانت قرار صح ولا لأ؟» — ده السؤال اللي كل أداة هنا موجودة عشانه، قبل الصفقة وبعدها. التسعة اللي من غير علامة شغالين من المتصفح دلوقتي."
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
                {tools.map(({ Icon, title, body, featured, appOnly }) => (
                  <li key={title}>
                    <Card className="h-full">
                      <IconChip featured={featured}>
                        <Icon />
                      </IconChip>
                      {/* Named on the card, not in a footnote. These three read
                          from the phone's own storage or its API key, so a
                          visitor who signs up on the web expecting them would
                          find out ten seconds later — which is the one-star
                          review this file's header warns about. */}
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <h4 className="font-bold">{title}</h4>
                        {appOnly && (
                          <span className="rounded-full border border-border-default bg-surface-high px-2 py-0.5 text-[11px] font-semibold text-fg-muted">
                            من التطبيق
                          </span>
                        )}
                      </div>
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
