'use client';

import type { User } from 'firebase/auth';
import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { firestore } from '@/lib/firebase';
import {
  entitlementOf,
  FREE_ENTITLEMENT,
  type Entitlement,
} from '@/lib/subscription';

/** The stored document, as written by the client (create) and admin (update). */
export type Subscription = {
  plan: string | null;
  trialStartedAt: Date | null;
  proUntil: Date | null;
  note: string | null;
};

const toDate = (value: unknown): Date | null =>
  value instanceof Timestamp ? value.toDate() : null;

/**
 * The account's subscription, live, and the trial it grants on first sight.
 *
 * THE TRIAL STARTS ITSELF, ONCE. There is no server to do it at sign-up — this
 * project has no service account by design — so the client asks for it and the
 * RULES decide whether that ask is honest: the create is only accepted when the
 * document does not exist, the plan is exactly `trial`, and `trialStartedAt`
 * equals the server's own clock. A second attempt, a forged date, or a
 * self-promotion to `pro` is rejected server-side, so the worst a tampered
 * client achieves is asking for something it already has.
 *
 * `null` while the first read is in flight — distinct from FREE, because
 * rendering a paywall over somebody's paid account for the half-second before
 * their subscription loads is the one failure mode worth designing out.
 */
export function useSubscription(user: User | null): {
  entitlement: Entitlement | null;
  subscription: Subscription | null;
} {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setReady(false);
      return;
    }

    const ref = doc(firestore(), 'users', user.uid, 'billing', 'subscription');
    let asked = false;

    const stop = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setSubscription(null);
          setReady(true);
          // Ask once per mount. A denial is silent and correct: it means the
          // document already exists (a race with another tab) or the write was
          // not honest, and the listener will deliver whatever is really there.
          if (!asked) {
            asked = true;
            void setDoc(ref, {
              plan: 'trial',
              trialStartedAt: serverTimestamp(),
            }).catch(() => {});
          }
          return;
        }
        const data = snap.data();
        setSubscription({
          plan: typeof data.plan === 'string' ? data.plan : null,
          trialStartedAt: toDate(data.trialStartedAt),
          proUntil: toDate(data.proUntil),
          note: typeof data.note === 'string' ? data.note : null,
        });
        setReady(true);
      },
      () => {
        // Offline, or rules denied the read. Free is the safe shape: it shows
        // the paywall rather than opening paid surfaces to an unknown account.
        setSubscription(null);
        setReady(true);
      }
    );

    return () => stop();
  }, [user]);

  if (!user || !ready) return { entitlement: null, subscription: null };

  return {
    entitlement:
      subscription === null
        ? FREE_ENTITLEMENT
        : entitlementOf({
            storedPlan: subscription.plan,
            trialStartedAt: subscription.trialStartedAt,
            proUntil: subscription.proUntil,
            now: new Date(),
          }),
    subscription,
  };
}
