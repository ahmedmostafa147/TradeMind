"""EGX investor-flow parsing. PURE — HTML string in, typed data out, no network.

A FAITHFUL PORT OF site/lib/market-flows.ts. Every rule below exists in that file
too, and the two must not drift: this writes the documents that the TypeScript
`decodeFlows` and the Dart `MarketFlows.fromMap` read. A parser that disagrees
with its readers stores sessions that render as blank days.

Kept apart from fetch.py for the same reason the TypeScript is: it is the only
part that can be tested without reaching egx.com.eg, which answers automated
requests with a bot challenge. See tests/test_parse.py.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from zoneinfo import ZoneInfo

from bs4 import BeautifulSoup

NATIONALITIES = ("egyptian", "arab", "foreign")
CLASSES = ("all", "institutions", "individuals")

#: The GridView that carries each investor class.
TABLE_IDS = {
    "all": "ctl00_C_Pc_GridView1",
    "institutions": "ctl00_C_Pc_gvInstByNationality",
    "individuals": "ctl00_C_Pc_gvIndByNationality",
}

# ORDER MATTERS. "Non-Arab Foreigners" contains "arab", so foreign is tested
# first or every foreign row would be filed as Arab — silently, and the two
# figures are of a similar magnitude, so nothing on the dashboard would look
# wrong.
_LABELS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("foreign", ("non-arab", "foreign", "أجانب", "اجانب")),
    ("arab", ("arab", "عرب")),
    ("egyptian", ("egyptian", "مصري", "مصر")),
)

_COLUMN_NEEDLES = {
    "bought": ("buy", "bought", "purchas", "شراء", "مشتريات"),
    "sold": ("sell", "sold", "sale", "بيع", "مبيعات"),
    "net": ("net", "صافي", "صافى"),
}

#: Arabic-Indic digits, for the Arabic rendering of the page.
_ARABIC_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")

#: NBSP and friends. ASP.NET GridViews emit &nbsp; in empty cells.
_SPACES = re.compile(r"[   \s]+")


@dataclass(frozen=True)
class FlowRow:
    bought: float
    sold: float
    #: Positive means a net buyer. TAKEN FROM THE PAGE, NEVER RECOMPUTED as
    #: bought - sold: if the exchange ever disagrees with that subtraction (a
    #: correction, a rounding rule, a column meaning something subtly different),
    #: the number stored must be theirs. `net_mismatch` surfaces the
    #: disagreement instead of hiding it.
    net: float
    net_mismatch: bool


@dataclass(frozen=True)
class MarketFlows:
    #: Session date, YYYY-MM-DD — also the document id.
    date: str
    all: dict[str, FlowRow]
    institutions: dict[str, FlowRow]
    individuals: dict[str, FlowRow]

    def table(self, which: str) -> dict[str, FlowRow]:
        return getattr(self, which)


def normalise(text: str) -> str:
    """Lowercased, with every flavour of whitespace collapsed to one space."""
    return _SPACES.sub(" ", text).strip().lower()


def nationality_of(label: str) -> str | None:
    """Matches an EGX row label to a nationality, or None.

    Substring matching rather than equality because the labels are not stable
    strings: the English page says "Non-Arab Foreigners", the Arabic one
    «أجانب غير عرب», and either may carry a footnote marker.
    """
    text = normalise(label)
    for nationality, needles in _LABELS:
        if any(needle in text for needle in needles):
            return nationality
    return None


def parse_money(raw: str) -> float | None:
    """``"368,885,661"`` -> 368885661.0, ``"(49,501,526)"`` -> -49501526.0,
    ``"-"`` -> None.

    Accepts Arabic-Indic digits because the Arabic page may serve them, and a
    parser that silently produced nothing on ٣ would store a broken session
    rather than fail loudly. Parentheses count as negative because
    accounting-style tables use them and a dropped minus sign INVERTS the entire
    meaning of the figure.
    """
    western = raw.translate(_ARABIC_DIGITS)
    trimmed = _SPACES.sub(" ", western).strip()

    if trimmed in ("", "-", "—", "–"):
        return None

    negative = bool(re.fullmatch(r"\(.*\)", trimmed)) or trimmed.startswith("-")
    digits = re.sub(r"[^0-9.]", "", trimmed)
    if digits in ("", "."):
        return None

    try:
        value = float(digits)
    except ValueError:
        return None
    if value != value or value in (float("inf"), float("-inf")):
        return None

    return -value if negative else value


def read_columns(headers: list[str]) -> dict[str, int] | None:
    """Which column is which, READ FROM THE HEADER ROW RATHER THAN ASSUMED.

    THIS IS NOT DEFENSIVENESS FOR ITS OWN SAKE — IT IS THE CORRECTNESS OF THE
    WHOLE FEATURE. A captured sample of this page has, for non-Arab foreigners,
    the three figures 68,319,014 / 129,318,526 / 60,999,512, and the third is
    exactly the second minus the first. Read one way that is foreigners buying
    61M net; read the other it is foreigners SELLING 61M net. The values alone
    cannot distinguish them, and a dashboard that gets it backwards does not
    degrade — it confidently tells a trader the opposite of what happened.

    So the order is never guessed. If the headers cannot be identified the table
    is rejected and nothing is stored: no data is recoverable, inverted data is
    not.
    """
    found: dict[str, int] = {}

    for index, raw in enumerate(headers):
        text = normalise(raw)
        # `net` is tested first: a header like «صافي الشراء» / "Net Buy" contains
        # both needles, and it is the net column.
        for key in ("net", "bought", "sold"):
            if key in found:
                continue
            if any(needle in text for needle in _COLUMN_NEEDLES[key]):
                found[key] = index
                break

    if len(found) != 3:
        return None
    return found


def parse_table(soup: BeautifulSoup, table_id: str) -> dict[str, FlowRow] | None:
    """Reads one GridView into a nationality -> FlowRow map, or None."""
    table = soup.find(id=table_id)
    if table is None:
        return None

    headers = [th.get_text() for th in table.find_all("th")]
    columns = read_columns(headers)
    if columns is None:
        return None

    widest = max(columns.values())
    out: dict[str, FlowRow] = {}

    for tr in table.find_all("tr"):
        cells = [td.get_text() for td in tr.find_all("td")]
        # Header rows carry <th>, and the GridView emits a footer row with a
        # different column count. Anything without every mapped column is not a
        # data row.
        if len(cells) <= widest:
            continue

        nationality = nationality_of(cells[0])
        if nationality is None or nationality in out:
            continue

        bought = parse_money(cells[columns["bought"]])
        sold = parse_money(cells[columns["sold"]])
        net = parse_money(cells[columns["net"]])
        if bought is None or sold is None or net is None:
            continue

        out[nationality] = FlowRow(
            bought=bought,
            sold=sold,
            net=net,
            # One EGP of tolerance absorbs the exchange's own rounding without
            # masking a real disagreement.
            net_mismatch=abs(bought - sold - net) > 1,
        )

    # A PARTIAL TABLE IS WORSE THAN NONE. A missing nationality would be stored
    # as absent, both readers reject the whole document for it (by design), and
    # the dashboard would show a blank day — but if either reader were ever made
    # lenient, the gap would render as a confident zero and read as «الأجانب ما
    # اشتروش النهاردة»: a statement about the market that nobody made.
    if any(n not in out for n in NATIONALITIES):
        return None

    return out


def parse_flows_page(html: str, date: str) -> MarketFlows | None:
    """Parses a whole page. None unless all three tables are present and complete.

    A half-parsed session is indistinguishable from a quiet day on the dashboard,
    which is why the threshold is all-or-nothing rather than best-effort.
    """
    soup = BeautifulSoup(html, "html.parser")

    tables = {}
    for cls in CLASSES:
        table = parse_table(soup, TABLE_IDS[cls])
        if table is None:
            return None
        tables[cls] = table

    return MarketFlows(date=date, **tables)


def cairo_date(now: datetime | None = None) -> str:
    """Session date in Cairo, as YYYY-MM-DD.

    Cairo, not UTC and not the host's clock: a Cloud Run job firing at 15:00
    Cairo is 13:00 UTC, which is the same calendar day — but a retry after
    midnight local time is not, and the document id IS the session date.
    """
    moment = now or datetime.now(ZoneInfo("Africa/Cairo"))
    return moment.astimezone(ZoneInfo("Africa/Cairo")).strftime("%Y-%m-%d")
