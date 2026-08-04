'use client';

import { useEffect, useState } from 'react';

/**
 * Service worker registration and the install button.
 *
 * The two live together because they are one mechanism: Chrome only fires
 * `beforeinstallprompt` once a service worker WITH A FETCH HANDLER is
 * registered, so the button below cannot appear unless the registration above
 * succeeded. Splitting them across files would hide that dependency.
 */

/**
 * The event Chrome fires when the install criteria are met. Not in lib.dom yet,
 * and it is the whole contract this file depends on, so it is written out
 * rather than cast to `any`.
 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

declare global {
  interface Window {
    /**
     * Set by the inline capture script in app/layout.tsx, which runs in <head>
     * long before this component exists. Reading it on mount is what makes the
     * button immune to the event having already fired.
     */
    __radarInstallPrompt: BeforeInstallPromptEvent | null;
  }
}

/**
 * Registers /sw.js. Mounted once, in the root layout.
 *
 * Registration is deferred to the `load` event: a service worker install
 * downloads the offline shell, and doing that while the page is still fetching
 * its own critical resources makes first paint slower on exactly the slow
 * connections the worker exists to help.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // A worker registered from `next dev` caches development chunks that stop
    // existing on the next rebuild, and then serves them from cache — the page
    // breaks in a way that survives a refresh and confuses everyone. Production
    // only.
    if (process.env.NODE_ENV !== 'production') return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        // Nothing to tell the user: without a worker the site is a normal
        // website, which is what they already had.
      });
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register);

    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}

/**
 * «ثبّت التطبيق» — shown only when the browser has actually offered it.
 *
 * Rendering nothing is the correct state for most visitors, and deliberately
 * so. iOS Safari never fires this event (installing there is Share → «أضف إلى
 * الشاشة الرئيسية», a menu no site can open), and an already-installed app has
 * nothing to install. A button that opened instructions instead would be a
 * permanent piece of chrome that does nothing for the majority who see it — so
 * the iOS path is explained in the footer, where it costs nobody a click.
 */
export function InstallButton({ className = '' }: { className?: string }) {
  // Starts null rather than reading window during render: the server renders
  // this too, and a value that differs between the server HTML and the first
  // client render is a hydration mismatch. The effect below picks it up on the
  // very next tick.
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // The event may have fired before React hydrated — see the capture script
    // in app/layout.tsx. Reading the stash first is what makes this work
    // regardless of which happened in what order.
    const sync = () => setPrompt(window.__radarInstallPrompt ?? null);
    sync();

    window.addEventListener('radar:installable', sync);
    window.addEventListener('radar:installed', sync);
    return () => {
      window.removeEventListener('radar:installable', sync);
      window.removeEventListener('radar:installed', sync);
    };
  }, []);

  if (!prompt) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        // A saved prompt can only be used once. Clearing BOTH the stash and the
        // local state first means a second click cannot throw «already used»,
        // and the button disappears whether the user accepts or dismisses — the
        // browser will offer again on a later visit if they declined. Clearing
        // the stash matters as much as the state: the marketing header and the
        // dashboard shell each render one of these, so a spent event left in
        // the stash would arm whichever one mounts next.
        window.__radarInstallPrompt = null;
        setPrompt(null);
        window.dispatchEvent(new Event('radar:installed'));
        try {
          await prompt.prompt();
          await prompt.userChoice;
        } catch {
          // The user closed the dialog. Not an error worth reporting.
        }
      }}
      className={`rounded-md border border-border-strong px-3 py-2 text-sm font-semibold transition-colors hover:bg-surface-high ${className}`}
    >
      ثبّت التطبيق
    </button>
  );
}
