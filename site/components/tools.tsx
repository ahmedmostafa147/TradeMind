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

/**
 * Everything the app actually does, one card each.
 *
 * Each entry maps to real code — the file is named so a claim here can be
 * checked rather than taken on trust. Nothing on this list is planned,
 * partial, or coming soon; a marketing page that lists a feature the build
 * does not have is the fastest way to earn a one-star review that is entirely
 * deserved.
 */
const tools = [
  {
    Icon: CalculatorIcon,
    title: 'حاسبة حجم المركز',
    body: 'رأس مالك ونسبة المخاطرة بيحدّدوا أقصى عدد أسهم مسموح. أي كمية أعلى بتتعلّم بالأحمر لحظيًا.',
    featured: true,
  },
  {
    Icon: GaugeIcon,
    title: 'درجة الانضباط',
    body: 'من 0 لـ 100 على خمس نقاط. بتقيس التزامك بالخطة، مش نتيجة الصفقة.',
  },
  {
    Icon: ChecklistIcon,
    title: 'تشيك ليست ما قبل الصفقة',
    body: 'ستة بنود لازم تعدّيها: الاتجاه، الدعم والمقاومة، الحجم، المخاطرة، حجم المركز، الأخبار.',
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
    Icon: EyeIcon,
    title: 'قائمة مراقبة',
    body: 'أسهم بتراقبها بسعر شراء مستهدف واستوب وأولوية، جاهزة تتحوّل لصفقة.',
  },
  {
    Icon: CalendarIcon,
    title: 'قرار اليوم',
    body: 'شاشة بتقولك النهاردة عندك إيه: إيه اللي وصل لسعره، وإيه اللي محتاج قرار.',
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
  {
    Icon: ChartIcon,
    title: 'أسعار الإغلاق',
    body: 'آخر إغلاق للسهم من البورصة المصرية، وربح وخسارة غير محققة للمراكز المفتوحة.',
  },
  {
    Icon: SparkIcon,
    title: 'قراءة التوصية من صورة',
    body: 'ترفع صورة توصية، والتطبيق يستخرج منها الأسعار. بمفتاحك انت، ومقفولة من غيره.',
  },
  {
    Icon: CloudIcon,
    title: 'نسخة احتياطية اختيارية',
    body: 'من غير حساب كل حاجة على جهازك. سجّلت دخول؟ دفترك بيرجعلك لو غيّرت التليفون.',
  },
];

export function Tools() {
  return (
    <section id="tools" className="border-b border-border-default scroll-mt-20">
      <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-brand-ink">الأدوات</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            اتنعشر أداة، كلها بتخدم سؤال واحد.
          </h2>
          <p className="mt-5 text-lg text-fg-muted">
            «الصفقة دي كانت قرار صح ولا لأ؟» — كل حاجة في التطبيق موجودة عشان
            تجاوب على ده، قبل الصفقة وبعدها.
          </p>
        </div>

        {/* One-pixel gaps over a border-coloured background: the cards read as
            a single ruled grid rather than twelve floating boxes, which is what
            keeps a list this long from looking like a feature dump. */}
        <ul className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border-default bg-border-default sm:grid-cols-2 lg:grid-cols-3">
          {/* No row/col span on the featured card. Twelve items divide evenly
              into both the 2- and 3-column layouts; a spanning cell needs
              thirteen and leaves a hole in the last row with the grid's own
              background showing through. The lime chip carries the emphasis
              instead, and costs no cells. */}
          {tools.map(({ Icon, title, body, featured }) => (
            <li
              key={title}
              className="group bg-surface p-6 transition-colors hover:bg-surface-low"
            >
              <span
                className={`inline-grid size-10 place-items-center rounded-md ${
                  featured
                    ? 'bg-brand text-on-brand'
                    : 'bg-surface-high text-fg-muted transition-colors group-hover:text-brand-ink'
                }`}
              >
                <Icon />
              </span>
              <h3 className="mt-4 font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
