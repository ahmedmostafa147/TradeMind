"""Tests for the pure parser.

The parser is the only part of this worker that can be tested at all: egx.com.eg
answers automated requests with a bot challenge, so `fetch.py` cannot be exercised
without a real browser reaching a real site, and a test that needs both is a test
that fails for reasons unrelated to the code.

That is also why the HTML below is synthetic. It reproduces the ASP.NET GridView
shape the real page emits — <th> headers, a footer row with a different column
count, &nbsp; in blanks — rather than being a captured sample, so the fixtures can
state which property each one is about.
"""

from __future__ import annotations

import pytest
from bs4 import BeautifulSoup

from radar_flows.parse import (
    TABLE_IDS,
    cairo_date,
    nationality_of,
    parse_flows_page,
    parse_money,
    parse_table,
    read_columns,
)


def gridview(
    table_id: str,
    *,
    headers: tuple[str, str, str] = ("Buy Value", "Sell Value", "Net Value"),
    rows: tuple[tuple[str, str, str, str], ...] = (
        ("Egyptians", "368,885,661", "319,384,135", "49,501,526"),
        ("Arabs", "12,400,000", "18,900,000", "(6,500,000)"),
        ("Non-Arab Foreigners", "68,319,014", "129,318,526", "(60,999,512)"),
    ),
    footer: bool = True,
) -> str:
    body = "".join(
        f"<tr><td>{label}</td><td>{a}</td><td>{b}</td><td>{c}</td></tr>"
        for label, a, b, c in rows
    )
    # The real GridView emits a footer with fewer columns. It must not be read as
    # a data row.
    tail = "<tr><td>Total</td><td>&nbsp;</td></tr>" if footer else ""
    return (
        f'<table id="{table_id}">'
        f"<tr><th>Nationality</th><th>{headers[0]}</th>"
        f"<th>{headers[1]}</th><th>{headers[2]}</th></tr>"
        f"{body}{tail}</table>"
    )


def full_page(**kwargs) -> str:
    return "<html><body>" + "".join(
        gridview(TABLE_IDS[cls], **kwargs)
        for cls in ("all", "institutions", "individuals")
    ) + "</body></html>"


# ── parse_money ────────────────────────────────────────────────────────────────


class TestParseMoney:
    def test_reads_thousands_separators(self):
        assert parse_money("368,885,661") == 368885661.0

    def test_parentheses_are_negative(self):
        # A dropped minus sign inverts the meaning of the figure, which is the
        # whole reason this is not a bare float() call.
        assert parse_money("(49,501,526)") == -49501526.0

    def test_leading_minus_is_negative(self):
        assert parse_money("-1,200") == -1200.0

    @pytest.mark.parametrize("blank", ["", "-", "—", "–", "   ", " "])
    def test_blanks_are_none_not_zero(self, blank):
        # None, never 0.0. A zero would render as «ما اشترى ولا باع» — a confident
        # statement about the session that the exchange did not make.
        assert parse_money(blank) is None

    def test_arabic_indic_digits(self):
        # The Arabic rendering of the page serves these. Returning None on them
        # would store a broken session; NaN would store a poisoned one.
        assert parse_money("٣٦٨,٨٨٥,٦٦١") == 368885661.0

    def test_decimals_survive(self):
        assert parse_money("1,234.56") == 1234.56

    def test_junk_is_none(self):
        assert parse_money("N/A") is None
        assert parse_money(".") is None


# ── nationality_of ─────────────────────────────────────────────────────────────


class TestNationalityOf:
    def test_non_arab_foreigners_is_foreign_not_arab(self):
        # THE ORDERING TRAP. "Non-Arab Foreigners" contains "arab"; matched in the
        # wrong order every foreign row is filed as Arab, silently, and the two
        # figures are of similar magnitude so nothing looks wrong.
        assert nationality_of("Non-Arab Foreigners") == "foreign"

    def test_arabic_labels(self):
        assert nationality_of("أجانب غير عرب") == "foreign"
        assert nationality_of("عرب") == "arab"
        assert nationality_of("مصريين") == "egyptian"

    def test_case_and_whitespace_insensitive(self):
        assert nationality_of("  EGYPTIANS  ") == "egyptian"

    def test_unknown_label(self):
        assert nationality_of("Total") is None


# ── read_columns ───────────────────────────────────────────────────────────────


class TestReadColumns:
    def test_reads_order_from_headers(self):
        got = read_columns(["Nationality", "Buy Value", "Sell Value", "Net Value"])
        assert got == {"bought": 1, "sold": 2, "net": 3}

    def test_reversed_order_is_read_not_assumed(self):
        # The property that matters: the same three numbers mean opposite things
        # depending on column order, so the order must come from the page.
        got = read_columns(["Nationality", "Net", "Sold", "Bought"])
        assert got == {"net": 1, "sold": 2, "bought": 3}

    def test_net_wins_a_header_containing_both_needles(self):
        got = read_columns(["Nationality", "صافي الشراء", "شراء", "بيع"])
        assert got == {"net": 1, "bought": 2, "sold": 3}

    def test_unidentifiable_headers_are_rejected(self):
        # Rejected, not guessed. No data is recoverable; inverted data is not.
        assert read_columns(["A", "B", "C", "D"]) is None
        assert read_columns(["Nationality", "Buy", "Sell"]) is None


# ── parse_table ────────────────────────────────────────────────────────────────


class TestParseTable:
    def parse(self, html: str, table_id: str = TABLE_IDS["all"]):
        return parse_table(BeautifulSoup(html, "html.parser"), table_id)

    def test_reads_three_nationalities(self):
        table = self.parse(gridview(TABLE_IDS["all"]))
        assert table is not None
        assert set(table) == {"egyptian", "arab", "foreign"}

    def test_net_comes_from_the_page(self):
        table = self.parse(gridview(TABLE_IDS["all"]))
        # 68,319,014 bought − 129,318,526 sold = −60,999,512, and the page says
        # (60,999,512). Both agree here; the point is that the stored value is the
        # page's column and not the subtraction.
        assert table["foreign"].net == -60999512.0
        assert table["foreign"].net_mismatch is False

    def test_a_disagreeing_net_is_flagged_not_corrected(self):
        rows = (
            ("Egyptians", "100", "50", "50"),
            ("Arabs", "100", "50", "999"),  # the exchange disagrees
            ("Non-Arab Foreigners", "100", "50", "50"),
        )
        table = self.parse(gridview(TABLE_IDS["all"], rows=rows))
        assert table["arab"].net == 999.0, "the exchange's figure is stored"
        assert table["arab"].net_mismatch is True
        assert table["egyptian"].net_mismatch is False

    def test_one_pound_of_rounding_is_tolerated(self):
        rows = (
            ("Egyptians", "100", "50", "51"),
            ("Arabs", "100", "50", "50"),
            ("Non-Arab Foreigners", "100", "50", "50"),
        )
        table = self.parse(gridview(TABLE_IDS["all"], rows=rows))
        assert table["egyptian"].net_mismatch is False

    def test_footer_row_is_not_a_data_row(self):
        table = self.parse(gridview(TABLE_IDS["all"], footer=True))
        assert table is not None and len(table) == 3

    def test_a_missing_nationality_rejects_the_whole_table(self):
        rows = (
            ("Egyptians", "100", "50", "50"),
            ("Arabs", "100", "50", "50"),
        )
        assert self.parse(gridview(TABLE_IDS["all"], rows=rows)) is None

    def test_an_unparseable_figure_rejects_the_whole_table(self):
        rows = (
            ("Egyptians", "100", "50", "50"),
            ("Arabs", "100", "-", "50"),  # blank sold
            ("Non-Arab Foreigners", "100", "50", "50"),
        )
        assert self.parse(gridview(TABLE_IDS["all"], rows=rows)) is None

    def test_absent_table(self):
        assert self.parse("<html><body></body></html>") is None


# ── parse_flows_page ───────────────────────────────────────────────────────────


class TestParseFlowsPage:
    def test_reads_all_three_classes(self):
        flows = parse_flows_page(full_page(), "2026-08-11")
        assert flows is not None
        assert flows.date == "2026-08-11"
        for cls in ("all", "institutions", "individuals"):
            assert set(flows.table(cls)) == {"egyptian", "arab", "foreign"}

    def test_one_missing_table_rejects_the_session(self):
        # All-or-nothing: a half-parsed session is indistinguishable from a quiet
        # day once it is on the dashboard.
        html = "<html><body>" + gridview(TABLE_IDS["all"]) + "</body></html>"
        assert parse_flows_page(html, "2026-08-11") is None

    def test_a_bot_challenge_body_is_rejected(self):
        challenge = '<html><head><script>window["bobcmn"]="1120…"</script></head></html>'
        assert parse_flows_page(challenge, "2026-08-11") is None


# ── cairo_date ─────────────────────────────────────────────────────────────────


class TestCairoDate:
    def test_formats_iso(self):
        from datetime import datetime
        from zoneinfo import ZoneInfo

        moment = datetime(2026, 8, 11, 15, 30, tzinfo=ZoneInfo("Africa/Cairo"))
        assert cairo_date(moment) == "2026-08-11"

    def test_converts_from_utc(self):
        # A job firing at 22:30 UTC is already the next day in Cairo, and the
        # document id IS the session date.
        from datetime import datetime, timezone

        moment = datetime(2026, 8, 11, 22, 30, tzinfo=timezone.utc)
        assert cairo_date(moment) == "2026-08-12"
