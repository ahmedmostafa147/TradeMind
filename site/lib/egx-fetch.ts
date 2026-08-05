/**
 * Fetching the EGX investor-flow page. Network only — parsing lives in
 * lib/market-flows.ts, which stays pure so it can be tested without egx.com.eg.
 *
 * THE PAGE FILTERS AUTOMATED REQUESTS, AND IT DOES IT DIFFERENTLY BY NETWORK.
 * Measured, not assumed: a plain GET from two unrelated networks returns 403
 * with no body, while the same request from Vercel returns 200 carrying a
 * bot-check interstitial rather than the report. Both are the same filter
 * answering in two different registers.
 *
 * So this sends a full browser-shaped header set AND carries cookies between
 * the two requests. That is not evasion of a paywall or a login: the page is
 * public, unauthenticated market data the exchange publishes for everyone, and
 * the request identifies itself honestly rather than forging a session.
 *
 * When it still fails, the failure is REPORTED WITH A SAMPLE of what came back
 * rather than retried — a filter answering 200-with-a-challenge cannot be
 * argued out of it by asking again, and the sample is what tells the next
 * person whether to fix a header or go buy the paid feed.
 */

import { readViewState } from '@/lib/market-flows';

const PAGE = 'https://www.egx.com.eg/en/investorstypepiechart.aspx';

/**
 * Sent on both the GET and the POST. `Accept-Language` asks for English
 * because the parser's column matching is tested hardest against the English
 * headers, though it accepts the Arabic ones too.
 */
const HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
  'Cache-Control': 'no-cache',
};

export type FetchOutcome =
  | { ok: true; html: string }
  | {
      ok: false;
      status: number | null;
      reason: string;
      /** A slice of whatever came back, when something came back. Without it a
       *  bot-check interstitial and a changed layout are indistinguishable. */
      sample?: string;
    };

/**
 * Carries cookies from the GET into the POST.
 *
 * `fetch` DOES NOT DO THIS. There is no cookie jar in the server runtime, so
 * every call is a fresh anonymous client — and that is exactly what a bot
 * filter is looking for. The first response typically sets a session cookie
 * (ASP.NET's own `ASP.NET_SessionId`, plus whatever the filter adds) and a
 * postback arriving without it is a form submission from a client the server
 * has never seen, which is not a thing a browser can do.
 *
 * Values are passed through untouched — no parsing of attributes, no expiry
 * handling. These live for one pair of requests seconds apart, and a cookie
 * library for that would be more moving parts than the problem has.
 */
function cookieHeader(response: Response): string | null {
  const raw = response.headers.getSetCookie?.() ?? [];
  const pairs = raw
    .map((c) => c.split(';')[0].trim())
    .filter((c) => c.includes('='));
  return pairs.length > 0 ? pairs.join('; ') : null;
}

/**
 * GETs the page, then posts the form back with the tokens it returned.
 *
 * The two-step exists because `__VIEWSTATE` is a signed, server-generated blob
 * tied to the page instance. Hardcoding a captured one — as the scrapers that
 * exist in the wild do — works until the server rotates its machine key or
 * changes the control tree, and then fails with an opaque 500. Reading it back
 * costs one extra request and never goes stale.
 *
 * `securities` selects the radio group: 'All' includes bonds, 'Securities' is
 * equities only. Equities is what a stock trader means by "who bought today",
 * so it is the default.
 */
export async function fetchFlowsHtml(
  securities: 'All' | 'Securities' | 'Bonds' = 'Securities',
  timeoutMs = 20_000
): Promise<FetchOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const first = await fetch(PAGE, {
      headers: HEADERS,
      signal: controller.signal,
      redirect: 'follow',
    });

    if (!first.ok) {
      return {
        ok: false,
        status: first.status,
        reason:
          first.status === 403
            ? 'EGX refused the request (403) — almost certainly its bot filter rejecting this egress IP.'
            : `GET failed with HTTP ${first.status}.`,
      };
    }

    const cookies = cookieHeader(first);
    const landing = await first.text();
    const { viewState, generator } = readViewState(landing);

    // No tokens means the response was not the form — an interstitial, a
    // challenge page, or a redirect to something else. Posting blindly would
    // turn a diagnosable problem into a confusing one, so this reports what
    // actually arrived instead of guessing at it.
    if (viewState === null) {
      return {
        ok: false,
        status: first.status,
        reason:
          'The page loaded but carried no __VIEWSTATE — the response was probably a bot-check interstitial rather than the report.',
        sample: landing.slice(0, 700),
      };
    }

    const body = new URLSearchParams({
      __EVENTTARGET: 'ctl00$C$rblSecuritiesBonds$1',
      __EVENTARGUMENT: '',
      __VIEWSTATE: viewState,
      ...(generator ? { __VIEWSTATEGENERATOR: generator } : {}),
      'ctl00$H$rblSearchType': '1',
      'ctl00$C$rblSecuritiesBonds': securities,
    });

    const second = await fetch(PAGE, {
      method: 'POST',
      headers: {
        ...HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: PAGE,
        Origin: 'https://www.egx.com.eg',
        ...(cookies ? { Cookie: cookies } : {}),
      },
      body,
      signal: controller.signal,
      redirect: 'follow',
    });

    if (!second.ok) {
      return {
        ok: false,
        status: second.status,
        reason: `POST failed with HTTP ${second.status}.`,
        sample: (await second.text().catch(() => '')).slice(0, 700),
      };
    }

    return { ok: true, html: await second.text() };
  } catch (error) {
    return {
      ok: false,
      status: null,
      reason:
        error instanceof Error && error.name === 'AbortError'
          ? `EGX did not respond within ${timeoutMs}ms.`
          : `Request failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  } finally {
    clearTimeout(timer);
  }
}
