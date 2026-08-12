"""Fetching the EGX page with a real browser. NETWORK ONLY — nothing here parses.

WHY A BROWSER AND NOT `requests`.

egx.com.eg sits behind F5 Shape Bot Defense. The response to an HTTP client is a
200 carrying `window["bobcmn"]` and a `TSPD_101` cookie — an obfuscated
JavaScript challenge that must be EXECUTED to obtain the session cookie the real
page needs. That is the product's entire purpose, and it is why the project's
earlier attempts failed the same way from two different networks: the site's own
route got 403 locally and a 200-with-challenge from Vercel, and no combination of
headers or copied cookies changes either outcome.

A real browser runs the challenge because it is a real browser. This is the only
approach that works short of a paid data licence, and it is why this worker
cannot live in a Vercel serverless function: Chromium does not fit and there is
nowhere to keep it warm.

WHAT THIS DOES NOT DO, DELIBERATELY:
  * It does not touch __VIEWSTATE. The scope selector is an ASP.NET postback, and
    driving it in a browser means clicking the radio and waiting — the page posts
    itself back with its own tokens. Half of site/lib/egx-fetch.ts exists to
    reproduce that by hand and none of it is needed here.
  * It does not retry forever. One attempt, one clear failure. A worker that
    silently spins is a worker whose failures are invisible.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import TimeoutError as PlaywrightTimeout
from playwright.sync_api import sync_playwright

from radar_flows.parse import TABLE_IDS

log = logging.getLogger(__name__)

FLOWS_URL = "https://www.egx.com.eg/en/investorstypepiechart.aspx"

#: The radio group that switches between securities, bonds and both.
_SCOPE_RADIO = "ctl00$C$rblSecuritiesBonds"

_SCOPE_LABELS = {"Securities": "Securities", "Bonds": "Bonds", "All": "All"}

#: A desktop UA. Not to disguise anything — Chromium's own default headless UA
#: contains "HeadlessChrome", which some challenge scripts branch on, and this is
#: an honest description of what is actually running.
_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)


@dataclass(frozen=True)
class FetchResult:
    ok: bool
    html: str = ""
    reason: str = ""
    #: First 600 characters of whatever arrived, when it was not the page. The
    #: difference between a bot challenge, a layout change and an outage is only
    #: visible by looking at the body — and the alternative is asking whoever
    #: reads the logs to reproduce the failure blind.
    sample: str = ""


def fetch_flows_html(
    scope: str = "Securities",
    *,
    timeout_ms: int = 60_000,
    headless: bool = True,
) -> FetchResult:
    """GETs the flows page, selects `scope`, and returns the rendered HTML."""
    label = _SCOPE_LABELS.get(scope, "Securities")

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                headless=headless,
                # Required in most container images: Chromium's sandbox needs
                # user namespaces that Cloud Run does not grant.
                args=["--no-sandbox", "--disable-dev-shm-usage"],
            )
            try:
                context = browser.new_context(
                    user_agent=_USER_AGENT,
                    viewport={"width": 1440, "height": 900},
                    locale="en-US",
                    timezone_id="Africa/Cairo",
                )
                page = context.new_page()
                page.set_default_timeout(timeout_ms)

                page.goto(FLOWS_URL, wait_until="domcontentloaded")

                # WAIT FOR THE TABLE, NOT FOR THE NAVIGATION. The challenge
                # resolves by replacing the document, so "the page loaded" is
                # true of the challenge itself. The only reliable signal that the
                # real page is present is the GridView existing.
                page.wait_for_selector(f"#{TABLE_IDS['all']}", timeout=timeout_ms)

                if label != "Securities":
                    _select_scope(page, label)

                html = page.content()
                return FetchResult(ok=True, html=html)
            finally:
                browser.close()

    except PlaywrightTimeout:
        return FetchResult(
            ok=False,
            reason=(
                "Timed out waiting for the flows table. The bot challenge may not "
                "have resolved, or the page layout changed."
            ),
        )
    except PlaywrightError as error:
        return FetchResult(ok=False, reason=f"Browser error: {error}")


def _select_scope(page, label: str) -> None:
    """Clicks a scope radio and waits for ASP.NET's postback to land.

    The radio ids are generated (`ctl00_C_rblSecuritiesBonds_1`) and their order
    is not guaranteed, so the input is found through its own label text instead of
    an index.
    """
    radios = page.locator(f'input[name="{_SCOPE_RADIO}"]')
    count = radios.count()

    for index in range(count):
        radio = radios.nth(index)
        radio_id = radio.get_attribute("id")
        if radio_id is None:
            continue
        text = page.locator(f'label[for="{radio_id}"]').inner_text().strip()
        if text.lower() == label.lower():
            with page.expect_navigation(wait_until="domcontentloaded"):
                radio.check()
            page.wait_for_selector(f"#{TABLE_IDS['all']}")
            return

    # Not fatal. The default scope IS Securities, which is what the dashboard
    # shows, so failing to switch is only wrong for the other two — and saying so
    # beats storing bond figures labelled as equities.
    raise PlaywrightError(f"No scope radio labelled {label!r} on the page")
