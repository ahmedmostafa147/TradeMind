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

  // Turns off the AUTOMATIC redirect that `trailingSlash` above installs, and
  // hands the job to site/middleware.ts — which does exactly the same thing for
  // every path except the proxied sign-in helper below, where the redirect is
  // fatal. The reasoning, and the measurement behind it, is in that file.
  // `trailingSlash` itself stays on: it is what puts the slash on every
  // generated link, canonical tag and sitemap entry.
  skipTrailingSlashRedirect: true,

  /**
   * Serves Firebase's sign-in helper from OUR origin.
   *
   * ── THE BUG THIS FIXES ────────────────────────────────────────────────────
   *
   * Google sign-in looped: pick an account, come back to the site still signed
   * out, pick again, forever. Nothing errored and nothing was logged.
   *
   * The cause is `authDomain` pointing at trademind-6222c.firebaseapp.com — a
   * DIFFERENT ORIGIN from the one the user is on. `signInWithRedirect` parks
   * the pending request in storage belonging to that origin and reads it back
   * after Google returns. Chrome now partitions third-party storage, so the
   * write and the read happen in two different buckets: the sign-in completes
   * at Google, comes home, finds no pending request, and quietly does nothing.
   * A loop is the only symptom it can produce.
   *
   * Proxying `/__/auth/*` makes the helper same-origin, so there is no
   * third-party anything left to partition. This is the fix Firebase itself
   * documents; the alternative — telling every user to re-enable third-party
   * cookies — is asking them to weaken their browser to use ours.
   *
   * IT DOES NOT NEED A CUSTOM DOMAIN. It works on whatever host is serving the
   * app, which is why `authDomain` is now read from `window.location` rather
   * than hard-coded — see site/lib/firebase.ts. Buying a domain changes
   * nothing here.
   *
   * `beforeFiles` because `/__/` is not a route this app has; leaving it until
   * after the filesystem lookup would mean a 404 gets there first.
   */
  async rewrites() {
    return {
      beforeFiles: [
        {
          // ONLY `/__/auth/*`. `/__/firebase/init.json` is requested by the
          // helper and 404s here, and that 404 IS THE CORRECT ANSWER — do not
          // "fix" it by widening this rule. Firebase Hosting serves that file,
          // and the copy it serves carries
          // `"authDomain": "trademind-6222c.firebaseapp.com"`. Proxying it
          // would hand the helper the very cross-origin authDomain this whole
          // change exists to get rid of, and the redirect loop would come
          // back — from a change that looks like it is only removing a 404.
          //
          // Measured: with the file 404ing, the flow reaches Google's account
          // chooser with no error. The SDK passes its config in the query
          // string; the file is a Hosting convenience it does not need.
          source: '/__/auth/:path*',
          destination:
            'https://trademind-6222c.firebaseapp.com/__/auth/:path*',
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },

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
        // NOT `/:path*`. The sign-in helper proxied above is Google's page, and
        // two of the directives below are fatal to it — see the block at the
        // bottom of this array. Next APPENDS the headers of every matching
        // rule, and a browser handed two Content-Security-Policy headers
        // enforces the INTERSECTION of them, so a second, looser policy cannot
        // relax the first. The only way to exempt a path is to stop matching
        // it, which is what the negative lookahead does.
        source: '/:path((?!__/auth).*)',
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
              // `'self'` is the sign-in iframe. signInWithPopup embeds
              // `{authDomain}/__/auth/iframe` inside this page, and authDomain
              // is now this origin, so what used to be a firebaseapp.com frame
              // is a same-origin one. The firebaseapp.com entry stays: the
              // OAuth round trip still passes through it.
              "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com " +
                'https://www.tradingview-widget.com https://s.tradingview.com',
              "base-uri 'self'",
              // Was 'none'. The sign-in helper submits a form, and now that it
              // is served from this origin that submission is same-origin and
              // this page's policy governs it. 'self' permits exactly that and
              // nothing else — no form on this site may post anywhere off it.
              "form-action 'self'",
              "frame-ancestors 'none'",
              'upgrade-insecure-requests',
            ].join('; '),
          },
        ],
      },
      {
        /**
         * The proxied company logos — a THIRD-PARTY DOCUMENT ON OUR ORIGIN.
         *
         * SVG is a document format that can carry `<script>`. Drawn through an
         * `<img>` it never executes, but the file is served from radar's own
         * origin, so anyone handed the URL directly opens it as a same-origin
         * document — and the site policy above allows `script-src 'self'
         * 'unsafe-inline'`, which is exactly what such a file would need.
         *
         * MEASURED, because the two plausible behaviours differ and only one is
         * safe: for the SAME header key the later matching rule REPLACES the
         * earlier one — this path answers with exactly one
         * `Content-Security-Policy`, and it is this one. Keys the rules do not
         * share still merge, so `nosniff`, `Referrer-Policy` and
         * `Permissions-Policy` from the site rule are all still on the response.
         * (That is narrower than the note on the first rule, which is about two
         * policies reaching the browser and being intersected. Here only one
         * arrives — checked on the wire, not assumed.)
         *
         * It lives here and not on the route because a `Content-Security-Policy`
         * set on the response is the one that gets replaced — also measured, and
         * silent: the code would read as though it were protected.
         */
        source: '/api/logo/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'none'; style-src 'unsafe-inline'; sandbox",
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
      {
        /**
         * The proxied sign-in helper, DELIBERATELY WITHOUT OUR CSP.
         *
         * Our policy is written for our pages. Applied to this one it breaks
         * sign-in in two ways, neither of which reports itself as an auth
         * problem:
         *
         *   `frame-ancestors 'none'` — signInWithPopup embeds
         *   `/__/auth/iframe` inside our own page. That directive is read off
         *   the IFRAME's response and forbids anyone from embedding it, us
         *   included, so the frame comes back blank.
         *
         *   `form-action 'none'` — the helper reaches Google by submitting a
         *   form. Blocked, the flow stops on a page that looks like it is
         *   still working.
         *
         * MEASURED CAVEAT: under `next start` these headers are not applied at
         * all — an externally-rewritten response comes back with the upstream's
         * own headers and nothing of ours, CSP included. So on this host the
         * exclusion above is already the whole fix and this block changes
         * nothing. It stays because that is one runtime's behaviour, not a
         * guarantee, and the cost of being wrong in the other direction is a
         * sign-in that breaks on deploy for a reason nobody would look for
         * twice.
         */
        source: '/__/auth/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ];
  },
};

export default nextConfig;
