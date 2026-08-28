'use client';

import { useState } from 'react';

import { GoalPlannerBody } from '@/components/goal-planner-body';
import { capitalLabel, money, signedMoney } from '@/lib/format';
import { annualReturnFromMonthlyRate } from '@/lib/goal-plan';
import {
  MIN_CLOSED_TRADES,
  monthsLabel,
  project,
  type ClosedPoint,
} from '@/lib/projection';
import { parseNumber } from '@/lib/risk-math';

/**
 * «الهدف» — two questions about the same target, kept apart on purpose.
 *
 * 1. «بالتداول» — how long the JOURNAL says the target takes. It never invents
 *    a return rate: every number comes from closed trades the user logged
 *    themselves, and when those trades say the target is unreachable it says so
 *    plainly rather than producing a large, survivable-looking month count. A
 *    projection tool that always returns an encouraging answer is a slot
 *    machine with a spreadsheet on it.
 *
 * 2. «بالادخار» — the landing page's planner: pick a horizon and a rate, get
 *    the monthly deposit. The rate here IS an assumption, which is why it is
 *    labelled as one everywhere it appears.
 *
 * THE TWO ARE NOT MERGED, AND MUST NOT BE. Feeding the journal's measured rate
 * into the planner as an unmarked default would turn a measurement into a
 * forecast — the exact move the projection was written to avoid. It is offered
 * as one tap, with its source on the label, and the user can ignore it.
 *
 * The working is shown under each answer for the same reason the discipline
 * badge lists its five components: a figure a user cannot audit is a figure
 * they can only argue with.
 */
export function GoalPanel({
  trades,
  capital,
  expectancy,
}: {
  trades: { exitDate: Date | null; pnl: number | null }[];
  capital: number;
  expectancy: number | null;
}) {
  // Not persisted. Storing it would mean a new field on users/{uid}/settings,
  // whose rules whitelist is pinned to three keys — a schema change and a rules
  // deploy for a number that costs one keystroke to retype.
  const [targetText, setTargetText] = useState('');

  const closed: ClosedPoint[] = trades
    .filter(
      (t): t is { exitDate: Date; pnl: number } =>
        t.exitDate !== null && t.pnl !== null
    )
    .map((t) => ({ exitDate: t.exitDate, pnl: t.pnl }));

  const target = parseNumber(targetText);
  const result =
    target === null || target <= 0
      ? null
      : project({ closed, capital, target, expectancy });

  // Offered to the planner below, never applied silently. Null whenever the
  // journal has no usable edge, and a house number is NOT substituted: a
  // default that looks measured but is not is worse than an obviously
  // arbitrary one.
  const measuredAnnualReturn =
    result !== null && result.kind === 'reachable'
      ? annualReturnFromMonthlyRate(result.monthlyRate)
      : null;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border-default bg-surface p-4 sm:p-5">
        <h2 className="font-bold">بالتداول: هتوصل إمتى</h2>
        <p className="mt-1 text-xs text-fg-subtle">
          اكتب المبلغ اللي عايز توصله، والحساب بيتعمل على أداءك الحقيقي في الدفتر
          — مش على نسبة عائد مفترضة.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-fg-muted">رأس مالك دلوقتي</p>
            <p
              className={
                capital > 0
                  ? 'num mt-1 text-2xl font-bold'
                  : 'mt-1 text-2xl font-bold text-fg-subtle'
              }
            >
              {capitalLabel(capital)}
            </p>
          </div>

          <label className="text-sm font-semibold">
            عايز توصل لكام (ج.م)
            <input
              inputMode="decimal"
              dir="ltr"
              value={targetText}
              onChange={(e) => setTargetText(e.target.value)}
              placeholder="1000000"
              className="mt-2 w-full rounded-md border border-border-default bg-surface-low px-3 py-2 outline-none focus:border-brand-ink"
            />
          </label>
        </div>
      </section>

      {result && <Answer result={result} capital={capital} />}

      <section className="rounded-lg border border-border-default bg-surface p-4 sm:p-5">
        <h2 className="font-bold">بالادخار: تحطّ كام كل شهر</h2>
        <p className="mt-1 text-xs text-fg-subtle">
          سؤال تاني خالص: مش «دفترك بيقول إيه» — ده «لو العائد طلع كذا، المطلوب
          مني كام». نسبة العائد هنا <strong>فرضية بتكتبها انت</strong>.
        </p>

        <div className="mt-4">
          <GoalPlannerBody
            suggestedAnnualReturn={measuredAnnualReturn}
            initialCapital={capital}
          />
        </div>
      </section>
    </div>
  );
}

function Answer({
  result,
  capital,
}: {
  result: NonNullable<ReturnType<typeof project>>;
  capital: number;
}) {
  // Before every other branch, because without a capital none of them can be
  // computed — and the fix is one field away, so the note names it.
  if (result.kind === 'no-capital') {
    return (
      <Note title="حدّد رأس مالك الأول">
        التوقّع بيتحسب من ربح الشهر ÷ رأس المال، ورأس مالك لسه
        مش متسجّل. اكتبه في <strong>الإعدادات</strong> وارجع — مفيش رقم هنا هيبقى
        له معنى قبل كده.
      </Note>
    );
  }

  if (result.kind === 'already-there') {
    return (
      <Note title="انت وصلت خلاص">
        المبلغ ده أقل من أو يساوي رأس مالك الحالي. حط رقم أكبر لو عايز تشوف
        المدة.
      </Note>
    );
  }

  if (result.kind === 'not-enough-history') {
    return (
      <Note title="لسه بدري على التوقّع">
        عندك <strong className="num">{result.closedCount}</strong> صفقة مقفولة،
        والحساب محتاج <strong className="num">{result.needed}</strong> على
        الأقل. أقل من كده، صفقة واحدة محظوظة بتحرّك المتوسط كله وبيطلع رقم شكله
        واثق ومش وراه حاجة. كمّل تسجيل، والتوقّع هيظهر لوحده.
      </Note>
    );
  }

  // The answer that matters most, and the one a friendlier tool would bury.
  if (result.kind === 'no-edge') {
    return (
      <section className="rounded-lg border border-loss-border bg-loss-surface p-4 sm:p-5">
        <h2 className="font-bold text-loss">
          بالأداء الحالي، مش هتوصل للهدف ده
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-fg">
          متوسط ناتج الصفقة الواحدة عندك{' '}
          <strong className="num">{signedMoney(result.expectancy)}</strong> —
          يعني الدفتر بيخسر في المتوسط، مش بيكسب. المدة هنا مش رقم كبير، هي
          <strong> مفيش</strong>: مهما استنيت، المتوسط السالب بيبعّدك عن الهدف مش
          بيقرّبك.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          السؤال المفيد مش «هوصل إمتى» — هو «إيه اللي بيخسّرني». بُص في تبويب
          التحليلات على الأداء حسب التصنيف والمصدر، ودرجة الانضباط: الصفقات
          الوحشة عادةً ليها نمط مشترك.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border-default bg-surface p-4 sm:p-5">
      <h2 className="font-bold">
        {result.beyondHorizon ? 'الهدف بعيد جدًا' : 'التوقّع'}
      </h2>

      {result.beyondHorizon ? (
        <p className="mt-3 text-sm leading-relaxed text-fg">
          بالمعدّل الحالي ده هياخد أكتر من{' '}
          <strong className="num">50</strong> سنة. الرقم ده مش توقّع، هو إشارة إن
          الهدف والمعدّل مش على نفس المقياس — يا إما الهدف يقلّ، يا إما المعدّل
          يزيد.
        </p>
      ) : (
        <>
          <p className="mt-3 text-3xl font-bold">
            {monthsLabel(result.months)}
          </p>
          <p className="mt-1 text-sm text-fg-muted">
            <span className="num">{result.months}</span> شهر بالمعدّل الحالي
          </p>
        </>
      )}

      {/* The working, so the number can be checked rather than believed. */}
      <dl className="mt-6 grid gap-x-8 gap-y-4 border-t border-border-default pt-5 sm:grid-cols-3">
        <Row
          label="متوسط ناتج الصفقة"
          value={signedMoney(result.expectancy)}
        />
        <Row
          label="صفقات في الشهر"
          value={result.tradesPerMonth.toFixed(1)}
        />
        <Row
          label="ربح شهري متوقّع"
          value={signedMoney(result.monthlyProfit)}
        />
      </dl>

      <p className="mt-5 text-xs leading-relaxed text-fg-subtle">
        الحساب بيفترض إنك بتكبّر حجم الصفقة مع نمو رأس المال — زي ما الحاسبة
        بتحسبها من رأس مالك ونسبة المخاطرة. ودي{' '}
        <strong>مش وعد ولا ضمان</strong>: هي بس امتداد لأرقامك اللي فاتت لو
        فضلت تتداول بنفس الطريقة، والسوق مش بيلتزم بالمتوسطات. رأس المال
        المستخدم في الحساب هو <span className="num">{money(capital)}</span>.
      </p>
    </section>
  );
}

function Note({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border-default bg-surface-low p-4 sm:p-5">
      <h2 className="font-bold">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">{children}</p>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-fg-muted">{label}</dt>
      <dd className="num mt-1 font-bold">{value}</dd>
    </div>
  );
}
