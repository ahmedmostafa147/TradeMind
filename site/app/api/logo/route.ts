import { NextResponse } from 'next/server';

import { LOGO_ID } from '@/lib/tradingview';

/**
 * One company logo, fetched by us instead of by the reader's browser.
 *
 * ── WHY A PROXY AND NOT AN `<img>` STRAIGHT AT THE CDN ─────────────────────
 *
 * Pointing the tag at `s3-symbol-logo.tradingview.com` would make every reader's
 * browser talk to a third party we do not control — their IP, their user agent,
 * their cookies — which is a change to WHO SEES THE USER, not a change to where
 * a file lives. CLAUDE.md §22 records the price of that on the chart embed: a
 * new external origin costs a CSP entry AND a privacy-policy clause, in the
 * same commit, because the policy names every party the browser reaches.
 *
 * Fetching it here keeps that list exactly as it is. It is the same reasoning
 * `/api/quote` and `/api/stocks` already run on, and it has the same shape: our
 * server is the one endpoint both surfaces share, so the phone and the browser
 * cannot end up showing different things.
 *
 * ── THE INPUT IS A SLUG, AND THAT IS THE WHOLE SECURITY MODEL ──────────────
 *
 * This route interpolates its parameter into an outbound URL, which is the hole
 * `/api/quote` had to close with a directory check. A directory is not
 * available here — logo slugs are minted by TradingView and 284 of them change
 * as the board changes — so the guard is the SHAPE instead: `[a-z0-9-]`,
 * anchored, length-capped, measured against every slug the board actually
 * returns. Nothing matching it can carry a scheme, a host, a `/`, a `?` or a
 * `..`, so no input can steer the fetch off the one origin named below.
 *
 * ── AND THE RESPONSE IS DECLAWED BEFORE IT IS PASSED ON ────────────────────
 *
 * SVG is a document format: it can carry `<script>`. Rendering one through
 * `<img>` never executes it, but serving it from OUR origin means someone can
 * be handed a link that opens it directly, and then it is same-origin script on
 * radar's domain. Three things close that: `nosniff` below, a `default-src
 * 'none'` policy for this path in next.config.ts (it cannot live on this
 * response — see the note at the bottom), and the upstream content type, which
 * is checked rather than trusted, so anything that is not an SVG never passes
 * through at all.
 */

export const dynamic = 'force-dynamic';

const UPSTREAM = 'https://s3-symbol-logo.tradingview.com';

/** Logos change about never, so this is cached hard and revalidated lazily. */
const CACHE = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400';

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id')?.trim().toLowerCase();

  if (!id || !LOGO_ID.test(id)) {
    return NextResponse.json(
      { ok: false, reason: 'معرّف الشعار غير صالح' },
      { status: 400 }
    );
  }

  let response: Response;
  try {
    response = await fetch(`${UPSTREAM}/${id}.svg`, {
      signal: AbortSignal.timeout(6000),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      { ok: false, reason: 'تعذّر جلب الشعار' },
      { status: 502 }
    );
  }

  // A missing logo is a 404 and STAYS a 404: the component's fallback is the
  // ticker chip, and it needs the image load to fail to show it. Answering with
  // a placeholder here would hide the difference between "this company has no
  // logo" and "our proxy is broken".
  //
  // MEASURED: a slug with no file answers **403**, not 404 — it is an S3 bucket
  // behind a CDN, and a denied listing is how a missing key looks from outside.
  // Both mean the same thing here, and mapping them to 404 keeps «الشركة دي
  // ملهاش شعار» from being reported as «البروكسي واقع».
  if (!response.ok) {
    const missing = response.status === 404 || response.status === 403;
    return NextResponse.json(
      { ok: false, reason: missing ? 'مفيش شعار للرمز ده' : 'تعذّر جلب الشعار' },
      { status: missing ? 404 : 502 }
    );
  }

  const type = response.headers.get('content-type') ?? '';
  if (!type.includes('image/svg')) {
    return NextResponse.json(
      { ok: false, reason: 'الرد مش صورة SVG' },
      { status: 502 }
    );
  }

  return new NextResponse(await response.arrayBuffer(), {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': CACHE,
      'X-Content-Type-Options': 'nosniff',
      // NOTE: the SVG's own CSP is NOT set here. MEASURED: a header set on this
      // response is REPLACED by the matching next.config.ts rule, so a policy
      // written here would look present in the code and be absent on the wire.
      // It lives in next.config.ts as a rule for this path instead. See there.
    },
  });
}
