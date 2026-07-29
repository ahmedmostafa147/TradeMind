import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

/**
 * Chrome for the public pages only.
 *
 * It used to live in the root layout, which meant the dashboards inherited it
 * — and the header's nav is a list of anchors into the landing page. On
 * /dashboard, «الأدوات» pointed at #tools, a section that is not on that page,
 * so the link silently did nothing. A route group fixes it without changing a
 * single URL: `(marketing)` is a grouping name, not a path segment.
 */
export default function MarketingLayout({
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
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  );
}
