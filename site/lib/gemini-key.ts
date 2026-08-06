'use client';

/**
 * The user's own Gemini key, kept on this device.
 *
 * DELIBERATELY NOT IN FIRESTORE, even though the rules would only let its owner
 * read it. It is a live third-party credential that bills the user, and the
 * app keeps its copy in Hive on the phone for the same reason — a credential
 * that never leaves the device it was typed on cannot be exposed by a mistake
 * in our rules, our backups or our admin console.
 *
 * The visible cost is that it does not sync: pasting it here does not put it on
 * the phone, and the settings panel says so rather than letting somebody
 * discover it.
 */
const STORAGE_KEY = 'radar.geminiApiKey';

export function readGeminiKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    // Private mode, or storage disabled. The AI reader then reports itself as
    // unconfigured, which is exactly what it is.
    return '';
  }
}

export function writeGeminiKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = key.trim();
    if (trimmed === '') window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, trimmed);
  } catch {
    // Nothing to tell the user that the empty field does not already say.
  }
}
