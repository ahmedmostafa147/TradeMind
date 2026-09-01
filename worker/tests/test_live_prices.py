"""The live-quotes parser, against every shape the feed might send.

WRITTEN BLIND, AND THAT IS THE POINT. `/live/quotes` answers
`{"open": false, "quotes": {}}` outside session hours, so a populated payload
has never been observed. These cases pin the behaviour that must hold whatever
the shape turns out to be: a price is only ever a positive finite number, an
entry nobody can read is counted rather than guessed, and nothing is invented.
"""

from __future__ import annotations

import pytest

from radar_alerts.live_prices import parse_quotes


def test_closed_session_with_no_quotes_is_not_an_error():
    # The exact payload the feed returns outside trading hours.
    prices, is_open = parse_quotes({"open": False, "quotes": {}})
    assert prices == {}
    assert is_open is False


def test_a_bare_number_entry_is_a_price():
    prices, is_open = parse_quotes({"open": True, "quotes": {"COMI": 41.5}})
    assert prices == {"COMI": 41.5}
    assert is_open is True


@pytest.mark.parametrize("key", ["price", "last", "close", "last_price", "c"])
def test_an_object_entry_is_read_under_any_of_the_likely_keys(key):
    prices, _ = parse_quotes({"open": True, "quotes": {"HRHO": {key: 20.25}}})
    assert prices == {"HRHO": 20.25}


def test_a_numeric_string_is_accepted():
    # Feeds serialise prices as strings often enough that rejecting them would
    # mean no alerts at all, discovered only during a live session.
    prices, _ = parse_quotes({"open": True, "quotes": {"COMI": "41.50"}})
    assert prices == {"COMI": 41.5}


@pytest.mark.parametrize("bad", [0, -1, "abc", "", None, True, False, [], {}, float("nan")])
def test_nothing_that_is_not_a_positive_number_becomes_a_price(bad):
    # A zero standing in for "unknown" would fire every stop in the book at once.
    prices, _ = parse_quotes({"open": True, "quotes": {"COMI": bad}})
    assert prices == {}


def test_tickers_are_normalised_and_blanks_dropped():
    prices, _ = parse_quotes(
        {"open": True, "quotes": {" comi ": 41.5, "": 10.0, "   ": 9.0}}
    )
    assert prices == {"COMI": 41.5}


def test_readable_entries_survive_unreadable_neighbours():
    # One malformed row must not cost every other subscriber their alerts.
    prices, _ = parse_quotes(
        {"open": True, "quotes": {"COMI": 41.5, "HRHO": {"nope": 1}, "TMGH": 8.95}}
    )
    assert prices == {"COMI": 41.5, "TMGH": 8.95}


@pytest.mark.parametrize(
    "body",
    [None, [], "", 0, {"open": True}, {"open": True, "quotes": []}, {"quotes": {}}],
)
def test_a_shape_we_do_not_recognise_yields_nothing_rather_than_guesses(body):
    prices, _ = parse_quotes(body)
    assert prices == {}


def test_open_flag_is_read_independently_of_the_quotes():
    _, is_open = parse_quotes({"open": True, "quotes": {}})
    assert is_open is True
