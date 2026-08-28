import { NextResponse, type NextRequest } from 'next/server';

/**
 * Re-implements the trailing-slash redirect that `skipTrailingSlashRedirect`
 * turns off — for every path EXCEPT the proxied sign-in helper.
 *
 * ── WHY THIS FILE EXISTS ────────────────────────────────────────────────────
 *
 * `trailingSlash: true` makes Next answer `/__/auth/handler` with a 308 to
 * `/__/auth/handler/`. The proxy serves that happily — same 200, same bytes —
 * so it looks fine, and it is not. Firebase's handler loads its scripts by
 * RELATIVE path:
 *
 *     <script src="handler.js"></script>
 *
 * From `/__/auth/handler` that resolves to `/__/auth/handler.js`, which exists.
 * From `/__/auth/handler/` it resolves to `/__/auth/handler/handler.js`, which
 * does not — measured, 404 against 200. The page then renders, runs nothing,
 * and the sign-in stalls on a screen that looks like it is still working. It
 * would have read as the same loop the proxy was added to fix.
 *
 * Next has no per-path opt-out for that redirect, so the redirect is disabled
 * globally in next.config.ts and restored here for everything else. The URL
 * shape of the site is unchanged: every canonical tag, sitemap entry and
 * internal link still carries the trailing slash, and a request without one is
 * still answered with a 308 to the one with.
 */
export function middleware(request: NextRequest) {
  // Built from `request.url`, NOT from `request.nextUrl.clone()`. nextUrl is
  // Next's own parsed copy and it re-normalises the path on the way out: the
  // slash appended to it is stripped again before the Location header is
  // written, so the response redirects `/privacy` to `/privacy` — a loop the
  // browser gives up on after twenty hops. Measured, not guessed.
  const url = new URL(request.url);
  if (url.pathname.endsWith('/')) return NextResponse.next();

  url.pathname = `${url.pathname}/`;
  return NextResponse.redirect(url, 308);
}

export const config = {
  /**
   * Everything the built-in redirect used to cover, and nothing else.
   *
   *   `__/auth/`  the whole point of this file.
   *   `_next/`    build output, already exact URLs.
   *   `.` in the last segment — /sw.js, /robots.txt, /sitemap.xml,
   *               /manifest.webmanifest, /icon.png. Next's own redirect skipped
   *               these too, and redirecting /sw.js to /sw.js/ would
   *               unregister the service worker on every install.
   *
   * `/api/*` is deliberately NOT excluded: it is redirected today, both callers
   * follow it, and quietly changing that alongside an auth fix would be a
   * second change hiding inside the first.
   */
  matcher: ['/((?!__/auth/|_next/|.*\\.[^/]*$).*)'],
};
