'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Capital, risk limit and the waiting threshold, kept in this browser.
 *
 * WHY LOCAL AND NOT SYNCED
 * The app keeps these in local Hive settings and has never uploaded them —
 * `users/{uid}` carries no `capital` field, and firestore.rules would reject
 * one anyway, because its whitelist does not list it. So there is nothing to
 * read from the account.
 *
 * The alternative to storing them here was to keep hiding every figure that
 * needs capital, which is what this dashboard did before: no risk percent, no
 * discipline score (the "risk within limit" component is unverifiable without
 * capital, so every trade silently lost 20 points), and no over-risk warnings.
 * Three real features suppressed to avoid one honest label.
 *
 * So they live in localStorage and every surface that uses them says where they
 * came from. What must NOT happen is these being presented as the account's
 * settings — a user who sets 50,000 here and 17,000 on the phone would get two
 * different discipline scores for one trade and no way to tell which is right.
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

function read(key: string, fallback: number): number {
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

export function useLocalSettings() {
  // Seeded with the defaults rather than with localStorage, then hydrated in an
  // effect: reading storage during render would differ between the server-built
  // HTML and the first client render, which is a hydration mismatch.
  const [settings, setSettings] = useState<LocalSettings>({
    capital: DEFAULTS.capital,
    maxRiskPercent: DEFAULTS.maxRiskPercent,
    waitingThresholdDays: DEFAULTS.waitingThresholdDays,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSettings({
      capital: read(KEYS.capital, DEFAULTS.capital),
      maxRiskPercent: read(KEYS.maxRisk, DEFAULTS.maxRiskPercent),
      waitingThresholdDays: read(KEYS.waiting, DEFAULTS.waitingThresholdDays),
    });
    setReady(true);
  }, []);

  const update = useCallback((next: Partial<LocalSettings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...next };
      try {
        localStorage.setItem(KEYS.capital, String(merged.capital));
        localStorage.setItem(KEYS.maxRisk, String(merged.maxRiskPercent));
        localStorage.setItem(KEYS.waiting, String(merged.waitingThresholdDays));
      } catch {
        // The values still apply for this session.
      }
      return merged;
    });
  }, []);

  return { settings, update, ready };
}
