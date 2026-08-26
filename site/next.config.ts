import type { NextConfig } from 'next';

// A production build with no origin configured would still succeed and emit
// canonical tags, a sitemap and an og:image all pointing at localhost. That is
// silent and expensive to discover later, so it is shouted about here.
//
// On Vercel the variable is set in Project Settings → Environment Variables,
// not on the command line, so a missing one means somebody deleted it there.
if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_SITE_URL) {
  console.warn(
    '\n\x1b[33m⚠  NEXT_PUBLIC_SITE_URL is not set.\x1b[0m\n' +
      '   Canonical URLs, sitemap.xml and og:image will point at http://localhost:3000.\n' +
      '   Set it in the Vercel project, or for a local build:\n' +
      '   NEXT_PUBLIC_SITE_URL=https://your-domain.com npm run build\n'
  );
}

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // NO `output: 'export'`.
  //
  // The site ran as a static export while it was on Firebase Hosting, and that
  // combination had one defect nothing could fix from inside the app: Next's
  // router prefetches a route by requesting a path with a dot in it, while the
  // export writes a directory — so every prefetch 404'd and each navigation
  // fell back to a full page load. On Vercel the Next runtime answers those
  // requests, so client-side navigation works and the prefetch noise is gone.
  //
  // Every page here is still a client component with no server data, so they
  // are prerendered at build time exactly as before. What changed is who
  // serves them, not how they are produced.

  // One 4.7 KB logo at ~28 CSS pixels is the only next/image on the site.
  // Optimising it would trade a few hundred bytes for a per-request image
  // transform, so the loader stays off — this is now a choice, not the
  // constraint `output: 'export'` used to impose.
  images: { unoptimized: true },

  // Kept from the export era on purpose: the canonical URLs, the sitemap and
  // every internal link already carry the trailing slash, and changing the
  // shape of a URL is a redirect chain nobody asked for.
  trailingSlash: true,

  /**
   * Security headers.
   *
   * WHY HERE AND NOT IN vercel.json
   * They lived there, annotated, until the first real deploy rejected the file:
   * Vercel validates vercel.json against a strict schema and a `"//"` comment
   * key inside a header entry is an outright error — `headers[0].headers[4]
   * should NOT have additional property "//"`. The choice was to delete the
   * reasoning or move the headers somewhere that allows comments. The reasoning
   * is the more valuable half (see the CSP note below — it documents an outage),
   * so the headers moved. This is also the more portable home: it travels with
   * the app to any host that runs Next, and there is now exactly one place to
   * look instead of one per host.
   */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            // `frame-ancestors` replaces X-Frame-Options. `script-src` allows
            // inline because two inline scripts must run before first paint —
            // the theme script, and the beforeinstallprompt capture — and the
            // JSON-LD block is inline by definition.
            //
            // THE GOOGLE HOSTS ARE NOT OPTIONAL. This policy was 'self'
            // everywhere once and it silently broke the whole dashboard:
            // connect-src governs the identitytoolkit/securetoken/firestore
            // endpoints, frame-src governs the __/auth/handler iframe that
            // signInWithPopup opens, and script-src governs apis.google.com.
            // Sign-in failed with a generic «جرّب تاني» and no clue, because a
            // CSP block surfaces as an opaque auth error. Each allowance is
            // pinned to an exact Google host rather than widened to https:.
            // If sign-in or data loading ever breaks again, read the browser
            // console for a CSP violation FIRST.
            //
            // THE TRADINGVIEW HOSTS ARE THE SAME STORY, FOUND THE SAME WAY.
            // The chart dialog injects s3.tradingview.com and that host was
            // not in script-src, so every «الشارت» button on the deployed site
            // did nothing at all — `script-src-elem` refused it and the only
            // trace was a console line nobody was reading. The script then
            // builds an iframe on tradingview-widget.com, which frame-src has
            // to name separately. Verified in a browser against a real build,
            // not reasoned about.
            //
            // worker-src and manifest-src are stated explicitly for the PWA.
            // Both would otherwise inherit — worker-src from script-src, which
            // carries 'unsafe-inline' and two Google hosts that have no
            // business registering a service worker, and manifest-src from
            // default-src. Naming them keeps the worker and the manifest
            // same-origin without widening anything.
            key: 'Content-Security-Policy',
            value: [
              process.env.NODE_ENV !== 'production'
                ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com https://s3.tradingview.com"
                : "script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com https://s3.tradingview.com",
              "worker-src 'self'",
              "manifest-src 'self'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data:",
              "font-src 'self'",
              "connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com",
              'frame-src https://*.firebaseapp.com https://accounts.google.com ' +
                'https://www.tradingview-widget.com https://s.tradingview.com',
              "base-uri 'self'",
              "form-action 'none'",
              "frame-ancestors 'none'",
              'upgrade-insecure-requests',
            ].join('; '),
          },
        ],
      },
      {
        // The service worker must not be cached, or a fix to the caching policy
        // itself cannot reach the browsers running the broken one — the file
        // that decides what is stale would be the stale thing.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
