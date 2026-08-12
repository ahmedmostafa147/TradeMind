"""Writing one session to Firestore. NOTHING HERE PARSES OR VALIDATES.

The shape guard that stands in for firestore.rules lives in document.py, so that
it can be tested without firebase-admin, a credential or a network. This file is
only the write — and the one thing it must not do is skip that guard, which is why
[save_flows] calls `validate` rather than trusting its caller.
"""

from __future__ import annotations

import logging
import os

import firebase_admin
from firebase_admin import credentials, firestore

from radar_flows.document import COLLECTION, build_document, validate
from radar_flows.parse import MarketFlows

log = logging.getLogger(__name__)


def init_app() -> None:
    """Initialises the Admin SDK once, from the ambient service account.

    On Cloud Run the metadata server supplies the credential and
    GOOGLE_APPLICATION_CREDENTIALS is unset; locally that variable points at a key
    file. `ApplicationDefault` covers both, so there is no branch here and no key
    path anywhere in the source.
    """
    if firebase_admin._apps:
        return

    project = os.environ.get("RADAR_FIREBASE_PROJECT", "trademind-6222c")
    firebase_admin.initialize_app(
        credentials.ApplicationDefault(), {"projectId": project}
    )
    log.info("Firebase initialised for project %s", project)


def save_flows(flows: MarketFlows, scope: str = "Securities") -> str:
    """Stores one session and returns its document path.

    Keyed by the session's own date so a re-run of the same day OVERWRITES rather
    than duplicating: the exchange revises figures during the session, and the
    last read of a day is the right one. Same rule as the manual admin form.
    """
    document = validate(
        build_document(flows, scope, fetched_at=firestore.SERVER_TIMESTAMP)
    )

    client = firestore.client()
    reference = client.collection(COLLECTION).document(flows.date)
    reference.set(document)

    log.info("wrote %s/%s (scope=%s)", COLLECTION, flows.date, scope)
    return f"{COLLECTION}/{flows.date}"
