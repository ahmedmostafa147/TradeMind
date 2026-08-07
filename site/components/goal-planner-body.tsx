'use client';

import {
  GoalPresetList,
  ModeSwitcher,
  PlannerInput,
} from '@/components/goal-planner-fields';
import { useGoalPlannerState } from '@/components/goal-planner-state';
import { LightbulbIcon } from '@/components/icons';
import { money, percent } from '@/lib/format';

/**
 * The savings planner itself — inputs on one side, the answer on the other.
 *
 * Shared by the landing page and the dashboard's «الهدف» tab so the visitor who
 * plays with the calculator and then signs up finds the same instrument, not a
 * second one that disagrees. The arithmetic lives in lib/goal-plan.ts, mirrored
 * by lib/core/calc/goal_plan.dart, so the phone agrees with both.
 *
 * IT NEVER PRESENTS THE RETURN AS OURS. The rate is typed by the user, or —
 * signed in, with enough closed trades — offered as one tap from their own
 * journal and labelled as such. Everything downstream of it is prefixed with
 * «لو» for the same reason.
 */
export function GoalPlannerBody({
  suggestedAnnualReturn = null,
  initialCapital = null,
}: {
  suggestedAnnualReturn?: number | null;
  initialCapital?: number | null;
}) {
  const {
    mode,
    setMode,
    targetAmount,
    setTargetAmount,
    monthlyDeposit,
    setMonthlyDeposit,
    years,
    setYears,
    annualReturn,
    setAnnualReturn,
    initialDeposit,
    setInitialDeposit,
    activePreset,
    applyPreset,
    plan,
  } = useGoalPlannerState({ suggestedAnnualReturn, initialCapital });

  const noRate = plan.monthlyRate === 0;

  return (
    <div className="space-y-4">
      <ModeSwitcher mode={mode} onChange={setMode} />

      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <span className="text-xs font-semibold text-fg-subtle">
          ابدأ من هدف جاهز:
        </span>
        <GoalPresetList activeId={activePreset} onSelect={applyPreset} />
      </div>

      <div className="grid gap-px overflow-hidden rounded-xl border border-border-default bg-border-default lg:grid-cols-2">
        <div className="space-y-4 bg-surface p-5 sm:p-6">
          {mode === 'targetToMonthly' ? (
            <PlannerInput
              id="goal-target"
              label="المبلغ اللي عايز توصله"
              suffix="ج.م"
              value={targetAmount}
              onChange={setTargetAmount}
            />
          ) : (
            <PlannerInput
              id="goal-monthly"
              label="هتحطّ كام كل شهر"
              suffix="ج.م"
              value={monthlyDeposit}
              onChange={setMonthlyDeposit}
            />
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <PlannerInput
              id="goal-years"
              label="المدة"
              suffix="سنة"
              value={years}
              onChange={setYears}
            />
            <PlannerInput
              id="goal-return"
              label="العائد السنوي اللي بتفترضه"
              suffix="%"
              value={annualReturn}
              onChange={setAnnualReturn}
              hint={
                suggestedAnnualReturn != null ? (
                  <button
                    type="button"
                    onClick={() => setAnnualReturn(suggestedAnnualReturn.toFixed(1))}
                    className="font-semibold text-brand-ink underline-offset-4 hover:underline"
                  >
                    من دفترك: {percent(suggestedAnnualReturn / 100)}
                  </button>
                ) : (
                  'رقم بتفترضه انت — مش توقّع مننا.'
                )
              }
            />
          </div>

          <PlannerInput
            id="goal-initial"
            label="معاك كام دلوقتي (اختياري)"
            suffix="ج.م"
            value={initialDeposit}
            onChange={setInitialDeposit}
          />
        </div>

        <div className="flex flex-col justify-between bg-surface-low p-5 sm:p-6">
          <div>
            <div className="rounded-lg border border-border-default bg-surface p-4 text-center">
              <p className="text-xs font-medium text-fg-subtle">
                {plan.coveredByInitial
                  ? 'اللي معاك دلوقتي بيوصلك لوحده'
                  : mode === 'targetToMonthly'
                    ? 'المبلغ المطلوب كل شهر'
                    : 'اللي هتوصله بعد المدة'}
              </p>
              {/* Steps down on a phone: a seven-figure sum plus «ج.م» wraps
                  onto two lines at 320px, splitting the currency off the
                  number it belongs to. */}
              <p className="num mt-2 text-2xl font-extrabold text-win sm:text-4xl">
                {mode === 'targetToMonthly' && !plan.coveredByInitial
                  ? money(plan.monthlyDeposit)
                  : money(plan.futureValue)}
              </p>
              <p className="mt-1 text-xs text-fg-muted">
                {plan.coveredByInitial
                  ? 'من غير ما تحطّ ولا جنيه زيادة'
                  : mode === 'targetToMonthly'
                    ? `على مدى ${years} سنة`
                    : `بعد ${years} سنة`}
              </p>
            </div>

            <dl className="mt-5 space-y-2.5 border-t border-border-default pt-4 text-xs">
              <Row
                label="اللي هتوصله في الآخر"
                value={money(plan.futureValue)}
              />
              <Row
                label="اللي دفعته من جيبك"
                value={money(plan.totalDeposited)}
              />
              <Row
                label="اللي جه من العائد"
                value={`+${money(plan.growth)}`}
                tone="win"
              />
            </dl>
          </div>

          <div className="mt-5 flex gap-2.5 rounded-lg border border-border-default bg-surface p-3">
            <LightbulbIcon className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
            <p className="text-xs leading-relaxed text-fg-muted">
              {noRate ? (
                <>
                  من غير عائد، اللي بتوصله هو بالظبط اللي دفعته. جرّب تكتب نسبة
                  عائد فوق عشان تشوف فرق التراكم.
                </>
              ) : (
                <>
                  <span className="font-semibold text-fg">قوة التراكم:</span>{' '}
                  لو العائد فضل زي ما افترضته،{' '}
                  <span className="num font-bold text-win">
                    {percent(plan.growthShare ?? 0)}
                  </span>{' '}
                  من اللي هتوصله ده جاي من العائد نفسه، مش من جيبك.{' '}
                  <span className="font-semibold text-fg">
                    ودي فرضية مش وعد
                  </span>{' '}
                  — السوق مش بيلتزم بمتوسط.
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'win';
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-fg-muted">{label}</dt>
      <dd className={`num font-bold ${tone === 'win' ? 'text-win' : 'text-fg'}`}>
        {value}
      </dd>
    </div>
  );
}
