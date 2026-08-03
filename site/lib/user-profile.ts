import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';

import { firestore } from '@/lib/firebase';

/**
 * Writes `users/{uid}` from the browser — the web half of the app's
 * UserProfileService.
 *
 * WHY THIS EXISTS
 * Until now only the Flutter app wrote this document, so anybody who created
 * their account on the website was invisible: not in the admin's user list, not
 * in its count, and unreachable by any query — Firebase Auth cannot be
 * enumerated without the Admin SDK, which is the whole reason the collection
 * exists. The web is a real product surface now, so it has to register its
 * users like the app does.
 *
 * THE FIELD LIST IS ENFORCED SERVER-SIDE. firestore.rules pins the shape with
 * `hasOnly([...])` and additionally requires `email` and `displayName` to be
 * strings on EVERY create and update. Because `set(merge:true)` presents the
 * MERGED document to the rules, any write that omits them on a document that
 * does not have them yet is rejected outright — so both are always sent, and
 * displayName always resolves to a non-empty string.
 */

/** Matches the app's `platform` values, which are Dart's TargetPlatform names. */
const PLATFORM = 'web';

/** Bumped with the site, not the app — they version independently. */
export const SITE_VERSION = '1.0.0';

/** The rule caps these; trimming here turns a silent denial into a clean write. */
const MAX_EMAIL = 320;
const MAX_NAME = 120;

/**
 * First non-blank of: the Firebase profile name, the email's local part, a
 * label. Never empty — the rules demand a string, and callers render `name[0]`.
 */
function displayNameOf(user: User): string {
  const candidates = [
    user.displayName ?? '',
    (user.email ?? '').trim().split('@')[0],
    'مستخدم',
  ];
  for (const candidate of candidates) {
    const value = candidate.trim();
    if (value) return value.slice(0, MAX_NAME);
  }
  return 'مستخدم';
}

/**
 * Creates or refreshes the profile. Called once per session, after sign-in.
 *
 * `createdAt` is written only when the document does not have one, so a later
 * sign-in cannot reset a user's join date — which would quietly corrupt every
 * retention figure the admin dashboard shows. FieldValue is not conditional, so
 * the guard is the read below, exactly as the Dart service does it.
 *
 * Best-effort, like the rest of sync: a failure here must never surface to
 * someone who only asked to sign in.
 */
export async function upsertProfile(user: User): Promise<void> {
  if (!user.uid) return;
  const ref = doc(firestore(), 'users', user.uid);

  try {
    await setDoc(
      ref,
      {
        email: (user.email ?? '').slice(0, MAX_EMAIL),
        displayName: displayNameOf(user),
        lastSeenAt: serverTimestamp(),
        platform: PLATFORM,
        appVersion: SITE_VERSION,
      },
      { merge: true }
    );

    const snap = await getDoc(ref);
    if (snap.exists() && snap.data().createdAt == null) {
      await setDoc(ref, { createdAt: serverTimestamp() }, { merge: true });
    }
  } catch {
    // Profile writes are telemetry for the operator, not something the user
    // asked for. Failing one must not surface as a sign-in error.
  }
}

/**
 * Updates the activity counters the admin dashboard lists.
 *
 * Counts, never content — this is what lets the operator tell an active user
 * from a dormant one without the rules ever granting a trade read.
 *
 * The app declares this same method and never calls it, which is why the
 * «صفقات» column has always shown «—». Calling it from here fixes the column
 * for anyone who opens the browser, because the counts are recomputed from the
 * full collection on every load — so they self-correct even for trades that
 * were added on the phone.
 */
export async function updateCounts(
  uid: string,
  user: User,
  tradeCount: number,
  watchlistCount: number
): Promise<void> {
  if (!uid) return;
  try {
    await setDoc(
      doc(firestore(), 'users', uid),
      {
        // email and displayName ride along because the rules require them on
        // the merged document — a counters-only write to a profile that does
        // not exist yet would be denied.
        email: (user.email ?? '').slice(0, MAX_EMAIL),
        displayName: displayNameOf(user),
        tradeCount,
        watchlistCount,
        lastSeenAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch {
    // Same reasoning: a counter is not worth an error message.
  }
}
