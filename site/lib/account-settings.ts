'use client';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { useCallback, useEffect, useState } from 'react';

import { firestore } from '@/lib/firebase';

/**
 * Capital, the per-trade risk ceiling, and the waiting threshold — read from
 * and written to the ACCOUNT, with this browser's copy as a cache.
 *
 * WHAT THIS REPLACES
 * These three used to live in localStorage and nowhere else, because the app
 * kept them in local Hive settings and never uploaded them. That meant a user
 * with 50,000 set here and 17,000 set on the phone got two different discipline
 * scores and two different over-risk verdicts for one trade, with nothing on
 * either screen able to say which was right. Every figure on both dashboards
 * divides by capital, so this was not a cosmetic split.
 *
 * WHERE IT LIVES: `users/{uid}/settings/risk` — a SUBCOLLECTION of the profile,
 * not fields on it. The profile is the one document an admin is allowed to
 * read, and capital is a user's portfolio size. See the long note in
 * firestore.rules; moving these up one level would hand every user's net
 * position to the operator and make the privacy policy's admin promise false.
 *
 * WHY localStorage IS STILL HERE
 * Purely as a cache, and it is never the authority. Without it the dashboard
 * renders one frame at the 17,000 default before the account document arrives,
 * and every number on screen visibly resettles. It also keeps the last known
 * rule usable when the read fails offline. The account always wins once it
 * answers.
 */

const KEYS = {
  capital: 'radar-capital',
  maxRisk: 'radar-max-risk',
  waiting: 'radar-waiting-days',
} as const;

/** The app's own defaults (lib/settings/settings.dart), so an untouched browser
 *  and an untouched install agree. */
export const DEFAULTS = {
  capital: 17000,
  maxRiskPercent: 0.02,
  waitingThresholdDays: 30,
};

export type LocalSettings = {
  capital: number;
  maxRiskPercent: number;
  waitingThresholdDays: number;
};

/**
 * What the UI is allowed to claim about where these numbers came from.
 *
 * `local` is not an error state — it is an offline browser holding a cached
 * rule, which is a true and useful thing to say. It exists so the interface
 * never presents a cached value as the account's.
 */
export type SettingsSource = 'loading' | 'account' | 'local';

const SETTINGS_DOC = ['settings', 'risk'] as const;

/**
 * Bounds mirror the ones firestore.rules enforces on write. Repeated on read
 * because a document written before those rules existed is not covered by them,
 * and because a bad value here silently corrupts every derived figure rather
 * than failing.
 */
function sanitise(raw: Record<string, unknown>, fallback: LocalSettings): LocalSettings {
  const num = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value) ? value : null;

  const capital = num(raw.capital);
  const maxRisk = num(raw.maxRiskPercent);
  const waiting = num(raw.waitingThresholdDays);

  return {
    capital: capital !== null && capital > 0 ? capital : fallback.capital,
    maxRiskPercent:
      maxRisk !== null && maxRisk > 0 && maxRisk <= 1
        ? maxRisk
        : fallback.maxRiskPercent,
    waitingThresholdDays:
      waiting !== null && waiting >= 1
        ? Math.round(waiting)
        : fallback.waitingThresholdDays,
  };
}

function readCache(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  } catch {
    // Private browsing denies access. Defaults are a fine answer.
    return fallback;
  }
}

function writeCache(settings: LocalSettings): void {
  try {
    localStorage.setItem(KEYS.capital, String(settings.capital));
    localStorage.setItem(KEYS.maxRisk, String(settings.maxRiskPercent));
    localStorage.setItem(KEYS.waiting, String(settings.waitingThresholdDays));
  } catch {
    // The values still apply for this session.
  }
}

export function useAccountSettings(user: User | null) {
  // Seeded with the defaults rather than with localStorage, then hydrated in an
  // effect: reading storage during render would differ between the server-built
  // HTML and the first client render, which is a hydration mismatch.
  const [settings, setSettings] = useState<LocalSettings>(DEFAULTS);
  const [source, setSource] = useState<SettingsSource>('loading');

  const uid = user?.uid ?? null;

  useEffect(() => {
    let cancelled = false;

    const cached: LocalSettings = {
      capital: readCache(KEYS.capital, DEFAULTS.capital),
      maxRiskPercent: readCache(KEYS.maxRisk, DEFAULTS.maxRiskPercent),
      waitingThresholdDays: readCache(
        KEYS.waiting,
        DEFAULTS.waitingThresholdDays
      ),
    };
    setSettings(cached);

    if (!uid) {
      setSource('local');
      return;
    }

    setSource('loading');
    (async () => {
      try {
        const snap = await getDoc(doc(firestore(), 'users', uid, ...SETTINGS_DOC));
        if (cancelled) return;
        if (!snap.exists()) {
          // An account that predates this feature, or a brand new one. The
          // cached rule stands and the first edit publishes it — nothing is
          // written here, because writing on read would stamp one browser's
          // cache onto an account the phone may already have configured.
          setSource('local');
          return;
        }
        setSettings(sanitise(snap.data(), cached));
        setSource('account');
      } catch {
        // Offline, or a rules denial. The cache is what we have, and the UI
        // says so rather than presenting it as the account's rule.
        if (!cancelled) setSource('local');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid]);

  // Deliberately NOT `setSettings(prev => …)` with the write inside. A state
  // updater must be pure, and reactStrictMode invokes it twice in development —
  // a Firestore write in there fires twice per edit.
  const update = useCallback(
    (next: Partial<LocalSettings>) => {
      const merged = { ...settings, ...next };
      setSettings(merged);
      writeCache(merged);
      if (!uid) return;

      // Whole document, no merge — the three values are one rule, and the app
      // writes it the same way (FirestoreSyncService.pushRiskSettings).
      void setDoc(doc(firestore(), 'users', uid, ...SETTINGS_DOC), merged)
        .then(() => setSource('account'))
        .catch(() => setSource('local'));
    },
    [settings, uid]
  );

  return { settings, update, source };
}
