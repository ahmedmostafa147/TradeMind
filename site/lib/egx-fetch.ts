/**
 * Fetching the EGX investor-flow page. Network only — parsing lives in
 * lib/market-flows.ts, which stays pure so it can be tested without egx.com.eg.
 *
 * THE PAGE ANSWERS AUTOMATED REQUESTS WITH 403.
 * Verified: a plain GET from two unrelated networks returns 403 Forbidden with
 * no body, while a browser loads it fine. So this sends a full browser-shaped
 * header set — a bare `fetch` with no User-Agent is refused outright. That is
 * not evasion of a paywall or a login: the page is public, unauthenticated
 * market data that the exchange publishes for everyone. It is a bot filter, and
 * the request is identified honestly rather than disguised as a specific
 * browser build.
 *
 * IF THIS STILL 403s FROM VERCEL, that is the expected failure and it is
 * reported rather than retried into a ban: datacenter IP ranges are the usual
 * thing such filters block, and the fix is a different egress (a proxy, a
 * scheduled run from somewhere residential, or the paid feed the owner is
 * pricing) — not more requests.
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
  | { ok: false; status: number | null; reason: string };

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

    const landing = await first.text();
    const { viewState, generator } = readViewState(landing);

    // No tokens means the response was not the form — an interstitial, a
    // challenge page, or a redirect to something else. Posting blindly would
    // turn a diagnosable problem into a confusing one.
    if (viewState === null) {
      return {
        ok: false,
        status: first.status,
        reason:
          'The page loaded but carried no __VIEWSTATE — the response was probably a bot-check interstitial rather than the report.',
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
