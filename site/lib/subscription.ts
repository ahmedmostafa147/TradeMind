/**
 * Who is allowed to use what.
 *
 * MIRROR OF lib/billing/entitlements.dart, per CLAUDE.md §5 — same plans, same
 * constant, same rounding, same treatment of a lapsed subscriber.
 *
 * **THIS DECIDES THE SHAPE OF THE UI AND NOTHING ELSE.** The gate that matters
 * is in firestore.rules: a user cannot write their own plan, and the trial's
 * start is stamped by the server. Editing this in a browser console reveals a
 * locked panel and grants nothing.
 */

export type Plan = 'trial' | 'pro' | 'free';

/**
 * The trial's length, in days.
 *
 * NOT STORED WITH THE SUBSCRIPTION — deliberately. The document holds only the
 * server-stamped start, because there is no Firestore sentinel for "server time
 * plus fourteen days", so an end date would have to come from the device's
 * clock and could be edited. Must stay identical to kTrialDays in
 * entitlements.dart.
 */
export const TRIAL_DAYS = 14;

/** The paid surfaces, one entry per thing the pricing page sells. */
export type Feature =
  /** «تتبّع سيولة المستثمرين» — the EGX investor-flow tables. */
  | 'marketFlows'
  /** Last-close prices, and the unrealised profit computed from them. */
  | 'livePrices'
  /** «قراءة التوصيات بالذكاء الاصطناعي». */
  | 'aiReader'
  /**
   * «الأداء» and «التحليلات».
   *
   * Recording and reviewing trades is NOT here and never will be: the free plan
   * promises «تسجيل ومتابعة الصفقات الأساسية», and a journal that stops letting
   * you write in it is not a limited plan.
   */
  | 'analytics';

export const PAID_FEATURES: Feature[] = [
  'marketFlows',
  'livePrices',
  'aiReader',
  'analytics',
];

export type Entitlement = {
  plan: Plan;
  /** Whole days remaining in the trial, floored at zero. Null off the trial. */
  trialDaysLeft: number | null;
  /** True when the trial ran out and nothing was bought. */
  trialExpired: boolean;
  /**
   * Everything the paid plan opens. The trial IS full access — that is what a
   * trial is, and gating it would make the fourteen days worthless.
   */
  hasFullAccess: boolean;
};

export const FREE_ENTITLEMENT: Entitlement = {
  plan: 'free',
  trialDaysLeft: null,
  trialExpired: false,
  hasFullAccess: false,
};

export function can(entitlement: Entitlement, _feature: Feature): boolean {
  return entitlement.hasFullAccess;
}

/** Worth showing a countdown for. A fortnight left is not news; three days is. */
export function shouldWarnAboutTrial(entitlement: Entitlement): boolean {
  return entitlement.plan === 'trial' && (entitlement.trialDaysLeft ?? 99) <= 5;
}

const DAY_MS = 86_400_000;

/**
 * Reads the stored subscription into an answer.
 *
 * `proUntil` of null is treated as OPEN-ENDED rather than expired: the only way
 * that field is written is by an admin activating a payment, and reading their
 * omission as "already lapsed" would lock out the customer who just paid.
 */
export function entitlementOf({
  storedPlan,
  trialStartedAt,
  proUntil,
  now,
}: {
  storedPlan: string | null;
  trialStartedAt: Date | null;
  proUntil: Date | null;
  now: Date;
}): Entitlement {
  if (storedPlan === 'pro') {
    if (proUntil === null || proUntil.getTime() > now.getTime()) {
      return {
        plan: 'pro',
        trialDaysLeft: null,
        trialExpired: false,
        hasFullAccess: true,
      };
    }
    // Paid once, lapsed since. Not a trial — so no countdown and no "your trial
    // ended" message for somebody who was a paying customer.
    return FREE_ENTITLEMENT;
  }

  if (storedPlan === 'trial' && trialStartedAt !== null) {
    const endsAt = trialStartedAt.getTime() + TRIAL_DAYS * DAY_MS;
    if (endsAt > now.getTime()) {
      // Ceil, so the last partial day reads as «باقي يوم» rather than «باقي 0
      // يوم» while the trial is genuinely still live.
      const days = Math.ceil((endsAt - now.getTime()) / DAY_MS);
      return {
        plan: 'trial',
        trialDaysLeft: days < 0 ? 0 : days,
        trialExpired: false,
        hasFullAccess: true,
      };
    }
    return {
      plan: 'free',
      trialDaysLeft: 0,
      trialExpired: true,
      hasFullAccess: false,
    };
  }

  // No document yet, an unknown plan string, or a trial row with no start date
  // — all of which mean "nothing has been granted", which is free.
  return FREE_ENTITLEMENT;
}

/** When the trial ends, for display. Null when the account is not on one. */
export function trialEndsAt(trialStartedAt: Date | null): Date | null {
  return trialStartedAt === null
    ? null
    : new Date(trialStartedAt.getTime() + TRIAL_DAYS * DAY_MS);
}

/** Prices, exactly as the pricing section publishes them. */
export const PLAN_PRICES = {
  monthly: { price: 99, label: 'شهرياً' },
  semiAnnual: { price: 499, label: 'كل 6 أشهر' },
  annual: { price: 799, label: 'سنوياً' },
} as const;
