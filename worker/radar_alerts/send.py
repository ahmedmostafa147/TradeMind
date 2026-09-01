"""Delivering one alert to one browser. THE NETWORK ONLY.

── WHY WEB PUSH AND NOT FIREBASE CLOUD MESSAGING ────────────────────────────

The Android app is not published — `site.playStoreUrl` is null and every
download button on the site still reads «قريبًا» — so a push aimed at the app
would reach nobody. Every user of this product is on the web, and the site is
already a PWA with a registered service worker, which is the whole prerequisite.

FCM would work for web too, and it costs `firebase/messaging` in the browser
bundle plus an FCM-shaped payload in a service worker that is currently thirty
readable lines of routing. The W3C Push API needs neither: the subscription is a
plain object the browser hands us, `sw.js` grows one `push` listener, and the
sender is this file. Same reasoning as lib/public-stats.ts reaching for REST
rather than dragging the Firestore SDK onto the landing page.

── THE VAPID KEYS ARE NOT IN THIS REPOSITORY ────────────────────────────────

The private key is a credential: whoever holds it can send a notification that
appears to come from Radar. It is read from the environment and set on the Cloud
Run job; the public half ships in the browser bundle because it is meant to
(`NEXT_PUBLIC_VAPID_PUBLIC_KEY`). Generating the pair is a one-line command in
worker/README.md and it is the operator's to run — nothing in this project has
ever committed a key and this is not the place to start.

── A GONE SUBSCRIPTION IS NOT AN ERROR ──────────────────────────────────────

Browsers expire push subscriptions routinely — a reinstall, cleared site data,
a long-idle profile. The push service answers 404 or 410 for those, and the only
correct response is to delete the row. Retrying it forever would mean every run
gets slower and noisier for as long as the product exists.
"""

from __future__ import annotations

import json
import logging
import os

from pywebpush import WebPushException, webpush

from radar_alerts.rules import Alert

log = logging.getLogger(__name__)

#: Sent to the push service so it can reach a human if our sender misbehaves.
#: A mailto is what the VAPID spec asks for; an unreachable one is worse than
#: none, so this is the address already published in site/lib/site.ts.
VAPID_SUBJECT = os.environ.get("RADAR_VAPID_SUBJECT", "mailto:ahmed14mostafa17@gmail.com")

#: Status codes that mean "this subscription will never work again".
GONE = (404, 410)


class MissingKey(RuntimeError):
    """Raised at startup, not per-send, so a misconfigured job fails loudly."""


def private_key() -> str:
    key = os.environ.get("RADAR_VAPID_PRIVATE_KEY", "").strip()
    if not key:
        raise MissingKey(
            "RADAR_VAPID_PRIVATE_KEY is not set. Generate a pair with "
            "`vapid --gen` (see worker/README.md), put the private half here "
            "and the public half in NEXT_PUBLIC_VAPID_PUBLIC_KEY on Vercel."
        )
    return key


#: The three outcomes, because the caller must treat them differently and a
#: bool cannot carry the difference.
#:
#:   DELIVERED  mark the alert key as sent, so it stays quiet for the window
#:   GONE       delete the subscription row; the browser will never accept again
#:   FAILED     keep the row, DO NOT mark as sent — a transient failure must
#:              leave the alert eligible to go out on the next run
DELIVERED = "delivered"
GONE_SUBSCRIPTION = "gone"
FAILED = "failed"


def send(subscription: dict, alert: Alert, key: str) -> str:
    """Pushes one alert and reports which of the three outcomes happened.

    NOTHING RAISES. A push service having a bad minute must not cost every other
    subscriber their alerts, so the failure is reported and the run carries on.
    """
    payload = json.dumps(
        {"title": alert.title, "body": alert.body, "path": alert.path},
        ensure_ascii=False,
    )
    try:
        webpush(
            subscription_info={
                "endpoint": subscription["endpoint"],
                "keys": subscription["keys"],
            },
            data=payload,
            vapid_private_key=key,
            vapid_claims={"sub": VAPID_SUBJECT},
            timeout=20,
        )
        return DELIVERED
    except WebPushException as error:
        status = getattr(error.response, "status_code", None)
        if status in GONE:
            log.info("subscription gone (%s), removing", status)
            return GONE_SUBSCRIPTION
        log.warning("push failed (%s): %s", status, error)
        return FAILED
    except Exception as error:  # noqa: BLE001 — see the docstring above.
        log.warning("push failed before it left: %s", error)
        return FAILED
