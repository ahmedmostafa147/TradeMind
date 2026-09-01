"""Every branch of radar_alerts.rules, with no network and no credential.

The cases that matter most here are the ones where the rule must NOT fire. A
notification product dies of false positives, not of missed ones — the reader
mutes it and the real alert never lands.
"""

from __future__ import annotations

from datetime import date

import pytest

from radar_alerts.rules import (
    Alert,
    OpenTrade,
    WatchItem,
    flow_flip,
    stop_breaches,
    suppress_recently_sent,
    watchlist_hits,
)

# ── flow_flip ────────────────────────────────────────────────────────────────


def test_flip_to_buying_after_a_run_of_selling():
    alert = flow_flip([5.0, -1.0, -2.0, -3.0])
    assert alert is not None
    assert alert.key == "flow-flip:buy"
    assert "مشترين" in alert.title
    assert "3 جلسات بيع" in alert.body


def test_flip_to_selling_after_a_run_of_buying():
    alert = flow_flip([-5.0, 1.0, 2.0])
    assert alert is not None
    assert alert.key == "flow-flip:sell"
    assert "بايعين" in alert.title


def test_a_single_session_on_the_other_side_is_noise_not_a_flip():
    # Foreign flows cross zero constantly. One session back is not a reversal,
    # and a rule that fired on it would push most days.
    assert flow_flip([5.0, -1.0, 4.0, 6.0]) is None


def test_no_flip_when_the_direction_never_changed():
    assert flow_flip([5.0, 4.0, 3.0, 2.0]) is None


def test_a_gap_ends_the_run_rather_than_being_skipped():
    # A session we could not read means we do not KNOW what happened. Claiming
    # "three sessions of selling" across a hole is a statement nobody made.
    assert flow_flip([5.0, -1.0, None, -3.0, -4.0]) is None


def test_today_exactly_flat_is_neither_side():
    assert flow_flip([0.0, -1.0, -2.0]) is None


def test_zero_inside_the_run_ends_it():
    assert flow_flip([5.0, -1.0, 0.0, -3.0]) is None


def test_too_few_sessions_to_judge():
    assert flow_flip([5.0, -1.0]) is None
    assert flow_flip([]) is None


def test_today_missing_is_not_a_flip():
    assert flow_flip([None, -1.0, -2.0]) is None


# ── watchlist_hits ───────────────────────────────────────────────────────────


def test_watchlist_fires_at_and_below_the_target():
    items = [WatchItem("w1", "COMI", 50.0)]
    assert len(watchlist_hits(items, {"COMI": 50.0})) == 1
    assert len(watchlist_hits(items, {"COMI": 49.0})) == 1


def test_watchlist_quiet_above_the_target():
    assert watchlist_hits([WatchItem("w1", "COMI", 50.0)], {"COMI": 50.01}) == []


def test_watchlist_needs_a_price_and_a_target():
    items = [WatchItem("w1", "COMI", 50.0)]
    assert watchlist_hits(items, {}) == []
    assert watchlist_hits(items, {"COMI": None}) == []
    assert watchlist_hits([WatchItem("w1", "COMI", 0.0)], {"COMI": 10.0}) == []


@pytest.mark.parametrize("bad", [0.0, -1.0, float("nan"), float("inf"), "10", True, None])
def test_a_bad_price_never_fires_anything(bad):
    # A missing quote arriving as 0 would read as a stock that fell to nothing
    # and would trip every rule in the book at once. CLAUDE.md §10: no price is
    # never zero.
    assert watchlist_hits([WatchItem("w1", "COMI", 50.0)], {"COMI": bad}) == []
    assert stop_breaches([OpenTrade("t1", "COMI", 50.0)], {"COMI": bad}) == []


def test_watchlist_key_is_stable_across_days():
    # Stable keys are what makes suppression work at all — a date in the key and
    # the quiet window never matches.
    a = watchlist_hits([WatchItem("w1", "COMI", 50.0)], {"COMI": 49.0})[0]
    b = watchlist_hits([WatchItem("w1", "COMI", 50.0)], {"COMI": 48.0})[0]
    assert a.key == b.key == "watch:w1"


# ── stop_breaches ────────────────────────────────────────────────────────────


def test_stop_fires_at_and_below():
    trades = [OpenTrade("t1", "HRHO", 20.0)]
    assert len(stop_breaches(trades, {"HRHO": 20.0})) == 1
    assert len(stop_breaches(trades, {"HRHO": 19.5})) == 1


def test_stop_quiet_above():
    assert stop_breaches([OpenTrade("t1", "HRHO", 20.0)], {"HRHO": 20.5}) == []


def test_stop_body_states_both_numbers_and_gives_no_instruction():
    alert = stop_breaches([OpenTrade("t1", "HRHO", 20.0)], {"HRHO": 19.0})[0]
    assert "19" in alert.body and "20" in alert.body
    for word in ("اشتري", "بيع", "بِع", "لازم", "ننصح"):
        assert word not in alert.body
        assert word not in alert.title


def test_only_the_matching_ticker_fires():
    trades = [OpenTrade("t1", "HRHO", 20.0), OpenTrade("t2", "COMI", 50.0)]
    alerts = stop_breaches(trades, {"HRHO": 19.0, "COMI": 60.0})
    assert [a.key for a in alerts] == ["stop:t1"]


# ── suppress_recently_sent ───────────────────────────────────────────────────

TODAY = date(2026, 9, 1)
ONE = [Alert("stop:t1", "t", "b", "/dashboard/")]


def test_recent_send_is_suppressed():
    assert suppress_recently_sent(ONE, {"stop:t1": "2026-08-28"}, TODAY) == []


def test_an_old_send_fires_again():
    assert len(suppress_recently_sent(ONE, {"stop:t1": "2026-08-01"}, TODAY)) == 1


def test_exactly_on_the_cutoff_fires():
    # cutoff = today - 14 = 2026-08-18; strictly-after is suppressed, so the
    # boundary day itself is allowed through.
    assert len(suppress_recently_sent(ONE, {"stop:t1": "2026-08-18"}, TODAY)) == 1
    assert suppress_recently_sent(ONE, {"stop:t1": "2026-08-19"}, TODAY) == []


def test_unknown_key_is_never_suppressed():
    assert len(suppress_recently_sent(ONE, {"watch:w9": "2026-08-31"}, TODAY)) == 1


@pytest.mark.parametrize("junk", ["", "not-a-date", "2026-13-45", None, 17])
def test_an_unreadable_date_is_treated_as_never_sent(junk):
    # Failing open costs one duplicate push. Failing closed costs a stop breach
    # that never arrives.
    assert len(suppress_recently_sent(ONE, {"stop:t1": junk}, TODAY)) == 1


def test_a_different_flip_direction_is_not_suppressed_by_the_first():
    alerts = [Alert("flow-flip:sell", "t", "b", "/")]
    assert len(suppress_recently_sent(alerts, {"flow-flip:buy": "2026-08-31"}, TODAY)) == 1
