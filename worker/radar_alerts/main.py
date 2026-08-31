"""Entry point for the alerts run. Decide, send, record — or fail loudly.

    python -m radar_alerts.main                 # evaluate and send
    python -m radar_alerts.main --dry-run       # decide and print, send nothing
    python -m radar_alerts.main --only-market   # skip everything personal

RUNS AFTER radar_flows, NOT INSTEAD OF IT. The market rule reads the session that
job just wrote, so a run before it would evaluate yesterday's flows and either
say nothing or say it a day late. Two Cloud Run jobs on one schedule, ordered —
see worker/README.md.

EXIT CODES ARE THE ALERTING CONTRACT, same as radar_flows:

    0  finished (including "nothing was worth sending", which is the common case)
    2  could not read what it needed from Firestore
    3  configuration is missing — no VAPID key
    4  finished, but at least one send failed transiently

`--dry-run` is the switch that makes this safe to develop against production
data: it does every read and every decision and prints what it WOULD send, and
touches neither a push service nor the sent-state document.
"""

from __future__ import annotations

import argparse
import logging
import sys
from datetime import date

EXIT_OK = 0
EXIT_READ_FAILED = 2
EXIT_NOT_CONFIGURED = 3
EXIT_SEND_DEGRADED = 4

#: How many sessions the flip rule looks back over. Enough to describe a run
#: without claiming a trend.
FLIP_LOOKBACK = 8

log = logging.getLogger(__name__)


def _configure_logging(verbose: bool) -> None:
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
        stream=sys.stderr,
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="radar_alerts")
    parser.add_argument("--dry-run", action="store_true", help="decide but send nothing")
    parser.add_argument(
        "--only-market",
        action="store_true",
        help="evaluate the published market rule only; read no user data at all",
    )
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args(argv)
    _configure_logging(args.verbose)

    # Imported here rather than at module scope so `--help` and the unit tests
    # do not need firebase-admin or a credential present.
    from radar_alerts import collect, quotes, send as sender
    from radar_alerts.rules import flow_flip, stop_breaches, suppress_recently_sent, watchlist_hits
    from radar_flows.store import init_app

    key = ""
    if not args.dry_run:
        try:
            key = sender.private_key()
        except sender.MissingKey as error:
            log.error("%s", error)
            return EXIT_NOT_CONFIGURED

    init_app()
    from firebase_admin import firestore

    db = firestore.client()
    today = date.today()

    try:
        subscribers = collect.load_subscribers(db)
        market = flow_flip(collect.load_recent_foreign_nets(db, FLIP_LOOKBACK))
    except Exception as error:  # noqa: BLE001 — an unreadable database is exit 2.
        log.error("could not read from Firestore: %s", error)
        return EXIT_READ_FAILED

    log.info(
        "%d subscriber(s); market rule %s",
        len(subscribers),
        "fired" if market else "quiet",
    )
    if not subscribers:
        return EXIT_OK

    # ── One price fetch for the whole run, not one per user. ─────────────────
    #
    # Two hundred subscribers watching the same twenty tickers is twenty
    # symbols, asked once. Building the set first is also what keeps
    # `--only-market` honest: with it, nothing below reads a book at all.
    books: dict[str, tuple[list, list]] = {}
    prices: dict[str, float | None] = {}
    if not args.only_market:
        tickers: set[str] = set()
        try:
            for subscriber in subscribers:
                watch = collect.load_watchlist(db, subscriber.uid)
                trades = collect.load_open_trades(db, subscriber.uid)
                books[subscriber.uid] = (watch, trades)
                tickers.update(item.ticker for item in watch)
                tickers.update(trade.ticker for trade in trades)
        except Exception as error:  # noqa: BLE001
            log.error("could not read watchlists or trades: %s", error)
            return EXIT_READ_FAILED

        if tickers:
            prices = quotes.fetch_prices(sorted(tickers))

    degraded = False
    total_sent = 0

    for subscriber in subscribers:
        alerts = []
        if market is not None:
            alerts.append(market)
        if not args.only_market:
            watch, trades = books.get(subscriber.uid, ([], []))
            alerts.extend(watchlist_hits(watch, prices))
            alerts.extend(stop_breaches(trades, prices))

        alerts = suppress_recently_sent(alerts, subscriber.sent, today)
        if not alerts:
            continue

        if args.dry_run:
            for alert in alerts:
                print(f"[{subscriber.uid}] {alert.key}: {alert.title} — {alert.body}")
            total_sent += len(alerts)
            continue

        delivered_keys: list[str] = []
        for alert in alerts:
            reached_anyone = False
            for subscription in list(subscriber.subscriptions):
                outcome = sender.send(subscription, alert, key)
                if outcome == sender.DELIVERED:
                    reached_anyone = True
                elif outcome == sender.GONE_SUBSCRIPTION:
                    subscription["ref"].delete()
                    subscriber.subscriptions.remove(subscription)
                else:
                    degraded = True
            # ONLY A DELIVERED ALERT IS RECORDED AS SENT. Marking one that never
            # arrived would suppress it for the whole quiet window — a stop
            # breach silently swallowed, which is the worst state this feature
            # has.
            if reached_anyone:
                delivered_keys.append(alert.key)
                total_sent += 1

        if delivered_keys:
            merged = dict(subscriber.sent)
            for alert_key in delivered_keys:
                merged[alert_key] = today.isoformat()
            collect.save_sent(db, subscriber.uid, merged)

    log.info("%d notification(s) %s", total_sent, "would go out" if args.dry_run else "sent")
    return EXIT_SEND_DEGRADED if degraded else EXIT_OK


if __name__ == "__main__":
    sys.exit(main())
