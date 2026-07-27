const questions = [
  'هل كنت داخل على خبر؟',
  'ولا كنت شايف فرصة؟',
  'ولا شفت السهم طالع فدخلت وراه؟',
];

const shifts = [
  {
    before: 'بتبيع وبعدها بأسبوعين تلاقيه كمّل طلوع',
    after: 'بترجع للصفقة تشوف كنت خارج ليه، وتعرف لو القرار كان صح ولا لأ',
  },
  {
    before: 'مش عارف بتكسب من إيه وبتخسر في إيه',
    after: 'بتشوف أداءك مقسّم حسب نوع الصفقة ومصدرها وشهر بشهر',
  },
  {
    before: 'بتغلط نفس الغلطة كل شوية',
    after: 'كل صفقة ليها سبب مكتوب وتشيك ليست، فالغلطة بتبان قبل ما تتكرر',
  },
];

export function Problem() {
  return (
    <section id="why" className="border-b border-border-default scroll-mt-20">
      <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            المشكلة مش إنك بتخسر. المشكلة إنك مش بتتعلّم.
          </h2>

          <p className="mt-6 text-lg text-fg-muted">
            بتشتري السهم، وبعد فترة تبيعه، وخلاص الموضوع بينتهي. بعد شهرين لما
            ترجع تبص على العملية، تكتشف إنك مش فاكر اشتريت ليه من الأساس.
          </p>

          <ul className="mt-8 space-y-3">
            {questions.map((question) => (
              <li
                key={question}
                className="border-e-2 border-border-strong pe-4 text-xl font-semibold sm:text-2xl"
              >
                {question}
              </li>
            ))}
          </ul>

          <p className="mt-8 text-lg text-fg-muted">
            من غير سجل، كل صفقة بتفضل حادثة منفصلة. ومن غير ما تعرف غلطت ليه،
            الخسارة بتتكرر وانت فاكر إنها سوء حظ.
          </p>
        </div>

        {/* A two-column before/after rather than a feature grid: the value here
            is the contrast between the two states, and a grid of cards would
            flatten it into a list of unrelated claims. */}
        <div className="mt-14 overflow-hidden rounded-lg border border-border-default">
          <div className="grid grid-cols-1 divide-y divide-border-default sm:grid-cols-2 sm:divide-x sm:divide-x-reverse sm:divide-y-0">
            <div className="bg-surface-low p-5">
              <h3 className="text-sm font-bold text-fg-muted">من غير سجل</h3>
            </div>
            <div className="bg-surface p-5">
              <h3 className="text-sm font-bold">مع TradePilot</h3>
            </div>
          </div>

          {shifts.map((shift) => (
            <div
              key={shift.before}
              className="grid grid-cols-1 border-t border-border-default sm:grid-cols-2"
            >
              <p className="bg-surface-low p-5 text-sm text-fg-muted">
                {shift.before}
              </p>
              <p className="border-t border-border-default bg-surface p-5 text-sm sm:border-t-0 sm:border-e sm:border-border-default">
                {shift.after}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
