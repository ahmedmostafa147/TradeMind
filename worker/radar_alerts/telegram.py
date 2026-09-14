"""Delivering an alert over Telegram, and linking an account to a chat.

── WHY TELEGRAM ALONGSIDE WEB PUSH ─────────────────────────────────────────

Web Push needs a permission the browser may refuse permanently, a service
worker, and — on iPhone — the site installed to the home screen first. Telegram
needs none of that: the reader taps a link, presses Start, and alerts arrive on
a phone that is already in their hand. For a product whose Android app is not
published, that is the shorter path to somebody actually being told their stop
broke.

Both channels stay. A reader who has neither gets nothing; a reader who has
both gets one message on each, because deciding which of somebody's two
channels to suppress is a judgement this has no basis for making.

── THE LINK IS A ONE-TIME CODE, NOT AN ID THE READER TYPES ─────────────────

Telegram identifies a chat by a numeric id, and asking somebody to find and
paste their own chat id is the kind of instruction that loses most of the people
who read it. Instead the settings screen shows a deep link carrying a short
random code; the reader presses Start; and this worker, on its next run, reads
`getUpdates`, matches the code, and stores the chat id.

THE CODE IS THE CREDENTIAL, so it is single-use and short-lived — see
`linkCode` in firestore.rules. Anybody who obtains a live code can attach THEIR
chat to somebody else's alerts, which would leak that person's watchlist and
stop levels one notification at a time.

── NO SERVER, ON PURPOSE ───────────────────────────────────────────────────

A webhook would need a public endpoint and a secret to verify Telegram's calls.
Long polling from a job that already runs on a schedule needs neither: the same
run that decides the alerts also drains the update queue. The cost is that
linking takes effect on the next run rather than instantly, and the settings
screen says so rather than leaving the reader watching a spinner.
"""

from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.parse
import urllib.request

from radar_alerts.rules import Alert

log = logging.getLogger(__name__)

API_BASE = "https://api.telegram.org"
TIMEOUT_SECONDS = 20


class MissingToken(RuntimeError):
    """Raised at startup so a misconfigured job fails loudly, not per-message."""


def bot_token() -> str:
    token = os.environ.get("RADAR_TELEGRAM_BOT_TOKEN", "").strip()
    if not token:
        raise MissingToken(
            "RADAR_TELEGRAM_BOT_TOKEN is not set. Create a bot with @BotFather, "
            "put its token here, and its username in NEXT_PUBLIC_TELEGRAM_BOT "
            "on Vercel so the settings screen can build the link."
        )
    return token


def _call(token: str, method: str, payload: dict) -> dict | None:
    """One Bot API call. Returns the `result`, or None on any failure.

    NOTHING RAISES. A Telegram outage must not cost every other subscriber their
    alerts, and a single blocked chat must not stop the run — so every failure
    is logged and reported as None for the caller to account for.
    """
    url = f"{API_BASE}/bot{token}/{method}"
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url, data=body, headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            parsed = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        # 403 is the ordinary "this user blocked the bot" answer. It is not a
        # fault and it is not retried — the caller removes the link instead.
        detail = ""
        try:
            detail = error.read().decode("utf-8")[:200]
        except Exception:  # noqa: BLE001
            pass
        log.warning("telegram %s failed (%s): %s", method, error.code, detail)
        return None
    except (urllib.error.URLError, TimeoutError, ValueError, OSError) as error:
        log.warning("telegram %s failed: %s", method, error)
        return None

    if not isinstance(parsed, dict) or not parsed.get("ok"):
        log.warning("telegram %s returned not-ok: %s", method, str(parsed)[:200])
        return None
    return parsed.get("result")


#: Telegram closes a chat to a bot the reader blocked, and to a deleted account.
#: Both mean "never send here again" rather than "try later".
BLOCKED_MARKERS = ("bot was blocked", "user is deactivated", "chat not found")


def send(token: str, chat_id: int, alert: Alert, site_origin: str) -> bool:
    """Sends one alert. True when Telegram accepted it.

    HTML rather than Markdown: a ticker is free text from the reader's own
    journal and MarkdownV2 requires escaping eighteen characters, where HTML
    needs three. `html.escape` on the parts is what keeps a stray `<` in a note
    from silently swallowing the rest of the message.
    """
    import html

    text = (
        f"<b>{html.escape(alert.title)}</b>\n"
        f"{html.escape(alert.body)}\n\n"
        f'<a href="{site_origin}{alert.path}">افتح رادار</a>'
    )
    result = _call(
        token,
        "sendMessage",
        {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML",
            # The link preview would repeat the site's Open Graph card under
            # every alert, which buries a two-line message under a banner.
            "link_preview_options": {"is_disabled": True},
        },
    )
    return result is not None


def drain_link_requests(token: str, offset_from: int | None) -> tuple[dict[str, int], int | None]:
    """Reads pending `/start <code>` messages.

    Returns the codes seen mapped to the chat that sent them, and the offset to
    resume from next run.

    ── THE OFFSET IS WHY THIS DOES NOT REPEAT ITSELF ───────────────────────────
    Telegram keeps an update until it is acknowledged, and acknowledgement IS
    asking for the next id. Storing that id is what stops every run from
    re-reading the same link request forever — and, because a code is single-use
    once redeemed, from trying to redeem a spent one on every future run.
    """
    payload: dict = {"timeout": 0, "allowed_updates": ["message"]}
    if offset_from is not None:
        payload["offset"] = offset_from

    updates = _call(token, "getUpdates", payload)
    if not isinstance(updates, list):
        return {}, offset_from

    codes: dict[str, int] = {}
    last_id = offset_from
    for update in updates:
        if not isinstance(update, dict):
            continue
        update_id = update.get("update_id")
        if isinstance(update_id, int):
            # +1 because Telegram's offset means "the first update I have NOT
            # seen", not "the last one I did".
            last_id = update_id + 1

        message = update.get("message")
        if not isinstance(message, dict):
            continue
        chat = message.get("chat")
        text = message.get("text")
        if not isinstance(chat, dict) or not isinstance(text, str):
            continue
        chat_id = chat.get("id")
        if not isinstance(chat_id, int):
            continue

        code = _start_payload(text)
        if code:
            codes[code] = chat_id

    return codes, last_id


def _start_payload(text: str) -> str | None:
    """The code out of `/start <code>`, or None.

    Bounded and character-checked before it is used as a lookup key: the string
    arrives from an open chat that anybody can message, and an unbounded one
    would become a query against Firestore built from a stranger's input.
    """
    parts = text.strip().split()
    if len(parts) != 2 or parts[0] not in ("/start", "/start@"):
        return None
    code = parts[1]
    if not (8 <= len(code) <= 64):
        return None
    if not all(c.isalnum() or c in "-_" for c in code):
        return None
    return code
