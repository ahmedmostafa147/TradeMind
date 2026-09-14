"""Intraday prices from EGXBot's live feed, with our own route as the fallback.

── WHY A SECOND SOURCE AT ALL ──────────────────────────────────────────────

`/api/quote` answers from TradingView, which declares `delayed_streaming_900`
on EGX — a fifteen-minute delay, stated by the source in every row. For an
alert that says a stop broke, fifteen minutes is the difference between a
warning and a report.

EGXBot's `/live/quotes` updates during the session and carries an `open` flag,
so it is asked first and the delayed route is what answers when it cannot.

── WHAT THIS FEED DOES *NOT* SAY, AND WHY THAT GOVERNS THE COPY ───────────

It declares no delay at all. TradingView states its own and the product repeats
that number back; this payload states nothing. AN UNDECLARED DELAY IS NOT A
ZERO DELAY — the rule already written on `parseEgxBotHeroPayload`, and the
reason `site_copy_guard_test.dart` fails the build on «لحظي» anywhere it is not
being denied.

So this module is named for what it is (`live_prices`) and nothing built on it
may tell a reader the number is real-time. What it honestly buys is *fresher
than fifteen minutes*, which is worth having and is a different claim.

── THE PAYLOAD SHAPE IS NOT YET CONFIRMED ──────────────────────────────────

`/live/quotes` answers `{"open": false, "quotes": {}}` outside session hours,
so the shape of a populated `quotes` has never been seen from here. Every field
below is therefore validated rather than assumed, several plausible spellings
are accepted, and an unrecognised entry is COUNTED AND LOGGED rather than
guessed at — so the first real session tells us the shape instead of quietly
producing no alerts.

If the log line below ever fires, read one raw payload and narrow this parser.
Guessing wider is not the fix.
"""

from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.request

log = logging.getLogger(__name__)

EGXBOT_QUOTES_URL = "https://egxbot.com/live/quotes"
TIMEOUT_SECONDS = 15

#: Field names a quote's price might arrive under. Ordered by how likely the
#: feed is to use them; the first that holds a usable number wins.
PRICE_KEYS = ("price", "last", "close", "last_price", "c")


def _usable(value: object) -> float | None:
    """A price, or None. Zero and negative are never prices.

    A missing quote arriving as 0 would read as a stock that fell to nothing and
    would trip every stop in the book at once — the rule stated on
    `radar_alerts.rules._clean` and in CLAUDE.md §10.
    """
    if isinstance(value, bool):
        return None
    if isinstance(value, str):
        try:
            value = float(value)
        except ValueError:
            return None
    if not isinstance(value, (int, float)):
        return None
    number = float(value)
    if number != number or number in (float("inf"), float("-inf")):
        return None
    return number if number > 0 else None


def _price_of(entry: object) -> float | None:
    """Reads one quote entry, whether it is a bare number or an object."""
    direct = _usable(entry)
    if direct is not None:
        return direct
    if isinstance(entry, dict):
        for key in PRICE_KEYS:
            price = _usable(entry.get(key))
            if price is not None:
                return price
    return None


def parse_quotes(body: object) -> tuple[dict[str, float], bool]:
    """`(prices by ticker, session open)`.

    PURE — no network, so the shape handling is testable without a live market,
    which is the only way it can be tested at all outside session hours.
    """
    if not isinstance(body, dict):
        return {}, False

    session_open = bool(body.get("open"))
    quotes = body.get("quotes")
    if not isinstance(quotes, dict):
        return {}, session_open

    prices: dict[str, float] = {}
    unreadable = 0
    for raw_ticker, entry in quotes.items():
        if not isinstance(raw_ticker, str) or not raw_ticker.strip():
            continue
        price = _price_of(entry)
        if price is None:
            unreadable += 1
            continue
        prices[raw_ticker.strip().upper()] = price

    if unreadable:
        # THE LINE THAT TELLS US THE SHAPE IS WRONG. Without it a parser that
        # matches nothing looks exactly like a quiet market.
        log.warning(
            "%d of %d live quotes were unreadable — the payload shape may have "
            "changed or was never what this parser assumes. Capture one raw "
            "response and narrow radar_alerts/live_prices.py.",
            unreadable,
            len(quotes),
        )
    return prices, session_open


def fetch_live(tickers: list[str]) -> tuple[dict[str, float], bool]:
    """Asks the live feed. Returns what it knew, and whether the session is open.

    An empty result is not an error — outside session hours the feed answers
    `open: false` with nothing in it, and the caller falls back.
    """
    request = urllib.request.Request(
        EGXBOT_QUOTES_URL,
        headers={"Accept": "application/json", "User-Agent": "radar-alerts/1.0"},
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            body = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, ValueError, OSError) as error:
        log.warning("live quotes unavailable: %s", error)
        return {}, False

    prices, session_open = parse_quotes(body)
    wanted = {t.strip().upper() for t in tickers}
    return {t: p for t, p in prices.items() if t in wanted}, session_open


def prices_for(tickers: list[str]) -> dict[str, float | None]:
    """Every requested ticker, priced as freshly as we can honestly manage.

    The live feed first, our own route for whatever it did not carry. A ticker
    neither source knows stays None, and every rule treats None as "do not
    fire" — which is the only safe reading of "we could not find out".
    """
    from radar_alerts import quotes as delayed

    wanted = sorted({t.strip().upper() for t in tickers if t and t.strip()})
    if not wanted:
        return {}

    live, session_open = fetch_live(wanted)
    log.info(
        "live feed: session %s, %d of %d symbols priced",
        "open" if session_open else "closed",
        len(live),
        len(wanted),
    )

    missing = [t for t in wanted if t not in live]
    fallback: dict[str, float | None] = delayed.fetch_prices(missing) if missing else {}

    out: dict[str, float | None] = {}
    for ticker in wanted:
        out[ticker] = live.get(ticker, fallback.get(ticker))
    return out


def site_origin() -> str:
    return os.environ.get(
        "RADAR_SITE_ORIGIN", "https://radar-one-phi.vercel.app"
    ).rstrip("/")
