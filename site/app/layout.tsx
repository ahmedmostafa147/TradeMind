import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';

import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { site } from '@/lib/site';
import './globals.css';

/**
 * Cairo is self-hosted rather than pulled from Google Fonts, for the same
 * reason pubspec.yaml bundles it instead of using google_fonts: a runtime font
 * download is a third-party request on every visit, and the first paint would
 * land without a font until it resolved. `display: swap` keeps text readable
 * while the face loads instead of blocking on it.
 */
const cairo = localFont({
  src: [
    { path: '../assets/fonts/Cairo-400.woff2', weight: '400', style: 'normal' },
    { path: '../assets/fonts/Cairo-600.woff2', weight: '600', style: 'normal' },
    { path: '../assets/fonts/Cairo-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-cairo',
  display: 'swap',
  // Arabic text falls back to the system UI font, whose metrics differ enough
  // from Cairo's that an unadjusted swap visibly reflows the page.
  adjustFontFallback: false,
  fallback: ['system-ui', 'Segoe UI', 'Tahoma', 'sans-serif'],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    'البورصة المصرية',
    'دفتر صفقات',
    'إدارة المخاطر',
    'حجم المركز',
    'تسجيل الصفقات',
    'EGX',
    'trade journal',
  ],
  authors: [{ name: site.name }],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'ar_EG',
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    url: site.url,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  robots: { index: true, follow: true },
  category: 'finance',
};

export const viewport: Viewport = {
  // Both entries are required: a browser picks the one matching the visitor's
  // system theme, which is what colours the mobile address bar to match the
  // page instead of leaving a light strip above a black page.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f5f5' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  width: 'device-width',
  initialScale: 1,
};

/**
 * Applies the saved theme before first paint.
 *
 * Without this the page renders at the system theme and then snaps to the
 * saved one once React hydrates — a white flash on every navigation for a
 * visitor who chose dark. It is inline and synchronous on purpose: an external
 * or deferred script runs too late to prevent the flash it exists to prevent.
 */
const themeScript = `
(function () {
  try {
    var saved = localStorage.getItem('tradepilot-theme');
    if (saved === 'dark' || saved === 'light') {
      document.documentElement.setAttribute('data-theme', saved);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:right-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-on-brand"
        >
          تخطَّ إلى المحتوى
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
