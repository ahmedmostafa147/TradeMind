'use client';

import { signedMoney } from '@/lib/format';
import {
  coversTheRest,
  hasOneWinnerAnalysis,
  type PortfolioScenarios,
} from '@/lib/portfolio-scenarios';

/**
 * «لو كله كسب، ولو كله خسر» — the open book's two extremes, and the question
 * underneath them: is one winner enough to carry the rest?
 *
 * The counterpart of the app's PortfolioScenariosCard, and it lives in «الأداء»
 * for the same reason it does there.
 *
 * EVERY FIGURE IS CONDITIONAL AND THE COPY SAYS SO. These are not forecasts —
 * nothing here estimates how LIKELY any outcome is. They are arithmetic on
 * targets and stops the user set themselves: if each position resolves at its
 * own level, this is the sum. Presenting that as a prediction would be the one
 * thing the disclaimer forbids.
 */
export function ScenariosPanel({
  scenarios,
}: {
  scenarios: PortfolioScenarios;
}) {
  // Hidden entirely on an empty book, exactly like the app's card: a scenario
  // panel with nothing open is a row of dashes.
  if (scenarios.openCount === 0) return null;

  return (
    <section className="rounded-lg border border-border-default bg-surface p-6">
      <div className="mb-5">
        <h2 className="font-bold">سيناريوهات المحفظة</h2>
        <p className="mt-1 text-xs text-fg-subtle">
          على <span className="num">{scenarios.openCount}</span> صفقة مفتوحة —
          بأهدافها واستوباتها اللي انت حاططها
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Same wording as the app's two readout rows — the figures have to
            read as the same thing on both surfaces. */}
        <Extreme
          label="إذا ربحت جميع الصفقات"
          value={scenarios.totalExpectedProfit}
          tone="win"
        />
        <Extreme
          label="إذا خسرت جميع الصفقات"
          value={scenarios.totalExpectedLoss}
          tone="loss"
        />
      </div>

      {hasOneWinnerAnalysis(scenarios) && (
        <div className="mt-6 border-t border-border-default pt-5">
          <h3 className="text-sm font-bold">
            لو صفقة واحدة بس وصلت الهدف والباقي ضرب الاستوب
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-fg-subtle">
            بيوضّح لو صفقة ناجحة واحدة تقدر تعوّض باقي الخسائر. الأخضر معناه إن
            الصفقة دي لوحدها بتغطّي خسارة الباقي.
          </p>

          <ul className="mt-4 space-y-2">
            {scenarios.oneWinner.map((outcome) => {
              const covers = coversTheRest(outcome);
              return (
                <li
                  key={outcome.tradeId}
                  className="flex items-center justify-between gap-4 rounded-md border border-border-default bg-surface-low px-4 py-3"
                >
                  <span className="num font-bold">
                    {outcome.ticker || '—'}
                  </span>
                  <span className="flex items-center gap-2">
                    {/* Words as well as colour — the same rule the over-risk
                        marker follows, so it survives colour blindness. */}
                    <span className="text-xs text-fg-muted">
                      {covers ? 'بتغطّي الباقي' : 'مش بتغطّي'}
                    </span>
                    <span
                      className={`num font-bold ${covers ? 'text-win' : 'text-loss'}`}
                    >
                      {signedMoney(outcome.net)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="mt-5 text-xs leading-relaxed text-fg-subtle">
        دي حسبة على الأرقام اللي انت مدخّلها، <strong>مش توقّع</strong> — مفيش
        حاجة هنا بتقول إيه احتمال إن ده يحصل. الصفقة اللي مالهاش هدف أو استوب
        مكتوب بتتحسب على <span className="num">5%</span> و
        <span className="num">2%</span> من سعر الدخول.
      </p>
    </section>
  );
}

function Extreme({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | null;
  tone: 'win' | 'loss';
}) {
  return (
    <div className="rounded-lg border border-border-default bg-surface-low p-5">
      <p className="text-sm text-fg-muted">{label}</p>
      <p
        className={`num mt-1.5 text-2xl font-bold ${
          value === null ? '' : tone === 'win' ? 'text-win' : 'text-loss'
        }`}
      >
        {value === null ? '—' : signedMoney(value)}
      </p>
    </div>
  );
}
