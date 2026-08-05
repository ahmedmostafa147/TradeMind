import { NextResponse } from 'next/server';

import { fetchFlowsHtml } from '@/lib/egx-fetch';
import { cairoDate, parseFlowsPage } from '@/lib/market-flows';

/**
 * THE FIRST SERVER CODE IN THIS PROJECT.
 *
 * Everything else under app/ is a client component prerendered at build time;
 * the browser talks to Firestore directly and there has never been a backend.
 * This route exists because the EGX page cannot be read from a browser: it is
 * another origin with no CORS headers, so a `fetch` from the dashboard is
 * blocked before it leaves. Something server-side has to make the request.
 *
 * IT DELIBERATELY DOES NOT WRITE TO FIRESTORE.
 * Writing from here would need firebase-admin and a service-account key in the
 * project's environment — a credential to provision, store and rotate, and a
 * blocker between today and a working feature. Instead this route only fetches
 * and parses, and the ADMIN'S OWN BROWSER writes the result to Firestore under
 * the credentials it already has, through the rules that already exist. No new
 * secret, no new trust boundary, and the write path is the same one every other
 * admin action uses.
 *
 * The cost is that a human triggers the refresh. That is the right trade while
 * the feed is unproven — see the note in the admin panel — and a Vercel cron
 * can be pointed at this same route later once a service account is worth
 * setting up.
 *
 * Not authenticated, on purpose: it returns public market data that the
 * exchange publishes to anyone, and it takes no input. There is nothing here to
 * leak and nothing to escalate.
 */

// Never prerendered and never cached at build: the whole point is today's
// numbers, and a statically-captured session would be served forever.
export const dynamic = 'force-dynamic';

/**
 * Generous because two sequential requests to a slow origin sit behind it, and
 * Vercel's default function timeout would cut the POST off mid-flight and
 * report it as an opaque failure.
 */
export const maxDuration = 60;

export async function GET(request: Request) {
  const url = new URL(request.url);

  const securitiesParam = url.searchParams.get('scope');
  const securities =
    securitiesParam === 'All' || securitiesParam === 'Bonds'
      ? securitiesParam
      : 'Securities';

  const outcome = await fetchFlowsHtml(securities);

  if (!outcome.ok) {
    // 502, not 500: the failure is upstream, and a caller retrying its way out
    // of our bug is a different thing from a caller waiting for EGX.
    return NextResponse.json(
      { ok: false, stage: 'fetch', status: outcome.status, reason: outcome.reason },
      { status: 502 }
    );
  }

  const date = cairoDate();
  const flows = parseFlowsPage(outcome.html, date);

  if (flows === null) {
    // The page came back but did not contain three complete tables. That is
    // either a layout change or a bot-check body served with a 200, and the two
    // are told apart by looking at what actually arrived — so a slice of it is
    // returned rather than making the next person reproduce the failure blind.
    return NextResponse.json(
      {
        ok: false,
        stage: 'parse',
        reason:
          'Fetched the page but could not read three complete tables from it. EGX may have changed the layout, or this may not be the report page.',
        htmlLength: outcome.html.length,
        htmlHead: outcome.html.slice(0, 400),
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, scope: securities, flows });
}
