"""Entry point. Fetch one session, parse it, store it — or fail loudly.

    python -m radar_flows.main                    # today, Securities, write
    python -m radar_flows.main --dry-run          # parse and print, write nothing
    python -m radar_flows.main --scope Bonds
    python -m radar_flows.main --html sample.html # parse a saved page, no browser

EXIT CODES ARE THE ALERTING CONTRACT. Cloud Scheduler and Cloud Run Jobs treat a
non-zero exit as a failed run and that is what surfaces in monitoring, so every
failure path below exits non-zero and prints why. The one thing this must never do
is exit 0 having stored nothing: «السوق» renders an empty collection and a failed
write identically, so a silent failure looks exactly like a quiet market.
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

from radar_flows.parse import CLASSES, NATIONALITIES, cairo_date, parse_flows_page

EXIT_OK = 0
EXIT_FETCH_FAILED = 2
EXIT_PARSE_FAILED = 3
EXIT_WRITE_FAILED = 4


def _configure_logging(verbose: bool) -> None:
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
        stream=sys.stderr,
    )


def _summarise(flows) -> str:
    """One line per investor class, so a successful run is legible in a log tail."""
    lines = [f"session {flows.date}"]
    for cls in CLASSES:
        table = flows.table(cls)
        parts = [
            f"{n}={table[n].net:+,.0f}" + ("!" if table[n].net_mismatch else "")
            for n in NATIONALITIES
        ]
        lines.append(f"  {cls:<13} net: " + "  ".join(parts))
    if any(flows.table(c)[n].net_mismatch for c in CLASSES for n in NATIONALITIES):
        lines.append(
            "  ! = the exchange's net column disagrees with bought-sold by "
            "more than 1 EGP; the exchange's figure is what was stored"
        )
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="radar-flows", description=__doc__)
    parser.add_argument(
        "--scope",
        default="Securities",
        choices=("Securities", "Bonds", "All"),
        help="which instruments the session covers (default: Securities)",
    )
    parser.add_argument(
        "--date",
        default=None,
        help="override the session date, YYYY-MM-DD (default: today in Cairo)",
    )
    parser.add_argument(
        "--html",
        type=Path,
        default=None,
        help="parse a saved HTML file instead of launching a browser",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="parse and print, write nothing to Firestore",
    )
    parser.add_argument(
        "--show-browser",
        action="store_true",
        help="run Chromium headed, for debugging the bot challenge locally",
    )
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args(argv)

    _configure_logging(args.verbose)
    log = logging.getLogger("radar_flows")

    date = args.date or cairo_date()

    # ── fetch ───────────────────────────────────────────────────────────────
    if args.html is not None:
        if not args.html.exists():
            print(f"no such file: {args.html}", file=sys.stderr)
            return EXIT_FETCH_FAILED
        html = args.html.read_text(encoding="utf-8", errors="replace")
        log.info("parsing %s (%d bytes), no browser", args.html, len(html))
    else:
        # Imported here, not at module scope: --html must work in an environment
        # with no Playwright browsers installed, which is how the parser gets
        # exercised against a captured page in CI.
        from radar_flows.fetch import fetch_flows_html

        log.info("fetching scope=%s with a real browser", args.scope)
        outcome = fetch_flows_html(args.scope, headless=not args.show_browser)
        if not outcome.ok:
            print(f"fetch failed: {outcome.reason}", file=sys.stderr)
            if outcome.sample:
                print(f"body began: {outcome.sample}", file=sys.stderr)
            return EXIT_FETCH_FAILED
        html = outcome.html
        log.info("fetched %d bytes", len(html))

    # ── parse ───────────────────────────────────────────────────────────────
    flows = parse_flows_page(html, date)
    if flows is None:
        print(
            "parse failed: fetched a page but could not read three complete "
            "tables from it. Either the bot challenge was served with a 200, or "
            "EGX changed the GridView layout. Re-run with --show-browser to look.",
            file=sys.stderr,
        )
        print(f"html was {len(html)} bytes; began: {html[:400]!r}", file=sys.stderr)
        return EXIT_PARSE_FAILED

    print(_summarise(flows))

    if args.dry_run:
        # ASCII in log messages, deliberately. A Windows console defaults to
        # cp1252 and mangles an em-dash into a replacement character, which makes
        # a developer chasing an encoding bug out of a line that has none.
        log.info("dry run: nothing written")
        return EXIT_OK

    # ── store ───────────────────────────────────────────────────────────────
    try:
        from radar_flows.store import init_app, save_flows

        init_app()
        path = save_flows(flows, args.scope)
    except Exception as error:  # noqa: BLE001 — the exit code is the contract
        print(f"write failed: {error}", file=sys.stderr)
        return EXIT_WRITE_FAILED

    print(f"stored {path}")
    return EXIT_OK


if __name__ == "__main__":
    raise SystemExit(main())
