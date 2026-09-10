'use client';

import { useMemo, useState } from 'react';

import { SectionHeader } from '@/components/section-header';
import {
  monthlyNeededFor,
  project,
  SAVING_SCENARIOS,
  type SavingScenario,
} from '@/lib/compound';
import { money } from '@/lib/format';
import { parseNumber } from '@/lib/risk-math';

/**
 * «خطة الادخار» — the compound calculator, running for real on the landing page.
 *
 * Same reasoning as CalculatorWidget: an argument a visitor can operate in ten
 * seconds beats one they have to install to evaluate. It imports lib/compound.ts,
 * a faithful port of lib/core/calc/compound.dart, so the number here is the
 * number the app gives.
 *
 * WHAT IT REFUSES TO DO
 * It never proposes a rate of return. Every scenario carries a target and a
 * horizon and nothing else, and the rate field is the visitor's own assumption.
 * Naming a return is the step from arithmetic to advice, and both the published
 * terms and RELEASE.md rest on this product giving none — the caution under the
 * result says so in plain words rather than leaving it to a legal page.
 */

type Mode = 'grow' | 'goal';

export function CompoundWidget() {
  const [mode, setMode] = useState<Mode>('grow');
  const [scenarioId, setScenarioId] = useState<string | null>(null);

  const [initial, setInitial] = useState('50000');
  const [monthly, setMonthly] = useState('2000');
  const [target, setTarget] = useState('800000');
  const [rate, setRate] = useState('15');
  const [years, setYears] = useState('10');
  const [inflation, setInflation] = useState('20');

  const num = (raw: string) => parseNumber(raw) ?? 0;
  /** Percent in, FRACTION out. The only place that conversion happens. */
  const frac = (raw: string) => num(raw) / 100;

  function applyScenario(s: SavingScenario) {
    setScenarioId(s.id);
    setMode('goal');
    setTarget(String(s.target));
    setYears(String(s.years));
  }

  const view = useMemo(() => {
    const y = Math.round(num(years));
    const needed =
      mode === 'goal'
        ? monthlyNeededFor({
            target: num(target),
            initial: num(initial),
            annualRate: frac(rate),
            years: y,
          })
        : null;

    const result = project({
      initial: num(initial),
      monthly: mode === 'grow' ? num(monthly) : (needed ?? 0),
      annualRate: frac(rate),
      years: y,
      annualInflation: frac(inflation),
    });

    return { y, needed, result };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, initial, monthly, target, rate, years, inflation]);

  const { y, needed, result } = view;
  const scenario = SAVING_SCENARIOS.find((s) => s.id === scenarioId) ?? null;

  return (
    <section id="plan" className="border-t border-border-default py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeader
          eyebrow="خطة الادخار"
          title="مية جنيه دلوقتي بتبقى كام بعد أربعين سنة؟"
          lead="حط رقمك، وشوف الفرق بين اللي هتدفعه من جيبك واللي هيزيد لوحده — وبفلوس النهاردة، مش بالأرقام الكبيرة اللي التضخّم بياكلها."
        />

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1fr]">
          {/* ---------------------------------------------------------- form */}
          <div className="rounded-lg border border-border-default bg-surface-low p-6">
            <div
              role="group"
              aria-label="نوع الحساب"
              className="flex gap-2 rounded-md bg-surface p-1"
            >
              {(
                [
                  ['grow', 'هيبقوا كام؟'],
                  ['goal', 'أحوّش كام؟'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setMode(value);
                    setScenarioId(null);
                  }}
                  aria-pressed={mode === value}
                  className={`flex-1 rounded px-4 py-2 text-sm font-semibold transition-colors ${
                    mode === value
                      ? 'bg-brand text-on-brand'
                      : 'text-fg-muted hover:bg-surface-high'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <p className="mt-6 text-sm font-semibold">ابدأ من هدف</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SAVING_SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => applyScenario(s)}
                  aria-pressed={scenarioId === s.id}
                  className={`rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors ${
                    scenarioId === s.id
                      ? 'border-transparent bg-brand text-on-brand'
                      : 'border-border-default text-fg-muted hover:bg-surface-high'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {scenario && (
              <p className="mt-3 text-xs leading-relaxed text-fg-subtle">
                {scenario.description}
              </p>
            )}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field
                id="cw-initial"
                label="المبلغ اللي معاك"
                suffix="ج.م"
                value={initial}
                onChange={setInitial}
              />
              {mode === 'grow' ? (
                <Field
                  id="cw-monthly"
                  label="بتضيف كل شهر"
                  suffix="ج.م"
                  value={monthly}
                  onChange={setMonthly}
                />
              ) : (
                <Field
                  id="cw-target"
                  label="عايز توصل لـ"
                  suffix="ج.م"
                  value={target}
                  onChange={setTarget}
                />
              )}
              <Field
                id="cw-rate"
                label="عائد سنوي متوقّع"
                suffix="%"
                value={rate}
                onChange={setRate}
              />
              <Field
                id="cw-years"
                label="المدة"
                suffix="سنة"
                value={years}
                onChange={setYears}
              />
              <Field
                id="cw-inflation"
                label="تضخّم سنوي متوقّع"
                suffix="%"
                value={inflation}
                onChange={setInflation}
              />
            </div>
          </div>

          {/* -------------------------------------------------------- result */}
          <div className="rounded-lg border border-border-default bg-surface p-6">
            {mode === 'goal' && (
              <div className="border-b border-border-default pb-5">
                <p className="text-sm text-fg-muted">لازم تحوّش كل شهر</p>
                <p className="num mt-1 text-4xl font-bold text-brand-ink">
                  {needed === null ? '—' : money(needed)}
                </p>
              </div>
            )}

            <div className={mode === 'goal' ? 'pt-5' : ''}>
              <p className="text-sm text-fg-muted">
                بعد <span className="num">{y}</span> سنة هيبقى معاك
              </p>
              <p
                className={`num mt-1 text-4xl font-bold ${
                  mode === 'grow' ? 'text-brand-ink' : ''
                }`}
              >
                {money(result.futureValue)}
              </p>
            </div>

            <dl className="mt-6 space-y-2 text-sm">
              <Line label="اللي دفعته من جيبك" value={money(result.totalContributed)} />
              <Line label="اللي زاد لوحده" value={money(result.totalGrowth)} />
            </dl>

            {/* Given last and given weight. A projection that reports only the
                nominal figure tells someone they will be rich when it has
                mostly counted the currency shrinking. */}
            <div className="mt-6 border-t border-border-default pt-5">
              <p className="text-sm text-fg-muted">قيمتهم بفلوس النهاردة</p>
              <p className="num mt-1 text-2xl font-bold">{money(result.realValue)}</p>
              <p className="mt-2 text-xs leading-relaxed text-fg-subtle">
                يعني الـ<span className="num">{money(result.futureValue)}</span> دي
                هتشتري بقد <span className="num">{money(result.realValue)}</span>{' '}
                النهاردة، لو التضخّم فضل زي ما حطيته.
              </p>
            </div>

            <p className="mt-6 rounded-md border border-border-default bg-surface-low p-3 text-xs leading-relaxed text-fg-subtle">
              دي حسبة رياضية على عائد ثابت <strong>انت</strong> اللي بتفترضه — مش
              توقّع ولا وعد. السوق مبيديش عائد ثابت، وفيه سنين بتخسر. رادار
              مبيرشّحش استثمار ولا بيقولك تحط فلوسك فين.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({
  id,
  label,
  suffix,
  value,
  onChange,
}: {
  id: string;
  label: string;
  suffix: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
        <span className="ms-1 text-xs text-fg-subtle">({suffix})</span>
      </label>
      <input
        id={id}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir="ltr"
        className="num mt-2 w-full rounded-md border border-border-default bg-surface px-3 py-2.5 text-start outline-none transition-colors focus:border-brand-ink"
      />
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="num font-bold">{value}</dd>
    </div>
  );
}
