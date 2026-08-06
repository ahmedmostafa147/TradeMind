'use client';

import Link from 'next/link';

import { dateLabel } from '@/lib/format';
import {
  PLAN_PRICES,
  TRIAL_DAYS,
  type Entitlement,
} from '@/lib/subscription';

/**
 * What a free account sees where a paid surface would be.
 *
 * It names the surface it is standing in front of rather than showing one
 * generic wall everywhere: "you cannot see this" is not information, and a user
 * who forgot which of four things they were reaching for learns nothing from an
 * unlabelled lock.
 */
export function Paywall({
  title,
  what,
  entitlement,
  onSubscribe,
}: {
  title: string;
  /** One line on what this particular surface does. */
  what: string;
  entitlement: Entitlement;
  onSubscribe: () => void;
}) {
  return (
    <section className="rounded-lg border border-border-default bg-surface p-6 text-center sm:p-8">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-fg-muted">
        {what}
      </p>

      <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-fg-muted">
        {entitlement.trialExpired ? (
          <>
            تجربتك المجانية خلصت. دفترك وصفقاتك{' '}
            <strong>زي ما هي ومفتوحة</strong> — اللي اتقفل هو الأدوات دي بس.
          </>
        ) : (
          <>
            دي من مميزات <strong>رادار Pro</strong>.
          </>
        )}
      </p>

      <button
        type="button"
        onClick={onSubscribe}
        className="mt-6 inline-block rounded-md bg-brand px-6 py-3 text-sm font-bold text-on-brand transition-opacity hover:opacity-90"
      >
        اشترك
      </button>

      <p className="num mt-3 text-xs text-fg-subtle">
        من {PLAN_PRICES.monthly.price} ج.م شهريًا
      </p>
    </section>
  );
}

/**
 * The countdown, and afterwards the notice.
 *
 * Silent for the first nine days of the trial: a banner that says «باقي 14 يوم»
 * on day one is a nag, and a bar that is always there stops being read by the
 * time it says something that matters.
 */
export function TrialBanner({
  entitlement,
  trialStartedAt,
}: {
  entitlement: Entitlement;
  trialStartedAt: Date | null;
}) {
  if (entitlement.plan === 'pro') return null;

  if (entitlement.trialExpired) {
    return (
      <div className="mt-4 rounded-lg border border-border-strong bg-surface-low px-4 py-3">
        <p className="text-sm font-semibold">
          تجربتك المجانية خلصت — دفترك مفتوح زي ما هو.
        </p>
        <p className="mt-1 text-xs leading-relaxed text-fg-muted">
          تسجيل الصفقات وحاسبة الصفقة وحاسبة الهدف مجانيين للأبد. السوق والأسعار
          والتحليل بالـAI والأداء محتاجين اشتراك.{' '}
          <Link
            href="/#pricing"
            className="font-semibold text-brand-ink underline-offset-4 hover:underline"
          >
            شوف الباقات ←
          </Link>
        </p>
      </div>
    );
  }

  if (entitlement.plan !== 'trial') return null;

  const days = entitlement.trialDaysLeft ?? 0;
  const endsAt =
    trialStartedAt === null
      ? null
      : new Date(trialStartedAt.getTime() + TRIAL_DAYS * 86_400_000);

  // Quiet until it is nearly over.
  if (days > 5) return null;

  return (
    <div className="mt-4 rounded-lg border border-border-strong bg-surface-low px-4 py-3">
      <p className="text-sm font-semibold">
        باقي <span className="num">{days}</span>{' '}
        {days === 1 ? 'يوم' : days === 2 ? 'يومين' : 'أيام'} في تجربتك المجانية
        {endsAt !== null && (
          <>
            {' '}— بتخلص <span className="num">{dateLabel(endsAt)}</span>
          </>
        )}
      </p>
      <p className="mt-1 text-xs text-fg-muted">
        بعدها الدفتر والحاسبات بيفضلوا شغّالين،{' '}
        <Link
          href="/#pricing"
          className="font-semibold text-brand-ink underline-offset-4 hover:underline"
        >
          شوف الباقات ←
        </Link>
      </p>
    </div>
  );
}

/** The plan chip in «الإعدادات», and what it means in one line. */
export function PlanCard({
  entitlement,
  trialStartedAt,
  proUntil,
  onSubscribe,
}: {
  entitlement: Entitlement;
  trialStartedAt: Date | null;
  proUntil: Date | null;
  onSubscribe: () => void;
}) {
  const endsAt =
    trialStartedAt === null
      ? null
      : new Date(trialStartedAt.getTime() + TRIAL_DAYS * 86_400_000);

  return (
    <section className="rounded-lg border border-border-default bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold">باقتك</h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            entitlement.hasFullAccess
              ? 'bg-brand text-on-brand'
              : 'border border-border-strong text-fg-muted'
          }`}
        >
          {entitlement.plan === 'pro'
            ? 'Radar Pro'
            : entitlement.plan === 'trial'
              ? 'تجربة مجانية'
              : 'Radar Free'}
        </span>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-fg-muted">
        {entitlement.plan === 'pro' ? (
          proUntil === null ? (
            'اشتراكك شغّال، ومفيش تاريخ انتهاء مسجّل عليه.'
          ) : (
            <>
              اشتراكك شغّال لحد{' '}
              <span className="num">{dateLabel(proUntil)}</span>.
            </>
          )
        ) : entitlement.plan === 'trial' ? (
          <>
            باقي <span className="num">{entitlement.trialDaysLeft}</span> يوم
            {endsAt !== null && (
              <>
                {' '}— بتخلص <span className="num">{dateLabel(endsAt)}</span>
              </>
            )}
            . كل المميزات مفتوحة دلوقتي.
          </>
        ) : entitlement.trialExpired ? (
          'تجربتك خلصت. الدفتر والحاسبات شغّالين، والباقي محتاج اشتراك.'
        ) : (
          'الدفتر والحاسبات شغّالين. السوق والأسعار والتحليل بالـAI والأداء محتاجين اشتراك.'
        )}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSubscribe}
          className="rounded-md bg-brand px-5 py-2 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90"
        >
          {entitlement.plan === 'pro' ? 'جدّد الاشتراك' : 'اشترك'}
        </button>
        <Link
          href="/#pricing"
          className="rounded-md border border-border-default px-4 py-2 text-sm font-semibold text-fg-muted transition-colors hover:bg-surface-high hover:text-fg"
        >
          شوف الباقات
        </Link>
      </div>
    </section>
  );
}
