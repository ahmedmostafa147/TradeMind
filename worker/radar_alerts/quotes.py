"""Last closes for a set of tickers. THE NETWORK ONLY — nothing here decides.

── IT CALLS OUR OWN /api/quote, NOT THE UPSTREAMS ───────────────────────────

CLAUDE.md §10 records why: the phone and the browser used to fetch prices from
different sources and showed two different numbers for the same open position.
The route is the one endpoint both surfaces share, and a worker that went
straight to TradingView or Yahoo would be a THIRD reader of a third source,
re-introducing exactly the split that was closed — except this one decides
whether to tell somebody their stop broke.

So: one source, and if the route is down nobody gets a personal alert today. That
is the correct failure. A stop rule fed by a second, disagreeing price feed is
worse than a stop rule that stayed quiet.

stdlib `urllib` rather than a new dependency: this is one GET with a query string.
"""

from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.parse
import urllib.request

log = logging.getLogger(__name__)

#: Where the route lives. Overridable so a preview deployment can be pointed at.
DEFAULT_ORIGIN = "https://radar-one-phi.vercel.app"

#: The route fans out one upstream request per symbol on its Yahoo fallback, so
#: asking for everything at once can outlive its own `maxDuration`. Batched.
BATCH = 40

TIMEOUT_SECONDS = 25


def _origin() -> str:
    return os.environ.get("RADAR_SITE_ORIGIN", DEFAULT_ORIGIN).rstrip("/")


def fetch_prices(tickers: list[str]) -> dict[str, float | None]:
    """Maps each requested ticker to its last close, or to None.

    NONE IS A SUPPORTED ANSWER AND NEVER ZERO. Every rule in rules.py treats a
    missing price as "do not fire", and a 0.0 standing in for "we could not
    reach the source" would fire every stop in the book at once.

    A failed batch degrades to None for that batch alone rather than raising, so
    one slow symbol cannot cost every other subscriber their alerts.
    """
    wanted = sorted({t.strip().upper() for t in tickers if t and t.strip()})
    prices: dict[str, float | None] = {t: None for t in wanted}

    for start in range(0, len(wanted), BATCH):
        batch = wanted[start : start + BATCH]
        query = urllib.parse.urlencode({"symbols": ",".join(batch)})
        url = f"{_origin()}/api/quote/?{query}"
        try:
            request = urllib.request.Request(
                url, headers={"User-Agent": "radar-alerts/1.0"}
            )
            with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
                body = json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, ValueError, OSError) as error:
            log.warning("quote batch failed (%d symbols): %s", len(batch), error)
            continue

        for quote in body.get("quotes") or []:
            symbol = quote.get("symbol")
            price = quote.get("price")
            if not isinstance(symbol, str):
                continue
            if not isinstance(price, (int, float)) or isinstance(price, bool):
                continue
            if price <= 0:
                continue
            prices[symbol.strip().upper()] = float(price)

    missing = [t for t, p in prices.items() if p is None]
    if missing:
        log.info("no price for %d of %d symbols: %s", len(missing), len(wanted), missing[:10])
    return prices
