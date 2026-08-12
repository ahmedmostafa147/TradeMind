import { SectionHeader } from '@/components/section-header';
import { TradeCardMock, type TradeMock } from '@/components/trade-card-mock';
import { POINTS_EACH } from '@/lib/risk-score';

/**
 * The four components of the app's risk score, worth 25 points each
 * (lib/core/calc/risk_score.dart), and the six checklist items that feed the
 * first of them (lib/trades/checklist.dart).
 *
 * MUST MATCH SCORE_COMPONENTS in site/lib/risk-score.ts. This is a marketing
 * page and duplicates the labels rather than importing them, because the example
 * needs a fixed earned/unearned pattern that no real trade supplies — but the
 * labels drifting would put a component on the public page that the product does
 * not score. It was five here, including «صورة من الشارت مرفقة», for exactly as
 * long as the score had five.
 *
 * The example scores 75 rather than a perfect 100 on purpose: a full score
 * teaches nothing about how the number moves, and one missing component shows
 * the mechanic at a glance. «المخاطرة داخل الحد المسموح» is the one dropped,
 * because the card beside it is the over-risk example — so the list and the card
 * are telling the same story.
 */
const components = [
  { label: 'تشيك ليست مكتملة', earned: true },
  { label: 'المخاطرة داخل الحد المسموح', earned: false },
  { label: 'استوب محدد وتحت سعر الدخول', earned: true },
  { label: 'سبب مكتوب ومفصّل', earned: true },
];

const checklist = [
  'الاتجاه مؤكد',
  'الدعم/المقاومة مؤكدة',
  'الحجم مؤكد',
  'المخاطرة مقبولة',
  'حجم المركز محسوب',
  'الأخبار متابَعة',
];

const score = components.filter((c) => c.earned).length * POINTS_EACH;

/** 100 ممتاز · 75 جيد · 50 متوسط · 25 وأقل ضعيف — the app's own thresholds. */
const grade = score >= 100 ? 'ممتاز' : score >= 75 ? 'جيد' : score >= 50 ? 'متوسط' : 'ضعيف';

/**
 * Entry 62.30, stop 57.10, 500 shares → 2,600 EGP at risk, which is 2.6% of a
 * 100,000 capital against a 2% limit. The card derives that and flags it; the
 * numbers here only state the plan.
 */
const overRiskTrade: TradeMock = {
  ticker: 'SWDY',
  entryDate: new Date(2026, 3, 19),
  entryPrice: 62.3,
  stopPrice: 57.1,
  takeProfitPrice: 74.0,
  quantity: 500,
  exitPrice: null,
  lastClose: 64.85,
};

export function Discipline() {
  return (
    <section id="discipline" className="border-b border-border-default scroll-mt-20">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
        <SectionHeader
          eyebrow="الانضباط"
          title="رادار بيقيس التزامك، مش حظك."
          lead={
            <>
              كل صفقة بتاخد درجة من 0 لـ 100 على أربع نقاط، كل واحدة بـ{' '}
              <span className="num">{POINTS_EACH}</span>. الدرجة دي مالهاش علاقة
              بالربح والخسارة: صفقة خسرانة اتعملت بالأصول بتاخد{' '}
              <span className="num">100</span>، وصفقة كسبانة اتاخدت بمزاج بتاخد{' '}
              <span className="num">{POINTS_EACH}</span>. وده المقصود — الدرجة
              بتقيس الشغل اللي انت بتتحكم فيه.
            </>
          }
        />

        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          <div className="rounded-lg border border-border-default bg-surface p-6">
            <div className="flex items-end justify-between gap-4 border-b border-border-default pb-5">
              <div>
                <p className="text-sm text-fg-muted">درجة الانضباط</p>
                <p className="mt-1 flex items-baseline gap-2">
                  <span className="num text-5xl font-bold">{score}</span>
                  <span className="num text-lg text-fg-subtle">/100</span>
                </p>
              </div>
              <span className="rounded-full border border-border-default bg-surface-high px-3 py-1 text-sm font-bold">
                {grade}
              </span>
            </div>

            {/* The bar repeats the number rather than replacing it — a purely
                graphical score cannot be read by a screen reader or compared
                precisely by eye. */}
            <div
              className="mt-5 h-2 overflow-hidden rounded-full bg-surface-highest"
              role="img"
              aria-label={`الدرجة ${score} من 100`}
            >
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${score}%` }}
              />
            </div>

            <ul className="mt-6 space-y-3">
              {components.map((component) => (
                <li
                  key={component.label}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      className={
                        component.earned ? 'text-fg' : 'text-fg-subtle'
                      }
                      aria-hidden
                    >
                      {component.earned ? <CheckIcon /> : <DashIcon />}
                    </span>
                    <span className={component.earned ? '' : 'text-fg-subtle'}>
                      {component.label}
                    </span>
                  </span>
                  <span
                    className={`num font-semibold ${
                      component.earned ? '' : 'text-fg-subtle'
                    }`}
                  >
                    {/* The screen reader gets "20 من 20", not a bare number
                        floating next to a label. */}
                    <span className="sr-only">
                      {component.earned ? POINTS_EACH : 0} من {POINTS_EACH}
                    </span>
                    <span aria-hidden>
                      {component.earned ? `+${POINTS_EACH}` : `0`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-6 border-t border-border-default pt-5">
              <p className="text-xs font-semibold text-fg-muted">
                التشيك ليست اللي بتظهر قبل الحفظ
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {checklist.map((item) => (
                  <li
                    key={item}
                    className="rounded-sm border border-border-default bg-surface-low px-2.5 py-1 text-xs text-fg-muted"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div aria-hidden>
              <TradeCardMock
                trade={overRiskTrade}
                capital={100000}
                maxRiskPercent={0.02}
              />
            </div>
            <p className="rounded-lg border border-border-default bg-surface-low p-5 text-sm text-fg-muted">
              <strong className="font-semibold text-fg">
                الصفقة دي بتكسر القاعدة.
              </strong>{' '}
              <span className="num">500</span> سهم على مسافة استوب{' '}
              <span className="num">5.20</span> يعني{' '}
              <span className="num">2,600</span> جنيه مخاطرة — وده{' '}
              <span className="num">2.6%</span> من رأس مال{' '}
              <span className="num">100,000</span>، أعلى من حد الـ{' '}
              <span className="num">2%</span> اللي انت حاططه. رادار بيعلّمها
              بشريط أحمر وعلامة تحذير وجملة صريحة — مش باللون لوحده، عشان تبان
              حتى لو عندك عمى ألوان.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0"
      aria-hidden
    >
      <path d="m4 12.5 5 5 11-11" />
    </svg>
  );
}

function DashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      className="size-4 shrink-0"
      aria-hidden
    >
      <path d="M6 12h12" />
    </svg>
  );
}
