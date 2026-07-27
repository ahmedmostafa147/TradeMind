import { money, quantity } from '@/lib/format';

/**
 * The worked example under the sizing formula.
 *
 * Computed, not written out: 100,000 × 2% = 2,000 EGP of risk, divided by a
 * 3.90 stop distance, floored to whole shares. The app floors for the same
 * reason — you cannot buy 512.8 shares, and rounding up would breach the very
 * limit the calculation exists to respect.
 */
const CAPITAL = 100000;
const MAX_RISK = 0.02;
const ENTRY = 78.4;
const STOP = 74.5;

const riskBudget = CAPITAL * MAX_RISK;
const stopDistance = ENTRY - STOP;
const suggestedQty = Math.floor(riskBudget / stopDistance);

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
    title: 'نسخة احتياطية اختيارية',
    body: 'من غير حساب، كل حاجة على جهازك ومبتخرجش منه. سجّلت دخول؟ صفقاتك بتترفع لحسابك انت بس، وترجعلك لو غيّرت التليفون.',
  },
];

export function Features() {
  return (
    <section id="features" className="border-b border-border-default scroll-mt-20">
      <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
        <h2 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
          مش بس بيسجّل. بيمنعك من الغلطة قبل ما تحصل.
        </h2>

        {/* The calculator leads the section on its own instead of sitting as
            one card among six: it is the only feature that acts BEFORE the
            trade, which is the product's actual claim. */}
        <div className="mt-10 overflow-hidden rounded-lg border border-border-default">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-2 lg:gap-12">
            <div>
              <h3 className="text-xl font-bold">
                حاسبة الحجم — قبل ما تشتري
              </h3>
              <p className="mt-3 text-fg-muted">
                انت بتحدد رأس مالك وأقصى نسبة مخاطرة تقبلها في الصفقة الواحدة.
                بعد كده، تكتب سعر الدخول والاستوب، والتطبيق بيقولك أقصى عدد أسهم
                مسموح ليك تشتريه. أي كمية أعلى من كده بتتعلّم بالأحمر — في
                الحاسبة، وفي شاشة الإضافة وانت بتكتب، وعلى صف الصفقة نفسه.
              </p>
            </div>

            <figure className="rounded-md border border-border-default bg-surface-low p-5">
              <figcaption className="text-xs font-semibold text-fg-muted">
                المعادلة
              </figcaption>
              <p className="mt-2 text-sm font-semibold">
                الكمية = (رأس المال × نسبة المخاطرة) ÷ (الدخول − الاستوب)
              </p>

              <dl className="mt-5 space-y-2.5 border-t border-border-default pt-4 text-sm">
                <Row label="رأس المال" value={money(CAPITAL)} />
                <Row label="أقصى مخاطرة" value="2.0%" />
                <Row label="المبلغ المسموح خسارته" value={money(riskBudget)} />
                <Row
                  label="مسافة الاستوب"
                  value={money(stopDistance)}
                  hint={`${ENTRY.toFixed(2)} − ${STOP.toFixed(2)}`}
                />
              </dl>

              <div className="mt-4 flex items-baseline justify-between gap-4 border-t-2 border-border-strong pt-4">
                <dt className="text-sm font-bold">الكمية المقترحة</dt>
                <dd className="num text-2xl font-bold">
                  {quantity(suggestedQty)}
                  <span className="ms-1.5 text-sm font-semibold text-fg-muted">
                    سهم
                  </span>
                </dd>
              </div>
            </figure>
          </div>
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

function Row({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-fg-muted">
        {label}
        {hint && <span className="num ms-2 text-xs text-fg-subtle">{hint}</span>}
      </dt>
      <dd className="num font-semibold">{value}</dd>
    </div>
  );
}
