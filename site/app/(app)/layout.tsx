import Link from 'next/link';

import { InstallButton } from '@/components/pwa';
import { ThemeToggle } from '@/components/theme-toggle';
import { disclaimer, site } from '@/lib/site';

/**
 * The legal links, repeated here rather than imported from SiteFooter.
 *
 * SiteFooter is the marketing footer — disclaimer callout, tagline, install
 * instructions, copyright — and dropping all of that under a journal would bury
 * the working surface under a sales page. What a signed-in user needs is the
 * three documents and nothing else.
 */
const legalLinks = [
  { href: '/privacy', label: 'سياسة الخصوصية' },
  { href: '/terms', label: 'شروط الاستخدام' },
  { href: '/delete', label: 'حذف الحساب' },
];

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
          <div className="ms-auto flex items-center gap-2">
            <InstallButton />
            {/* The toggle lived only in the marketing header, so a user who
                opened /dashboard directly — which is what the installed app
                does, and what every returning user does — had no way to change
                theme. The preference is one localStorage key shared by both
                surfaces, so switching here is remembered on the landing page
                too. */}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="main">{children}</main>

      {/* The three documents, reachable from the product itself.
          RELEASE.md requires the "not investment advice" line stated outright,
          and this is the surface where a user is actually looking at position
          sizes and P&L — the one place the sentence is doing real work rather
          than satisfying a reviewer. */}
      <footer className="mt-16 border-t border-border-default bg-surface-low">
        <div className="mx-auto max-w-6xl px-5 py-8">
          <p className="max-w-3xl text-xs leading-relaxed text-fg-subtle">
            <strong className="font-semibold text-fg-muted">تنويه: </strong>
            {disclaimer}
          </p>

          <nav aria-label="روابط قانونية" className="mt-5">
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-fg-muted underline-offset-4 transition-colors hover:text-fg hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href={`mailto:${site.contactEmail}`}
                  className="text-xs text-fg-muted underline-offset-4 transition-colors hover:text-fg hover:underline"
                >
                  تواصل معنا
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </footer>
    </>
  );
}
