"use client";

import {
  GoalPresetList,
  ModeSwitcher,
  PlannerInput,
} from "@/components/goal-planner-fields";
import { useGoalPlannerState } from "@/components/goal-planner-state";
import { LightbulbIcon } from "@/components/icons";
import { SectionHeader } from "@/components/section-header";
import { money } from "@/lib/format";

export function GoalPlanner() {
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
    calc,
  } = useGoalPlannerState();

  return (
    <section id="goal" className="border-b border-border-default scroll-mt-20">
      <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
        <SectionHeader
          eyebrow="حاسبة الهدف"
          title="خطط لهدفك المالي واعرف كام تستثمر شهرياً"
          lead="سواء بتستثمر لمستقبل أولادك، لشراء سيارة، أو لتأمين تقاعدك الحر — رادار بيحسبلك المبلغ المطلوب والنمو المركب لأموالك بالكامل."
        />

        <div className="mx-auto mt-12 max-w-4xl space-y-6">
          <ModeSwitcher mode={mode} onChange={setMode} />

          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <span className="text-xs font-semibold text-fg-subtle">
              اختر هدفاً سريعاً للتجربة:
            </span>
            <GoalPresetList activeId={activePreset} onSelect={applyPreset} />
          </div>

          <div className="grid gap-px overflow-hidden rounded-xl border border-border-default bg-border-default lg:grid-cols-2">
            {/* Inputs Column */}
            <div className="bg-surface p-5 sm:p-6 space-y-4">
              {mode === "targetToMonthly" ? (
                <PlannerInput
                  id="goal-target"
                  label="المبلغ المستهدف الوصول له"
                  suffix="ج.م"
                  value={targetAmount}
                  onChange={setTargetAmount}
                />
              ) : (
                <PlannerInput
                  id="goal-monthly"
                  label="المبلغ المستثمر شهرياً"
                  suffix="ج.م"
                  value={monthlyDeposit}
                  onChange={setMonthlyDeposit}
                />
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <PlannerInput
                  id="goal-years"
                  label="المدة الزمانية"
                  suffix="سنوات"
                  value={years}
                  onChange={setYears}
                />
                <PlannerInput
                  id="goal-return"
                  label="العائد السنوي المتوقع"
                  suffix="%"
                  value={annualReturn}
                  onChange={setAnnualReturn}
                />
              </div>

              <PlannerInput
                id="goal-initial"
                label="المبلغ المتاح للبدء حالياً (مبدئي)"
                suffix="ج.م"
                value={initialDeposit}
                onChange={setInitialDeposit}
              />
            </div>

            {/* Results Column */}
            <div className="bg-surface-low p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="rounded-lg border border-border-default bg-surface p-4 text-center">
                  <p className="text-xs font-medium text-fg-subtle">
                    {mode === "targetToMonthly"
                      ? "الاستثمار الشهري المطلق للوصول للهدف"
                      : "إجمالي الثروة المستقبلية المتوقعة"}
                  </p>
                  <p className="num mt-2 text-4xl font-extrabold text-win">
                    {mode === "targetToMonthly"
                      ? `${money(calc.reqMonthly)}`
                      : money(calc.totalFutureValue)}
                  </p>
                  <p className="mt-1 text-xs text-fg-muted">
                    {mode === "targetToMonthly"
                      ? "ج.م شهرياً لمدة " + years + " سنة"
                      : "ج.م بعد " + years + " سنة"}
                  </p>
                </div>

                <dl className="mt-5 space-y-2.5 text-xs border-t border-border-default pt-4">
                  <div className="flex justify-between">
                    <dt className="text-fg-muted">المبلغ المستهدف النهائي:</dt>
                    <dd className="num font-bold text-fg">
                      {money(calc.totalFutureValue)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-fg-muted">إجمالي مدخراتك المباشرة:</dt>
                    <dd className="num font-bold text-fg">
                      {money(calc.totalInvested)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-fg-muted">
                      أرباح العائد المركب المتراكم:
                    </dt>
                    <dd className="num font-bold text-win">
                      +{money(calc.totalProfit)}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="mt-5 rounded-lg border border-border-default bg-surface p-3 text-center sm:text-start">
                {/* LightbulbIcon, not 💡 — zero emoji on the site is an
                    explicit owner preference; SVG icons only. */}
                <p className="text-xs leading-relaxed text-fg-muted">
                  <LightbulbIcon className="me-1 inline-block size-3.5 align-[-0.2em] text-brand-ink" />
                  <span className="font-semibold text-fg">
                    قوة التراكم المركب:
                  </span>{" "}
                  أرباح التداول والعائد المركب تسهم بـ{" "}
                  <span className="num font-bold text-win">
                    {calc.totalFutureValue > 0
                      ? (
                          (calc.totalProfit / calc.totalFutureValue) *
                          100
                        ).toFixed(0)
                      : 0}
                    %
                  </span>{" "}
                  من إجمالي ثروتك المستقبلية المستهدفة.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
