'use client';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { useCallback, useEffect, useState } from 'react';

import { firestore } from '@/lib/firebase';

/**
 * The account's risk rule — five fields, read from and written to the ACCOUNT,
 * with this browser's copy as a cache.
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
  takeProfit: 'radar-default-take-profit',
  stopLoss: 'radar-default-stop-loss',
} as const;

/** The app's own defaults (lib/settings/settings.dart), so an untouched browser
 *  and an untouched install agree. */
export const DEFAULTS = {
  /**
   * UNSET, not a number. It was 17,000 — a figure nobody chose, driving every
   * position size, every over-risk verdict and the whole discipline score for
   * anyone who never opened this panel. Every calculation here already answers
   * null for a capital of 0 (`safeDiv` returns null, `maxLossPerTrade` returns
   * 0), so the interface can say «لسه محددش» instead of a confident wrong
   * number. Mirrors Settings.defaultCapital in lib/settings/settings.dart.
   */
  capital: 0,
  maxRiskPercent: 0.02,
  waitingThresholdDays: 30,
  defaultTakeProfitPercent: 0.05,
  defaultStopLossPercent: 0.02,
};

export type LocalSettings = {
  capital: number;
  maxRiskPercent: number;
  waitingThresholdDays: number;
  /**
   * The levels an open trade with no target or stop of its own is scored
   * against. They used to be device-only on the phone and hardcoded at 5% and
   * 2% here, so the same trade got two verdicts for anyone who changed a
   * default; they joined this document when the app moved online.
   */
  defaultTakeProfitPercent: number;
  defaultStopLossPercent: number;
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
  const takeProfit = num(raw.defaultTakeProfitPercent);
  const stopLoss = num(raw.defaultStopLossPercent);

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
    defaultTakeProfitPercent:
      takeProfit !== null && takeProfit > 0 && takeProfit <= 1
        ? takeProfit
        : fallback.defaultTakeProfitPercent,
    defaultStopLossPercent:
      stopLoss !== null && stopLoss > 0 && stopLoss < 1
        ? stopLoss
        : fallback.defaultStopLossPercent,
  };
}

/**
 * `allowZero` exists for capital alone, where 0 is a real answer — «لسه
 * محددش» — and not the absence of one. Everything else is a rate or a day
 * count, where 0 is garbage and the default is the better answer.
 */
function readCache(key: string, fallback: number, allowZero = false): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const value = Number(raw);
    if (!Number.isFinite(value)) return fallback;
    return value > 0 || (allowZero && value === 0) ? value : fallback;
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
    localStorage.setItem(
      KEYS.takeProfit,
      String(settings.defaultTakeProfitPercent)
    );
    localStorage.setItem(KEYS.stopLoss, String(settings.defaultStopLossPercent));
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
      capital: readCache(KEYS.capital, DEFAULTS.capital, true),
      maxRiskPercent: readCache(KEYS.maxRisk, DEFAULTS.maxRiskPercent),
      waitingThresholdDays: readCache(
        KEYS.waiting,
        DEFAULTS.waitingThresholdDays
      ),
      defaultTakeProfitPercent: readCache(
        KEYS.takeProfit,
        DEFAULTS.defaultTakeProfitPercent
      ),
      defaultStopLossPercent: readCache(
        KEYS.stopLoss,
        DEFAULTS.defaultStopLossPercent
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

      // `capital` is OMITTED while it is unset (0), never sent as a zero:
      // firestore.rules requires `capital > 0`, so a zero would fail the write
      // and take the other four fields down with it — silently, since the
      // rejection lands in the catch below as a source change and nothing else.
      //
      // And `merge: true` BECAUSE of that omission. The four other values are
      // still all present on every write, so this is the same document a full
      // replace would have written whenever capital is set; the difference is
      // the unset case, where a replace would delete a capital the phone had
      // configured and this browser had simply failed to read.
      const { capital, ...rest } = merged;
      const payload = capital > 0 ? merged : rest;

      void setDoc(doc(firestore(), 'users', uid, ...SETTINGS_DOC), payload, {
        merge: true,
      })
        .then(() => setSource('account'))
        .catch(() => setSource('local'));
    },
    [settings, uid]
  );

  return { settings, update, source };
}
