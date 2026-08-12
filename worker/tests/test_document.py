"""Tests for the document shape.

THESE ARE THE MOST IMPORTANT TESTS IN THE WORKER, and they need no Firestore, no
credential and no network — which is the whole reason document.py is separate from
store.py.

A service account bypasses firestore.rules completely, so the whitelist that
protects `marketFlows` from a malformed write does not apply to this process. The
rules cannot be exercised from here and would not fire anyway; `validate` is what
replaces them, and this is what proves it works.

`build_document` is also the contract with both readers — `decodeFlows` in
site/lib/market-flows-store.ts and `MarketFlows.fromMap` in
lib/features/market/models/market_flows.dart — each of which rejects a document
field by field and renders nothing when it does. A shape bug here is a blank day on
the dashboard with no error anywhere.
"""

from __future__ import annotations

import pytest

from radar_flows.document import (
    ALLOWED_KEYS,
    SOURCE,
    ShapeError,
    build_document,
    validate,
)
from radar_flows.parse import FlowRow, MarketFlows

#: Stands in for `firestore.SERVER_TIMESTAMP`. The sentinel is opaque to
#: `validate` by design — it is resolved server-side, so there is nothing here to
#: check beyond the key being present.
STAMP = object()


def row(bought=100.0, sold=50.0, net=50.0, mismatch=False) -> FlowRow:
    return FlowRow(bought=bought, sold=sold, net=net, net_mismatch=mismatch)


def table(**overrides) -> dict[str, FlowRow]:
    base = {"egyptian": row(), "arab": row(), "foreign": row()}
    base.update(overrides)
    return base


def flows(date="2026-08-11", **tables) -> MarketFlows:
    base = {"all": table(), "institutions": table(), "individuals": table()}
    base.update(tables)
    return MarketFlows(date=date, **base)


def document(date="2026-08-11", scope="Securities", **tables) -> dict:
    return build_document(flows(date, **tables), scope, fetched_at=STAMP)


class TestBuildDocument:
    def test_field_set_matches_the_rules_whitelist(self):
        assert set(document()) == ALLOWED_KEYS

    def test_net_mismatch_is_camel_case(self):
        # Both readers look for `netMismatch`, and decodeFlows treats anything but
        # literal true as false — so snake_case here would silently drop every
        # mismatch flag rather than failing.
        assert set(document()["all"]["egyptian"]) == {
            "bought",
            "sold",
            "net",
            "netMismatch",
        }

    def test_all_three_classes_carry_all_three_nationalities(self):
        built = document()
        for cls in ("all", "institutions", "individuals"):
            assert set(built[cls]) == {"egyptian", "arab", "foreign"}

    def test_source_is_recorded(self):
        assert document()["source"] == SOURCE

    def test_money_is_float_not_int(self):
        # Firestore's two SDKs disagree about whether a whole number round-trips as
        # an int or a double; both readers coerce, but writing floats keeps the
        # stored type stable.
        assert isinstance(document()["all"]["egyptian"]["bought"], float)

    def test_the_timestamp_sentinel_is_passed_through_untouched(self):
        assert document()["fetchedAt"] is STAMP


class TestValidate:
    def test_a_well_formed_document_passes(self):
        assert validate(document())

    def test_an_extra_field_is_refused(self):
        # The exact class of bug the rules would have caught for a client. An admin
        # console cannot do this; this worker can.
        built = document()
        built["debug"] = "oops"
        with pytest.raises(ShapeError, match="whitelist"):
            validate(built)

    def test_a_missing_field_is_refused(self):
        built = document()
        del built["institutions"]
        with pytest.raises(ShapeError, match="whitelist"):
            validate(built)

    def test_an_over_long_date_is_refused(self):
        # `date.size() <= 10` in the rules. YYYY-MM-DD is exactly ten, so an ISO
        # datetime slipping in here is caught rather than silently rejected by
        # Firestore later.
        with pytest.raises(ShapeError, match="longer than 10"):
            validate(document(date="2026-08-11T12:00:00Z"))

    def test_an_empty_date_is_refused(self):
        with pytest.raises(ShapeError, match="non-empty"):
            validate(document(date=""))

    def test_an_unknown_scope_is_refused(self):
        with pytest.raises(ShapeError, match="scope"):
            validate(document(scope="Derivatives"))

    def test_a_missing_nationality_is_refused(self):
        built = document()
        del built["all"]["arab"]
        with pytest.raises(ShapeError, match="exactly"):
            validate(built)

    def test_a_bool_in_a_money_field_is_refused(self):
        # BOOLS ARE INTS IN PYTHON: isinstance(True, int) is True, so a naive
        # numeric check passes this and both clients then read 1.0 EGP.
        built = document()
        built["all"]["egyptian"]["bought"] = True
        with pytest.raises(ShapeError, match="not a number"):
            validate(built)

    def test_a_string_in_a_money_field_is_refused(self):
        built = document()
        built["all"]["foreign"]["net"] = "50"
        with pytest.raises(ShapeError, match="not a number"):
            validate(built)

    def test_nan_is_refused(self):
        # NaN survives a float() call and poisons every sum downstream.
        built = document()
        built["all"]["arab"]["sold"] = float("nan")
        with pytest.raises(ShapeError, match="NaN"):
            validate(built)

    def test_infinity_is_refused(self):
        built = document()
        built["individuals"]["arab"]["bought"] = float("inf")
        with pytest.raises(ShapeError, match="infinite"):
            validate(built)

    def test_a_non_bool_mismatch_flag_is_refused(self):
        built = document()
        built["all"]["egyptian"]["netMismatch"] = "true"
        with pytest.raises(ShapeError, match="not a bool"):
            validate(built)

    def test_negative_money_is_allowed(self):
        # A net seller is negative. This must NOT be rejected — it is the single
        # most common real value in the collection.
        assert validate(document(all=table(foreign=row(net=-60999512.0))))

    def test_zero_is_allowed(self):
        # A genuine zero from the exchange is data. Only a MISSING figure is
        # refused, and parse_money returns None for that rather than 0.
        assert validate(document(all=table(arab=row(bought=0.0, sold=0.0, net=0.0))))
