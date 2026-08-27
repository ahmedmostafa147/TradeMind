import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';

import { ServiceWorkerRegistrar } from '@/components/pwa';
import { site } from '@/lib/site';
import './globals.css';

/**
 * IBM Plex Sans Arabic, self-hosted rather than pulled from Google Fonts, for
 * the same reason pubspec.yaml bundles it instead of using google_fonts: a
 * runtime font download is a third-party request on every visit, and the first
 * paint would land without a font until it resolved. It is also what the CSP in
 * site/vercel.json requires — `font-src 'self'` rejects a Google Fonts CDN
 * outright. `display: swap` keeps text readable while the face loads instead of
 * blocking on it.
 *
 * The app bundles the same three weights from the same TTFs (pubspec.yaml), so
 * a screenshot of the phone and a screenshot of the browser set type
 * identically — the same reason design/palettes.json feeds both.
 */
const plex = localFont({
  src: [
    {
      path: '../assets/fonts/IBMPlexSansArabic-400.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../assets/fonts/IBMPlexSansArabic-600.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../assets/fonts/IBMPlexSansArabic-700.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-plex-arabic',
  display: 'swap',
  // Arabic text falls back to the system UI font, whose metrics differ enough
  // from Plex's that an unadjusted swap visibly reflows the page.
  adjustFontFallback: false,
  fallback: ['system-ui', 'Segoe UI', 'Tahoma', 'sans-serif'],
});

/**
 * The share card's alt text.
 *
 * It was an exported `alt` in app/opengraph-image.tsx, which Next read by
 * convention. The card is a route handler now (see app/og/route.tsx), and a
 * route handler has no such convention — so the string is stated here, where
 * the tag that carries it is written.
 */
const ogAlt = `${site.name} — ${site.tagline}`;

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

    // THE TRAILING SLASH IS THE WHOLE POINT OF SPELLING THIS OUT.
    //
    // next.config.ts sets `trailingSlash: true`, and Next's own
    // opengraph-image file convention emitted the card's URL WITHOUT one —
    // /opengraph-image?<hash>. Vercel answers that with a 308 to
    // /opengraph-image/?<hash>, and a scraper that does not follow a redirect
    // on og:image renders no preview at all. WhatsApp is the one that matters
    // here, and it is the one that does not follow it.
    //
    // The page was serving a perfectly good 49KB PNG the whole time. Nothing
    // logged, nothing failed, and the only symptom was a blank card in
    // whatever chat the link was pasted into — which is to say the symptom is
    // only ever visible to the person sharing the link, never to the build.
    //
    // Naming the image here makes the emitted URL final instead of a redirect.
    // It is /og/ and not the convention's own path because THE CONVENTION WINS
    // OVER THIS FIELD when both exist: file-based metadata overrides
    // config-based metadata in Next, so leaving app/opengraph-image.tsx in
    // place would have kept the redirecting URL and quietly ignored this.
    // The generator moved to app/og/route.tsx — a plain route handler, which
    // carries no metadata convention — so this field is now the only thing
    // that decides the URL.
    images: [
      {
        url: '/og/',
        width: 1200,
        height: 630,
        alt: ogAlt,
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    images: ['/og/'],
  },
  robots: { index: true, follow: true },
  category: 'finance',

  // iOS ignores the web app manifest completely. Standalone launch, the status
  // bar style and the home-screen title all come from these meta tags instead,
  // so «أضف إلى الشاشة الرئيسية» on an iPhone opens a real app window rather
  // than a Safari tab with the chrome still attached.
  appleWebApp: {
    capable: true,
    title: site.name,
    // `black-translucent` lets the page paint under the status bar, which is
    // right for a dark app and wrong for a light one — and the site has both
    // themes. `default` keeps the bar readable either way.
    statusBarStyle: 'default',
  },
  other: {
    // Windows/Edge reads this for the installed app's tile.
    'msapplication-TileColor': '#0a0b0d',
    // Emitted by hand because Next's `appleWebApp.capable` produces only the
    // standardised `mobile-web-app-capable`, and iOS Safari reads the
    // apple-prefixed name. Without this tag «أضف إلى الشاشة الرئيسية» still
    // adds an icon, but tapping it opens a Safari tab with the address bar
    // attached instead of a standalone window — which is the entire difference
    // between "installed" and "bookmarked" on an iPhone.
    'apple-mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  // Both entries are required: a browser picks the one matching the visitor's
  // system theme, which is what colours the mobile address bar to match the
  // page instead of leaving a light strip above a black page.
  //
  // These are the real `--background` tokens from app/tokens.css, not
  // approximations of them. They used to be #f5f5f5 and #000000, which were
  // close enough to look deliberate and still left a visible seam between the
  // address bar and the page. The dark value is also the manifest's
  // `background_color`, so the install splash and the app window agree.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafaed' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0b0d' },
  ],
  width: 'device-width',
  initialScale: 1,
  // The installed window has no browser UI to fall back on, so the page has to
  // paint into the notch/home-indicator area itself.
  viewportFit: 'cover',
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

/**
 * Catches `beforeinstallprompt` before React exists.
 *
 * THE RACE THIS CLOSES
 * Chrome fires the event as soon as it finishes evaluating installability,
 * which is not synchronised with hydration — on a slow device it can land
 * before <InstallButton>'s effect has attached its listener. The event is not
 * replayed and there is no way to ask for it again, so the prompt is simply
 * gone for that page view and the button never renders. That failure looks
 * EXACTLY like a broken manifest or an unregistered worker, which is what
 * makes it expensive: every obvious suspect is innocent.
 *
 * Inline and synchronous in <head>, for the same reason the theme script is:
 * anything deferred is already too late. The listener stashes the event and
 * announces it on a custom event, so a component mounting either before or
 * after the browser decides ends up in the same state.
 */
const installCaptureScript = `
(function () {
  window.__radarInstallPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    // Suppresses Chrome's own mini-infobar. Doing it here rather than in React
    // is the point — by the time a component could call it, it is too late.
    e.preventDefault();
    window.__radarInstallPrompt = e;
    window.dispatchEvent(new Event('radar:installable'));
  });
  window.addEventListener('appinstalled', function () {
    window.__radarInstallPrompt = null;
    window.dispatchEvent(new Event('radar:installed'));
  });
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={plex.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: installCaptureScript }} />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
