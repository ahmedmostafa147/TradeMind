import { site } from '@/lib/site';

/**
 * The download call-to-action, in one place because it appears three times and
 * has a state that is easy to get wrong.
 *
 * While `site.playStoreUrl` is null the app is not published, so this renders
 * as plain non-interactive text rather than a link. Shipping a button that
 * looks clickable and goes nowhere — or worse, to a Play 404 — is the single
 * fastest way to lose someone who arrived from a shared post.
 *
 * The waiting copy names THE ANDROID APP, not the product. «قريبًا على Google
 * Play» on its own reads as "this thing does not exist yet" and quietly
 * contradicts the two working sign-in buttons sitting beside it. Radar exists;
 * it is the Android build that is pending.
 */
export function DownloadButton({
  variant = 'primary',
  className = '',
}: {
  variant?: 'primary' | 'inverse';
  className?: string;
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold transition-colors';

  if (!site.playStoreUrl) {
    return (
      <span
        className={`${base} cursor-default border border-border-default bg-surface-high text-fg-muted ${className}`}
        // Not aria-disabled on a non-interactive element — the text already
        // says it, and there is no control here to disable.
        //
        // Deliberately the QUIETEST thing on the row, not the loudest. While
        // the app is unpublished this is an announcement, not an action, and
        // painting it in the brand colour would put the page's whole visual
        // emphasis on the one element that does nothing when clicked.
      >
        <ClockIcon />
        تطبيق أندرويد قريبًا على Google Play
      </span>
    );
  }

  const styles =
    variant === 'inverse'
      ? 'bg-surface text-fg hover:bg-surface-high'
      : 'bg-brand text-on-brand hover:opacity-90';

  return (
    <a
      href={site.playStoreUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`${base} ${styles} ${className}`}
    >
      <PlayIcon />
      حمّل التطبيق مجانًا
    </a>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden>
      <path d="M3.6 2.2a1 1 0 0 0-.5.9v17.8a1 1 0 0 0 1.5.86l4.3-2.5-5.3-17.06ZM14.7 9.1 5.5 3.8l7.3 7.3 1.9-2ZM17.9 11l-2.6-1.5-2.1 2.2 2.1 2.1 2.6-1.5a1 1 0 0 0 0-1.3ZM5.5 20.2l9.2-5.3-1.9-2-7.3 7.3Z" />
    </svg>
  );
}

function ClockIcon() {
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
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
