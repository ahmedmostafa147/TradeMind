import Link from 'next/link';

import { InstallButton } from '@/components/pwa';
import { site } from '@/lib/site';

/**
 * Shell for the signed-in surfaces.
 *
 * Deliberately almost bare. The landing page's header is a set of anchors into
 * its own sections; carrying it here would offer a signed-in user five links
 * that scroll to nothing. What is left is the one thing they might actually
 * want — a way back out — plus the wordmark so the page still identifies
 * itself.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:right-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-on-brand"
      >
        تخطَّ إلى المحتوى
      </a>

      <header className="border-b border-border-default bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-5">
          <Link
            href="/"
            className="text-sm font-bold tracking-tight transition-colors hover:text-brand-ink"
          >
            {site.name}
          </Link>
          {/* The journal is the surface worth installing — it is what
              `start_url` opens — so the offer belongs here as much as on the
              landing page. Renders nothing unless the browser offered it. */}
          <InstallButton className="ms-auto" />
        </div>
      </header>

      <main id="main">{children}</main>
    </>
  );
}
