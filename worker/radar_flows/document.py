"""Building and validating one `marketFlows` document. PURE — no Firestore.

── THE ADMIN SDK BYPASSES firestore.rules ENTIRELY. THIS FILE IS THE ONLY GUARD.

Every other writer in this project is a CLIENT: the admin's browser, the phone.
They authenticate as a user and every write is checked against firestore.rules,
which pins a `marketFlows` document to exactly seven fields:

    ['date', 'scope', 'all', 'institutions', 'individuals', 'fetchedAt', 'source']

A service account is not a user. It is an owner, and the rules do not apply to it
at all — so a worker with a typo can park a field on a document that every
signed-in user renders, and the rule written to prevent precisely that will not
fire. [validate] re-implements the whitelist in Python for that reason. It is not
belt-and-braces: it is the check moving to the only place that can still make it.

The document must also satisfy BOTH readers, which validate field by field and
render nothing when they reject — `decodeFlows` in
site/lib/market-flows-store.ts and `MarketFlows.fromMap` in
lib/features/market/models/market_flows.dart. A shape bug here is a blank day on
the dashboard with no error anywhere, so the shape below is copied from
`saveFlows` and must stay identical to it.

SPLIT FROM store.py SO THESE CHECKS CAN BE TESTED WITHOUT firebase-admin — the
same separation parse.py has from fetch.py, and for the same reason: the part that
carries the correctness must be reachable without the part that needs a network
and a credential. The server timestamp is passed IN rather than imported, which is
the only thing that made this file impure.
"""

from __future__ import annotations

from radar_flows.parse import CLASSES, NATIONALITIES, FlowRow, MarketFlows

COLLECTION = "marketFlows"

#: Recorded on every document so a session's origin is auditable years later. The
#: manual admin form writes the same string, and the two paths must not become
#: distinguishable by accident.
SOURCE = "egx.com.eg/investorstypepiechart"

#: EXACTLY the keys firestore.rules whitelists. Not a superset, not a subset.
ALLOWED_KEYS = frozenset(
    {"date", "scope", "all", "institutions", "individuals", "fetchedAt", "source"}
)

ALLOWED_SCOPES = frozenset({"Securities", "Bonds", "All"})

_ROW_KEYS = {"bought", "sold", "net", "netMismatch"}


class ShapeError(ValueError):
    """The document this worker built would not have passed firestore.rules."""


def _row(row: FlowRow) -> dict[str, float | bool]:
    return {
        "bought": float(row.bought),
        "sold": float(row.sold),
        "net": float(row.net),
        # `netMismatch`, camelCase — both readers look for that spelling, and
        # decodeFlows treats anything but literal true as false, so a snake_case
        # key here would silently drop every mismatch flag rather than failing.
        "netMismatch": bool(row.net_mismatch),
    }


def build_document(flows: MarketFlows, scope: str, fetched_at: object) -> dict:
    """The document, exactly as `saveFlows` in market-flows-store.ts builds it.

    [fetched_at] is the caller's server-timestamp sentinel — `firestore.
    SERVER_TIMESTAMP` in production, any placeholder in a test. It is a parameter
    so this module never imports the SDK; see the note at the top.
    """
    return {
        "date": flows.date,
        "scope": scope,
        **{
            cls: {n: _row(flows.table(cls)[n]) for n in NATIONALITIES}
            for cls in CLASSES
        },
        "fetchedAt": fetched_at,
        "source": SOURCE,
    }


def validate(document: dict) -> dict:
    """Re-checks what the rules would have checked. Raises [ShapeError]."""
    keys = set(document)
    if keys != ALLOWED_KEYS:
        raise ShapeError(
            f"field set {sorted(keys)} does not match the rules whitelist "
            f"{sorted(ALLOWED_KEYS)}"
        )

    date = document["date"]
    if not isinstance(date, str) or not date:
        raise ShapeError("date must be a non-empty string")
    # `date.size() <= 10` in the rules. YYYY-MM-DD is exactly ten.
    if len(date) > 10:
        raise ShapeError(f"date {date!r} is longer than 10 characters")

    if document["scope"] not in ALLOWED_SCOPES:
        raise ShapeError(
            f"scope {document['scope']!r} is not one of {sorted(ALLOWED_SCOPES)}"
        )

    if not isinstance(document["source"], str) or not document["source"]:
        raise ShapeError("source must be a non-empty string")

    for cls in CLASSES:
        table = document[cls]
        if not isinstance(table, dict) or set(table) != set(NATIONALITIES):
            raise ShapeError(f"{cls} must carry exactly {sorted(NATIONALITIES)}")

        for nationality, row in table.items():
            if not isinstance(row, dict) or set(row) != _ROW_KEYS:
                raise ShapeError(f"{cls}.{nationality} has the wrong field set")

            if not isinstance(row["netMismatch"], bool):
                raise ShapeError(f"{cls}.{nationality}.netMismatch is not a bool")

            for field in ("bought", "sold", "net"):
                value = row[field]
                # BOOLS ARE INTS IN PYTHON. `isinstance(True, int)` is True, so a
                # bool leaking into a money field passes a naive numeric check and
                # is then read as 1.0 EGP by both clients.
                if isinstance(value, bool) or not isinstance(value, (int, float)):
                    raise ShapeError(f"{cls}.{nationality}.{field} is not a number")
                if value != value:  # NaN
                    raise ShapeError(f"{cls}.{nationality}.{field} is NaN")
                if value in (float("inf"), float("-inf")):
                    raise ShapeError(f"{cls}.{nationality}.{field} is infinite")

    return document
