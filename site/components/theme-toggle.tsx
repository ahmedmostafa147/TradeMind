'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'tradepilot-theme';

/**
 * Light/dark switch.
 *
 * The button renders disabled-looking-but-inert markup on the server and only
 * commits to an icon after mount. The theme at paint time comes from either
 * localStorage or the system preference, and the server cannot know either —
 * rendering a guess would produce a hydration mismatch and, worse, a visibly
 * wrong icon next to a correctly themed page.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored);
      return;
    }
    setTheme(
      window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
    );
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private browsing denies writes. The theme still applies for this page.
    }
  }

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      // Not aria-pressed: this is a mode switch, not a toggle button whose
      // "on" state a screen reader should announce as pressed.
      aria-label={isDark ? 'التبديل إلى المظهر الفاتح' : 'التبديل إلى المظهر الداكن'}
      title={isDark ? 'المظهر الفاتح' : 'المظهر الداكن'}
      className="grid size-9 place-items-center rounded-md border border-border-default text-fg-muted transition-colors hover:bg-surface-high hover:text-fg"
    >
      {theme === null ? (
        <span className="size-4" aria-hidden />
      ) : isDark ? (
        <SunIcon />
      ) : (
        <MoonIcon />
      )}
    </button>
  );
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className="size-4"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}
