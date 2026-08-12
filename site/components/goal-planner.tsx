'use client';

import { GoalPlannerBody } from '@/components/goal-planner-body';
import { SectionHeader } from '@/components/section-header';

/**
 * «حاسبة الهدف» on the landing page.
 *
 * A visitor has no journal, so no rate is suggested and the field starts empty
 * — the calculator asks for the assumption instead of supplying one. The same
 * body renders inside the dashboard, where the journal can fill it in.
 */
export function GoalPlanner() {
  return (
    <section id="goal" className="scroll-mt-20 border-b border-border-default">
      <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
        <SectionHeader
          eyebrow="حاسبة الهدف"
          title="خطّط لهدفك المالي واعرف تحطّ كام كل شهر"
          lead="سواء بتجمّع لمستقبل ولادك، لعربية، أو لتقاعد بدري — اكتب المبلغ والمدة والعائد اللي بتفترضه، والحاسبة بتوريك المطلوب شهريًا وقد إيه من الناتج جاي من التراكم."
        />

        <div className="mx-auto mt-12 max-w-4xl">
          <GoalPlannerBody />
        </div>

        {/* Stated on the page itself, not only in the footer disclaimer: a
            calculator that prints a future number is the single place a reader
            is most likely to mistake an assumption for a forecast. */}
        <p className="mx-auto mt-6 max-w-4xl text-center text-xs leading-relaxed text-fg-subtle">
          الحاسبة بتشتغل على نسبة العائد اللي انت بتكتبها. رادار ما بيتوقّعش عائد
          ولا بيضمنه، والأرقام دي حساب رياضي على فرضيتك انت.
        </p>
      </div>
    </section>
  );
}
