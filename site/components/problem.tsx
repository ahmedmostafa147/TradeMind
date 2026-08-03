import { CheckIcon, XIcon } from '@/components/icons';
import { SectionHeader } from '@/components/section-header';

/**
 * The three questions a trader cannot answer two months later.
 *
 * They used to be a bare ruled list — three lines between hairlines, which is
 * the shape of a table row, not of a question. Numbering them gives each one
 * its own object and a reason to be read in order, and the index carries the
 * visual weight the plain list had none of.
 */
const questions = [
  'هل كنت داخل على خبر؟',
  'ولا كنت شايف فرصة؟',
  'ولا شفت السهم طالع فدخلت وراه؟',
];

const without = [
  'بتبيع وبعدها بأسبوعين تلاقيه كمّل طلوع، ومش عارف كنت خارج ليه',
  'مش عارف بتكسب من إيه وبتخسر في إيه',
  'بتغلط نفس الغلطة كل شوية من غير ما تاخد بالك',
];

const withRadar = [
  'بترجع للصفقة تشوف كنت خارج ليه، وتعرف لو القرار كان صح ولا لأ',
  'بتشوف أداءك مقسّم حسب نوع الصفقة ومصدرها وشهر بشهر',
  'كل صفقة ليها سبب مكتوب وتشيك ليست، فالغلطة بتبان قبل ما تتكرر',
];

export function Problem() {
  return (
    <section id="why" className="border-b border-border-default scroll-mt-20">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
        <SectionHeader
          eyebrow="المشكلة"
          title="المشكلة مش إنك بتخسر. المشكلة إنك مش بتتعلّم."
          lead="بتشتري السهم، وبعد فترة تبيعه، وخلاص الموضوع بينتهي. بعد شهرين لما ترجع تبص على العملية، تكتشف إنك مش فاكر اشتريت ليه من الأساس."
        />

        <ol className="mx-auto mt-14 grid max-w-5xl gap-4 md:grid-cols-3">
          {questions.map((question, index) => (
            <li
              key={question}
              className="rounded-lg border border-border-default bg-surface-low p-7 text-center"
            >
              <span className="num block text-sm font-bold text-fg-subtle">
                {String(index + 1).padStart(2, '0')}
              </span>
              <p className="mt-3 text-xl font-bold text-balance sm:text-2xl">
                {question}
              </p>
            </li>
          ))}
        </ol>

        <p className="mx-auto mt-10 max-w-2xl text-center text-lg text-fg-muted">
          من غير سجل، كل صفقة بتفضل حادثة منفصلة. ومن غير ما تعرف غلطت ليه،
          الخسارة بتتكرر وانت فاكر إنها سوء حظ.
        </p>

        {/* Two states, told by TREATMENT rather than by grid lines.

            This was a bordered table: two header cells over three ruled rows,
            each split down the middle. It read as a spreadsheet — every cell
            weighted the same, the ruling louder than the words, and the whole
            contrast between "before" and "after" carried by nothing but which
            column a sentence happened to land in. Here the left state is
            recessed and muted with a struck marker, the right is raised and
            full-contrast with a check. The difference lands before a single
            word is read. */}
        <div className="mx-auto mt-16 grid max-w-4xl gap-5 lg:grid-cols-2">
          <div className="rounded-lg border border-border-default bg-surface-low p-7">
            <h3 className="text-sm font-bold text-fg-muted">من غير سجل</h3>
            <ul className="mt-5 space-y-4">
              {without.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 text-fg-subtle">
                    <XIcon className="size-4 shrink-0" />
                  </span>
                  <span className="text-sm leading-relaxed text-fg-muted">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-border-strong bg-surface p-7 shadow-sm">
            <h3 className="text-sm font-bold">مع رادار</h3>
            <ul className="mt-5 space-y-4">
              {withRadar.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  {/* Brand, not win-green: these are product claims, not a
                      profitable trade. Green here would spend the one colour
                      the data surfaces reserve for money. */}
                  <span className="mt-0.5 text-brand-ink">
                    <CheckIcon className="size-4 shrink-0" />
                  </span>
                  <span className="text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
