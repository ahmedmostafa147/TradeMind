"""Reading what the rules need out of Firestore. NOTHING HERE DECIDES ANYTHING.

── THIS IS THE FILE THAT CROSSES A PRIVACY BOUNDARY, SO IT SAYS SO OUT LOUD ──

Every other reader of a user's book in this project is that user. `firestore.rules`
says it in as many words — trades, watchlist and risk settings are "owner, and
nobody else, ever", and `capital` was pushed down into a subcollection
specifically so the operator could not see it. The published privacy policy leans
on that.

A service account is not a user and the rules do not apply to it. So this file
CAN read every trade in the product, and personal alerts are the reason it does.
That is a real expansion of who touches the journal, and it was disclosed in the
privacy policy in the same change that introduced it — not afterwards.

Three things keep it as small as it can be, and all three are load-bearing:

  1. **PROJECTIONS, NOT DOCUMENTS.** Every read below is `.select(...)` with the
     two or three fields a rule compares. Entry prices, quantities, notes,
     reasons, tags, timelines and screenshots are never fetched — not filtered
     out afterwards, never sent by the server at all. `capital` and the risk
     settings are not touched by any query here.
  2. **ONLY SUBSCRIBED USERS.** The walk starts from `push` subscriptions, not
     from `users`. Somebody who never turned notifications on has no document in
     that collection, so nothing of theirs is ever read. Turning the feature off
     deletes the subscription, which removes them from the walk on the next run.
  3. **NOTHING IS KEPT.** The values live in memory for one run. The only thing
     written back is a map of alert-key → date, which records that a push went
     out and carries no price, no ticker and no money.
"""

from __future__ import annotations

import logging

from google.cloud.firestore_v1 import FieldFilter

from radar_alerts.rules import OpenTrade, WatchItem

log = logging.getLogger(__name__)

#: Per-user subcollection holding one document per browser that opted in.
PUSH_COLLECTION = "push"

#: Per-user document holding the Telegram link: the one-time code the settings
#: screen showed, and the chat id once the reader has pressed Start.
TELEGRAM_COLLECTION = "telegram"
TELEGRAM_DOCUMENT = "link"

#: Per-user document recording which alert keys have already gone out.
#: Written by this worker and read by nobody else — see firestore.rules, where
#: it has no client rule at all and therefore falls to the deny-all catch-all.
STATE_COLLECTION = "notifications"
STATE_DOCUMENT = "state"


class Subscriber:
    """One user who has at least one live push subscription."""

    __slots__ = ("uid", "subscriptions", "sent")

    def __init__(self, uid: str, subscriptions: list[dict], sent: dict[str, str]):
        self.uid = uid
        self.subscriptions = subscriptions
        self.sent = sent


def load_subscribers(db) -> list[Subscriber]:
    """Everybody who opted in, with their devices and their send history.

    A COLLECTION GROUP QUERY, so this is one read of the `push` collection across
    all users rather than a walk of `users`. That is not only cheaper — it is the
    minimisation in point 2 above expressed as a query: the set of people this
    worker knows about IS the set who asked to be notified.
    """
    by_uid: dict[str, list[dict]] = {}

    for snapshot in db.collection_group(PUSH_COLLECTION).stream():
        data = snapshot.to_dict() or {}
        endpoint = data.get("endpoint")
        keys = data.get("keys")
        if not isinstance(endpoint, str) or not isinstance(keys, dict):
            # A malformed row is skipped rather than raising: one bad document
            # must not stop every other subscriber's alerts for the day.
            log.warning("skipping malformed subscription %s", snapshot.reference.path)
            continue

        # users/{uid}/push/{subId} — the grandparent is the user document.
        user_ref = snapshot.reference.parent.parent
        if user_ref is None:
            continue

        by_uid.setdefault(user_ref.id, []).append(
            {"endpoint": endpoint, "keys": keys, "ref": snapshot.reference}
        )

    subscribers = []
    for uid, subscriptions in by_uid.items():
        subscribers.append(Subscriber(uid, subscriptions, _load_sent(db, uid)))
    return subscribers


def _load_sent(db, uid: str) -> dict[str, str]:
    """The alert-key → ISO-date map for one user, or an empty one."""
    snapshot = (
        db.collection("users")
        .document(uid)
        .collection(STATE_COLLECTION)
        .document(STATE_DOCUMENT)
        .get()
    )
    if not snapshot.exists:
        return {}
    data = snapshot.to_dict() or {}
    sent = data.get("sent")
    return sent if isinstance(sent, dict) else {}


def save_sent(db, uid: str, sent: dict[str, str]) -> None:
    """Records that these keys went out today.

    Written AFTER a successful send, never before. The other order would suppress
    an alert that failed to deliver — and a stop breach that is both undelivered
    and marked as sent is the single worst state this feature can reach.
    """
    (
        db.collection("users")
        .document(uid)
        .collection(STATE_COLLECTION)
        .document(STATE_DOCUMENT)
        .set({"sent": sent})
    )


def load_watchlist(db, uid: str) -> list[WatchItem]:
    """One user's watchlist, PROJECTED to the two fields a rule compares.

    `priority`, `note`, `dateAdded` and `stopPrice` are not requested. The
    server never sees them.
    """
    out: list[WatchItem] = []
    query = (
        db.collection("users")
        .document(uid)
        .collection("watchlist")
        .select(["ticker", "targetBuyPrice"])
    )
    for snapshot in query.stream():
        data = snapshot.to_dict() or {}
        ticker = data.get("ticker")
        target = data.get("targetBuyPrice")
        if not isinstance(ticker, str) or not ticker:
            continue
        if not isinstance(target, (int, float)) or isinstance(target, bool):
            continue
        out.append(WatchItem(snapshot.id, ticker.strip().upper(), float(target)))
    return out


def load_open_trades(db, uid: str) -> list[OpenTrade]:
    """One user's OPEN positions, projected to ticker and stop.

    Filtered server-side on `status == 'open'`, so planned ideas, cancelled ones
    and the entire closed history are never read. Entry price, exit price,
    quantity, reason, tags and the timeline are not in the projection — a stop
    rule needs the stop and the symbol, and nothing else is asked for.

    `status` is in the projection because Firestore requires a field used in a
    filter to be selected alongside the rest.
    """
    out: list[OpenTrade] = []
    query = (
        db.collection("users")
        .document(uid)
        .collection("trades")
        .where(filter=FieldFilter("status", "==", "open"))
        .select(["ticker", "stopPrice", "status"])
    )
    for snapshot in query.stream():
        data = snapshot.to_dict() or {}
        ticker = data.get("ticker")
        stop = data.get("stopPrice")
        if not isinstance(ticker, str) or not ticker:
            continue
        if not isinstance(stop, (int, float)) or isinstance(stop, bool):
            continue
        out.append(OpenTrade(snapshot.id, ticker.strip().upper(), float(stop)))
    return out


def load_recent_foreign_nets(db, sessions: int) -> list[float | None]:
    """The foreign net for the most recent sessions, newest first.

    PUBLIC MARKET DATA — the same `marketFlows` documents this worker writes and
    every signed-in user reads. No user data is involved in the market rule at
    all, which is why it can be evaluated once and sent to everybody.

    Ordered by document id because the id IS the session date (`YYYY-MM-DD`),
    which sorts correctly as a string and needs no index.
    """
    from google.cloud.firestore_v1 import Query

    nets: list[float | None] = []
    query = (
        db.collection("marketFlows")
        .order_by("__name__", direction=Query.DESCENDING)
        .limit(sessions)
    )
    for snapshot in query.stream():
        data = snapshot.to_dict() or {}
        table = data.get("all")
        row = table.get("foreign") if isinstance(table, dict) else None
        net = row.get("net") if isinstance(row, dict) else None
        if isinstance(net, (int, float)) and not isinstance(net, bool):
            nets.append(float(net))
        else:
            # A session we could not read keeps its place in the list as a hole.
            # `flow_flip` ends the run there rather than reading across it.
            nets.append(None)
    return nets


# ── Telegram links. Same minimisation as everything else above. ──────────────


def load_telegram_links(db) -> tuple[dict[str, int], dict[str, str]]:
    """`(chat id by uid, uid by pending link code)`.

    ONE COLLECTION GROUP READ, not a walk of `users` — the same reason
    `load_subscribers` starts from `push`. Somebody who never opened the
    settings screen has no document here and is never read.
    """
    chats: dict[str, int] = {}
    pending: dict[str, str] = {}

    for snapshot in db.collection_group(TELEGRAM_COLLECTION).stream():
        user_ref = snapshot.reference.parent.parent
        if user_ref is None:
            continue
        data = snapshot.to_dict() or {}

        chat_id = data.get("chatId")
        if isinstance(chat_id, int) and not isinstance(chat_id, bool):
            chats[user_ref.id] = chat_id

        code = data.get("linkCode")
        if isinstance(code, str) and code and user_ref.id not in chats:
            pending[code] = user_ref.id

    return chats, pending


def save_telegram_chat(db, uid: str, chat_id: int) -> None:
    """Completes a link, and SPENDS THE CODE in the same write.

    The code is a credential — anybody holding a live one can attach their own
    chat to this reader's alerts and start receiving their watchlist and stop
    levels. Deleting it at the moment it is redeemed is what makes it
    single-use.
    """
    from google.cloud.firestore_v1 import DELETE_FIELD

    (
        db.collection("users")
        .document(uid)
        .collection(TELEGRAM_COLLECTION)
        .document(TELEGRAM_DOCUMENT)
        .set({"chatId": chat_id, "linkCode": DELETE_FIELD}, merge=True)
    )


def clear_telegram_chat(db, uid: str) -> None:
    """Drops a chat the bot can no longer reach — blocked, or account deleted."""
    (
        db.collection("users")
        .document(uid)
        .collection(TELEGRAM_COLLECTION)
        .document(TELEGRAM_DOCUMENT)
        .delete()
    )


# ── The bot's own read cursor. Not user data. ────────────────────────────────


def load_update_offset(db) -> int | None:
    """Where `getUpdates` should resume from.

    Stored OUTSIDE any user document because it belongs to the bot, not to a
    reader. Without it every run re-reads the same link requests forever.
    """
    snapshot = db.collection("botState").document("telegram").get()
    if not snapshot.exists:
        return None
    value = (snapshot.to_dict() or {}).get("updateOffset")
    return value if isinstance(value, int) and not isinstance(value, bool) else None


def save_update_offset(db, offset: int | None) -> None:
    if offset is None:
        return
    db.collection("botState").document("telegram").set({"updateOffset": offset})
