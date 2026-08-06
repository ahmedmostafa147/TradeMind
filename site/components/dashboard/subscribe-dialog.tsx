'use client';

import { useState } from 'react';

import { site } from '@/lib/site';
import { PLAN_PRICES } from '@/lib/subscription';

/**
 * «اطلب الاشتراك» — how somebody actually becomes a paying customer today.
 *
 * THERE IS NO CHECKOUT, ON PURPOSE. No gateway is wired up, and on Android a
 * digital subscription has to go through Play Billing rather than a card form
 * of ours, so a "pay now" button would be a lie on one surface and a policy
 * violation on the other. What exists instead is the honest version of the same
 * transaction: the user picks a period, sends a message with their account
 * already filled in, pays however was agreed, and an admin flips the plan.
 *
 * The account email and uid are in the message because the admin needs both to
 * find the right row, and asking a customer to copy their own user id out of a
 * settings screen is how a manual process turns into a support thread.
 */
type Period = keyof typeof PLAN_PRICES;

const PERIODS: { id: Period; months: number; note?: string }[] = [
  { id: 'monthly', months: 1 },
  { id: 'semiAnnual', months: 6, note: 'توفير 16%' },
  { id: 'annual', months: 12, note: 'توفير 33%' },
];

export function SubscribeDialog({
  email,
  uid,
  onClose,
}: {
  email: string | null;
  uid: string;
  onClose: () => void;
}) {
  const [period, setPeriod] = useState<Period>('annual');
  const plan = PLAN_PRICES[period];
  const months = PERIODS.find((p) => p.id === period)?.months ?? 1;

  const subject = `طلب اشتراك رادار Pro — ${plan.price} ج.م ${plan.label}`;
  const body = [
    'عايز أشترك في رادار Pro.',
    '',
    `الباقة: ${plan.label} — ${plan.price} ج.م (${months} شهر)`,
    `البريد المسجّل: ${email ?? '—'}`,
    `معرّف الحساب: ${uid}`,
    '',
    'ابعتوا لي طريقة الدفع من فضلكم.',
  ].join('\n');

  const mailto = `mailto:${site.contactEmail}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-5"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscribe-title"
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border-default bg-surface p-4 shadow-2xl sm:rounded-2xl sm:p-5"
      >
        <div className="flex items-center gap-3">
          <h2 id="subscribe-title" className="flex-1 text-lg font-bold">
            اشترك في رادار Pro
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="rounded-md px-2 py-1 text-fg-muted transition-colors hover:bg-surface-high hover:text-fg"
          >
            ✕
          </button>
        </div>

        <fieldset className="mt-4">
          <legend className="text-xs font-semibold text-fg-muted">
            اختار المدة
          </legend>
          <div className="mt-2 space-y-2">
            {PERIODS.map((option) => {
              const price = PLAN_PRICES[option.id];
              const selected = period === option.id;
              return (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-md border px-4 py-3 transition-colors ${
                    selected
                      ? 'border-brand-ink bg-surface-high'
                      : 'border-border-default hover:bg-surface-high'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="period"
                      checked={selected}
                      onChange={() => setPeriod(option.id)}
                      className="size-4 accent-[var(--color-brand)]"
                    />
                    <span className="text-sm font-semibold">{price.label}</span>
                    {option.note && (
                      <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-on-brand">
                        {option.note}
                      </span>
                    )}
                  </span>
                  <span className="num font-bold">
                    {price.price}{' '}
                    <span className="text-xs font-normal text-fg-muted">
                      ج.م
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <a
          href={mailto}
          className="mt-5 block rounded-md bg-brand px-5 py-3 text-center text-sm font-bold text-on-brand transition-opacity hover:opacity-90"
        >
          ابعت طلب الاشتراك
        </a>

        <p className="mt-3 text-xs leading-relaxed text-fg-subtle">
          هيفتح برنامج البريد عندك برسالة جاهزة فيها بياناتك. بنرد بطريقة الدفع،
          وأول ما تدفع بنفعّل الاشتراك على حسابك — وهيشتغل على الموقع وعلى
          التطبيق بنفس الحساب على طول.
        </p>

        {/* Said outright rather than discovered. A user who expects a card form
            and finds an email draft should have been told a sentence earlier. */}
        <p className="mt-2 text-xs leading-relaxed text-fg-subtle">
          الدفع لسه بيتم يدوي — مفيش بوابة دفع أونلاين لحد دلوقتي.
        </p>
      </div>
    </div>
  );
}
