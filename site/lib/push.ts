'use client';

/**
 * Turning browser notifications on and off.
 *
 * ── THE W3C PUSH API, NOT FIREBASE CLOUD MESSAGING ──────────────────────────
 *
 * The reasoning is in worker/radar_alerts/send.py, which is the other half of
 * this: the app is not on Play so a push aimed at it reaches nobody, every user
 * is on the web, and the PWA already registers a service worker — which is the
 * entire prerequisite. FCM would add `firebase/messaging` to the bundle and an
 * FCM-shaped payload to a worker that is currently thirty readable lines. The
 * subscription below is a plain object the browser hands us.
 *
 * ── THE PERMISSION PROMPT IS NEVER ASKED FOR ON LOAD ────────────────────────
 *
 * `Notification.requestPermission()` may only be called from a user gesture in
 * every browser that matters, and a page that asks the moment it opens gets
 * denied — permanently, with no second chance, because a denial is sticky and
 * there is no API to clear it. So [enablePush] runs from a click and nowhere
 * else, and the UI says what the notifications are before the browser's own
 * dialog appears.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { firestore } from '@/lib/firebase';

/**
 * The VAPID public key, shipped in the bundle because it is meant to be.
 *
 * It identifies our sender to the push service; the private half — the one that
 * can actually make a notification appear — lives only in the Cloud Run job's
 * environment. Missing here means the feature is not configured, which the UI
 * says rather than failing at the moment of the click.
 */
export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

export type PushSupport =
  | 'ready'
  /** No service worker, no PushManager, or no Notification — an old browser. */
  | 'unsupported'
  /**
   * iOS Safari before the PWA is installed. Apple gates the Push API on the
   * page running from the home screen, so the button would ask for a permission
   * the browser will not grant. Detected rather than attempted, because the
   * failure is a silent no-op otherwise.
   */
  | 'needs-install'
  /** The key is not set on this deployment. */
  | 'not-configured'
  /** The user said no. A denial is sticky and cannot be re-prompted. */
  | 'denied';

export function pushSupport(): PushSupport {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    // iOS Safari exposes neither until the PWA is installed, so tell the reader
    // the thing they can act on rather than "your browser cannot".
    return isIosSafari() && !isStandalone() ? 'needs-install' : 'unsupported';
  }
  if (typeof Notification === 'undefined') return 'unsupported';
  if (VAPID_PUBLIC_KEY === '') return 'not-configured';
  if (Notification.permission === 'denied') return 'denied';
  return 'ready';
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua);
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari's own, non-standard flag.
    (navigator as { standalone?: boolean }).standalone === true
  );
}

/**
 * The base64url the Push API wants as raw bytes.
 *
 * `applicationServerKey` takes a BufferSource, and handing it the string works
 * in some browsers and throws in others — so it is converted here rather than
 * relied upon. The padding and the two substituted characters are what make
 * this base64url rather than base64.
 */
function keyToBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const padded = base64url.padEnd(
    base64url.length + ((4 - (base64url.length % 4)) % 4),
    '='
  );
  const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  // Backed by an explicit ArrayBuffer rather than `new Uint8Array(length)`:
  // TypeScript types the latter as `Uint8Array<ArrayBufferLike>`, which could be
  // a SharedArrayBuffer and so is not assignable to the `BufferSource` that
  // `applicationServerKey` takes.
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * A stable document id for one browser's subscription.
 *
 * DERIVED FROM THE ENDPOINT, so re-enabling on the same browser overwrites its
 * own row instead of adding another. Without this, every toggle would leave a
 * duplicate behind and the worker would send the same alert to the same device
 * as many times as the reader had ever pressed the button.
 *
 * Hashed rather than sanitised because an endpoint is a URL and Firestore
 * document ids may not contain `/`.
 */
async function subscriptionId(endpoint: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(endpoint)
  );
  return Array.from(new Uint8Array(digest))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Asks the browser, then stores the subscription. Must be called from a click.
 *
 * Returns the resulting support state so the caller can render the outcome —
 * `denied` when the reader said no, which is permanent for that origin.
 */
export async function enablePush(uid: string): Promise<PushSupport> {
  const support = pushSupport();
  if (support !== 'ready') return support;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';

  const registration = await navigator.serviceWorker.ready;

  // An existing subscription is reused rather than replaced: the browser
  // returns the same endpoint anyway, and unsubscribing first would invalidate
  // a row the worker may be mid-send against.
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      // Required by every browser: a push that shows nothing is not allowed.
      userVisibleOnly: true,
      applicationServerKey: keyToBytes(VAPID_PUBLIC_KEY),
    }));

  const raw = subscription.toJSON() as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  if (!raw.endpoint || !raw.keys?.p256dh || !raw.keys?.auth) return 'unsupported';

  await setDoc(
    doc(firestore(), 'users', uid, 'push', await subscriptionId(raw.endpoint)),
    {
      endpoint: raw.endpoint,
      keys: { p256dh: raw.keys.p256dh, auth: raw.keys.auth },
      // Server clock, required by firestore.rules for the same reason every
      // other stamp in this project is.
      createdAt: serverTimestamp(),
    }
  );

  return 'ready';
}

/**
 * Turns them off everywhere this browser knows about.
 *
 * BOTH HALVES, AND THE FIRESTORE ROW FIRST. If the browser unsubscribes and the
 * delete then fails, the worker keeps a dead endpoint and pushes to it until the
 * service answers 410 — noisy but self-healing. The other order leaves a live
 * subscription with no row, which the reader cannot turn off from any screen.
 */
export async function disablePush(uid: string): Promise<void> {
  const rows = await getDocs(collection(firestore(), 'users', uid, 'push'));
  await Promise.all(rows.docs.map((row) => deleteDoc(row.ref)));

  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) await subscription.unsubscribe();
}

/** True when this browser currently holds a push subscription. */
export async function isPushEnabled(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return false;
  }
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return false;
  return (await registration.pushManager.getSubscription()) !== null;
}
