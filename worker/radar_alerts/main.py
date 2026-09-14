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
    from radar_alerts import collect, live_prices, send as sender, telegram
    from radar_alerts.rules import flow_flip, stop_breaches, suppress_recently_sent, watchlist_hits
    from radar_flows.store import init_app

    # TWO CHANNELS, EITHER OF WHICH MAY BE ABSENT. A deployment with only a
    # Telegram token works, and so does one with only VAPID. Both missing is the
    # only configuration that can deliver nothing at all, and that is the one
    # that exits non-zero — a run that "succeeds" while reaching nobody is the
    # silent failure every exit code in this project exists to prevent.
    key = ""
    telegram_token = ""
    if not args.dry_run:
        try:
            key = sender.private_key()
        except sender.MissingKey as error:
            log.info("web push disabled: %s", error)
        try:
            telegram_token = telegram.bot_token()
        except telegram.MissingToken as error:
            log.info("telegram disabled: %s", error)
        if not key and not telegram_token:
            log.error(
                "neither channel is configured — set RADAR_VAPID_PRIVATE_KEY, "
                "RADAR_TELEGRAM_BOT_TOKEN, or both."
            )
            return EXIT_NOT_CONFIGURED

    init_app()
    from firebase_admin import firestore

    db = firestore.client()
    today = date.today()

    # ── Pending Telegram links are drained FIRST. ────────────────────────────
    #
    # Somebody who pressed Start a minute ago should be reachable on this run
    # rather than the next one. Doing it before the alerts are decided is what
    # makes "link, then wait for the next run" into "link, and the next run
    # includes you".
    if telegram_token and not args.dry_run:
        try:
            _, pending = collect.load_telegram_links(db)
            offset = collect.load_update_offset(db)
            codes, next_offset = telegram.drain_link_requests(telegram_token, offset)
            for code, chat_id in codes.items():
                uid = pending.get(code)
                if uid is None:
                    # A code nobody is waiting on: already redeemed, expired, or
                    # typed by somebody who invented it. Ignored silently — this
                    # is an open chat anyone can message.
                    continue
                collect.save_telegram_chat(db, uid, chat_id)
                log.info("telegram linked for %s", uid)
            collect.save_update_offset(db, next_offset)
        except Exception as error:  # noqa: BLE001 — linking must not stop alerts.
            log.warning("could not drain telegram links: %s", error)

    try:
        subscribers = collect.load_subscribers(db)
        chats, _ = collect.load_telegram_links(db)
        market = flow_flip(collect.load_recent_foreign_nets(db, FLIP_LOOKBACK))
    except Exception as error:  # noqa: BLE001 — an unreadable database is exit 2.
        log.error("could not read from Firestore: %s", error)
        return EXIT_READ_FAILED

    # A READER WITH TELEGRAM AND NO BROWSER SUBSCRIPTION IS STILL A SUBSCRIBER.
    # `load_subscribers` walks the `push` collection, so a Telegram-only reader
    # would otherwise be invisible to every rule below.
    known = {s.uid for s in subscribers}
    for uid in chats:
        if uid not in known:
            subscribers.append(collect.Subscriber(uid, [], collect._load_sent(db, uid)))

    log.info(
        "%d subscriber(s) — %d telegram; market rule %s",
        len(subscribers),
        len(chats),
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
            # The live feed first, our own delayed route for whatever it did not
            # carry. See radar_alerts/live_prices.py for what that buys and what
            # it does NOT entitle the copy to claim.
            prices = live_prices.prices_for(sorted(tickers))

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

        origin = live_prices.site_origin()
        chat_id = chats.get(subscriber.uid)

        delivered_keys: list[str] = []
        for alert in alerts:
            reached_anyone = False

            if key:
                for subscription in list(subscriber.subscriptions):
                    outcome = sender.send(subscription, alert, key)
                    if outcome == sender.DELIVERED:
                        reached_anyone = True
                    elif outcome == sender.GONE_SUBSCRIPTION:
                        subscription["ref"].delete()
                        subscriber.subscriptions.remove(subscription)
                    else:
                        degraded = True

            # BOTH CHANNELS, NOT ONE OR THE OTHER. Somebody who linked Telegram
            # AND allowed browser notifications asked for both, and picking one
            # to suppress is a judgement nothing here has a basis for making.
            if telegram_token and chat_id is not None:
                if telegram.send(telegram_token, chat_id, alert, origin):
                    reached_anyone = True
                else:
                    # A blocked bot or a deleted account answers the same way as
                    # a bad minute at Telegram, and the two want opposite
                    # responses. Treated as transient here: the link is dropped
                    # only when the reader turns it off, because deleting it on a
                    # transport error would silently unsubscribe somebody who did
                    # nothing.
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
