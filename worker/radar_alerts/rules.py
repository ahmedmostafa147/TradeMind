"""Deciding what is worth waking somebody up for. PURE — no Firestore, no network.

Split from everything that does I/O for the same reason `parse.py` is split from
`fetch.py`: the part that carries the correctness has to be reachable without a
credential, a browser or a live market. Every rule below is a plain unit test.

── THE ONE THING A NOTIFICATION FEATURE HAS TO GET RIGHT ────────────────────

Not the sending. The *not* sending.

A push that arrives when nothing happened teaches the reader to swipe the next
one away without looking, and the next one might be their stop breaking. So the
bar here is deliberately higher than "the condition is true": every rule carries
a dedupe key, and [suppress_recently_sent] drops anything already sent inside the
window. A stop that is still broken on day three is not news on day three.

── WHY THE COPY LIVES HERE AND NOT AT THE SEND SITE ─────────────────────────

Because the text IS the decision. «سهم في قائمة مراقبتك وصل سعرك» and «استوبك
اتكسر» are different claims about the reader's money, and putting them next to
the condition that produced them is what makes a wrong pairing visible in review.
It also keeps the Arabic in one file rather than smeared through the sender.

NOTHING HERE MAY EVER READ AS ADVICE. The product says in three published places
that it does not recommend trades — the footer disclaimer, the terms, and the FAQ
— and a notification is the most advice-shaped surface a product has. Every
string below states a FACT the reader themselves configured («وصل سعرك»,
«استوبك») or a fact the exchange published («الأجانب صافي شراء»). None of them
says buy, sell, or should.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

#: How long a given alert key stays quiet after it fires.
#:
#: Fourteen days, and the number is a judgement not a constant of nature: a
#: breached stop the reader has decided to sit through must not nag daily, and a
#: watchlist target hit in January is genuinely news again in March. Short enough
#: to re-surface a condition the reader may have forgotten, long enough that a
#: position sitting under its stop for a fortnight produces one push and not
#: fourteen.
DEFAULT_QUIET_DAYS = 14

#: Consecutive sessions the previous direction must have held before a reversal
#: counts as news.
#:
#: Two, not one. Foreign flows cross zero constantly; a single session on the
#: other side is noise, and a rule that fires on it would send a push most days
#: and be muted within a week.
MIN_RUN_FOR_FLIP = 2


@dataclass(frozen=True)
class Alert:
    """One notification, decided but not yet sent.

    [key] is the dedupe identity and must be STABLE for the same underlying
    condition across days — `stop:<tradeId>`, not `stop:<tradeId>:<date>` — or
    the suppression window never matches anything and the rule sends daily.
    """

    key: str
    title: str
    body: str
    #: Where a click lands. A path, not an absolute URL: the origin is the
    #: reader's own, and hard-coding ours would send a phone to the wrong host
    #: the day the domain changes.
    path: str


@dataclass(frozen=True)
class WatchItem:
    """One watchlist row, reduced to what a rule needs."""

    item_id: str
    ticker: str
    target_buy_price: float


@dataclass(frozen=True)
class OpenTrade:
    """One open position, reduced to what a rule needs."""

    trade_id: str
    ticker: str
    stop_price: float


def _clean(value: object) -> float | None:
    """A usable price, or None.

    Zero and negative are REJECTED rather than treated as a price. A missing
    quote arriving as 0.0 would read as a stock that fell to nothing, and every
    rule below is a comparison — so a zero would fire every stop in the book at
    once. Same reasoning as the «مفيش سعر» rule in CLAUDE.md §10.
    """
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    number = float(value)
    if number != number or number in (float("inf"), float("-inf")):
        return None
    return number if number > 0 else None


# ── Market. Reads the published session only; touches no user data. ──────────


def flow_flip(nets: list[float | None]) -> Alert | None:
    """Foreign investors changed side, after holding the other one for a while.

    [nets] is the foreign net for the most recent sessions, NEWEST FIRST, as the
    exchange reported it. A None is a session we could not read, and it ENDS the
    run rather than being skipped — a gap means we do not know what happened in
    between, and "four sessions of selling" with a hole in it is a claim we
    cannot make.

    Returns None when there is no flip, when the run was too short to be
    interesting, or when today is exactly zero — which is neither side.
    """
    if len(nets) < MIN_RUN_FOR_FLIP + 1:
        return None

    today = nets[0]
    if today is None or today == 0:
        return None

    today_buying = today > 0
    run = 0
    for net in nets[1:]:
        if net is None or net == 0:
            break
        if (net > 0) == today_buying:
            break
        run += 1

    if run < MIN_RUN_FOR_FLIP:
        return None

    side = "مشترين" if today_buying else "بايعين"
    was = "بيع" if today_buying else "شراء"
    return Alert(
        # Keyed by direction, not by date: the same flip re-detected tomorrow is
        # the same event, while a flip back the other way is a different one and
        # must be able to fire inside the quiet window.
        key=f"flow-flip:{'buy' if today_buying else 'sell'}",
        title="الأجانب قلبوا " + side,
        body=(
            f"بعد {run} جلسات {was} متتالية، صافي تعاملات الأجانب "
            f"قلب النهارده. افتح «السوق» تشوف الأرقام."
        ),
        path="/dashboard/?tab=market",
    )


# ── Personal. These read the reader's own book. ──────────────────────────────


def watchlist_hits(items: list[WatchItem], prices: dict[str, float | None]) -> list[Alert]:
    """Watchlist rows whose last close reached the price the reader set.

    `<=`, not `==`: this runs once a day against a close, so a price that passed
    straight through the target between two runs would never be equal to it. The
    reader asked to hear when it got there, not when it landed exactly.
    """
    out: list[Alert] = []
    for item in items:
        target = _clean(item.target_buy_price)
        price = _clean(prices.get(item.ticker))
        if target is None or price is None or price > target:
            continue
        out.append(
            Alert(
                key=f"watch:{item.item_id}",
                title=f"{item.ticker} وصل سعرك",
                body=(
                    f"آخر إغلاق {price:g} ج.م، والسعر اللي حاططه "
                    f"{target:g}. القرار قرارك."
                ),
                path="/dashboard/?tab=watchlist",
            )
        )
    return out


def stop_breaches(trades: list[OpenTrade], prices: dict[str, float | None]) -> list[Alert]:
    """Open positions whose last close is at or below the stop the reader set.

    THE MOST IMPORTANT MESSAGE THIS PRODUCT SENDS, and the one with the least
    room for cleverness. It states the two numbers and stops: the whole argument
    of the journal is that the reader decided the exit in advance, and a push
    that told them what to do now would be undoing that.
    """
    out: list[Alert] = []
    for trade in trades:
        stop = _clean(trade.stop_price)
        price = _clean(prices.get(trade.ticker))
        if stop is None or price is None or price > stop:
            continue
        out.append(
            Alert(
                key=f"stop:{trade.trade_id}",
                title=f"{trade.ticker} كسر الاستوب",
                body=(
                    f"آخر إغلاق {price:g} ج.م، والاستوب اللي حاططه "
                    f"{stop:g}."
                ),
                path="/dashboard/?tab=trades",
            )
        )
    return out


# ── Suppression. The half that keeps the feature from being muted. ───────────


def suppress_recently_sent(
    alerts: list[Alert],
    sent: dict[str, str],
    today: date,
    quiet_days: int = DEFAULT_QUIET_DAYS,
) -> list[Alert]:
    """Drops alerts whose key fired inside the quiet window.

    [sent] maps an alert key to the ISO date it last went out — the shape stored
    per user by the worker. An unparseable or missing date is treated as NEVER
    SENT, deliberately: the failure mode of forgetting is one duplicate push,
    and the failure mode of guessing "recent" is a stop breach that never
    arrives.
    """
    cutoff = today - timedelta(days=quiet_days)
    out: list[Alert] = []
    for alert in alerts:
        raw = sent.get(alert.key)
        if raw:
            try:
                if date.fromisoformat(raw) > cutoff:
                    continue
            except (TypeError, ValueError):
                pass
        out.append(alert)
    return out
