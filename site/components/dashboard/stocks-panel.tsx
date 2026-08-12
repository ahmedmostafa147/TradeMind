'use client';

import { useMemo, useState } from 'react';

import { money, percent } from '@/lib/format';
import { useBoard } from '@/lib/use-board';
import { DELAY_LABEL } from '@/lib/tradingview';

/**
 * «الأسهم» — EVERY stock listed on the Egyptian Exchange, with its price during
 * the session.
 *
 * MIRROR OF lib/features/market/screens/stocks_screen.dart. The two are the same
 * screen on two devices, and the tap does the same thing on both: seeds a new
 * trade with the ticker already filled in.
 *
 * ── IT LISTED THIRTY, AND THE EXCHANGE HAS ABOUT 293 ───────────────────────
 *
 * The first version read `EGX_DIRECTORY` and asked `/api/quote` for its thirty
 * keys. That directory exists to VALIDATE a ticker someone types — it was never
 * a claim about what trades in Egypt — so a screen called «الأسهم» built from it
 * silently omitted seven listings in eight, and the prices it did show were
 * yesterday's close.
 *
 * `/api/stocks` returns the whole board in one request, with each company's name
 * and a price from during the session. See lib/tradingview.ts for what that
 * source is and what it is not.
 *
 * NEVER A ZERO IN AN EMPTY ROW. The project's rule everywhere prices are shown: a
 * price that did not arrive must not look like a stock that did not move. Rows
 * with no usable price are dropped upstream in `parseBoard` rather than rendered
 * as 0.
 */

type SortKey = 'name' | 'change';

export function StocksPanel({
  onPick,
}: {
  /** Starts a new trade seeded with this ticker. */
  onPick: (ticker: string) => void;
}) {
  // THE WHOLE BOARD, NOT THIRTY HARDCODED CODES. `EGX_DIRECTORY` has thirty
  // entries and exists to validate a ticker someone types; it was never the list
  // of what trades on the exchange. `/api/stocks` returns every listing — 293
  // when this was wired up — with the name and the price in one request.
  const { rows: board, loading, error } = useBoard();

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('change');

  const rows = useMemo(() => {
    const q = query.trim();
    const upper = q.toUpperCase();

    // By code OR by name, the same rule the ticker field uses — most people know
    // «البنك التجاري الدولي», not COMI.
    const list = board.filter(
      (row) =>
        q === '' || row.symbol.includes(upper) || row.name.includes(q)
    );

    if (sort === 'name') {
      return [...list].sort((a, b) => a.symbol.localeCompare(b.symbol));
    }
    // Biggest mover first. A row with no percent sinks rather than counting as
    // 0% — an unknown is not a flat day.
    return [...list].sort((a, b) => {
      const av = a.changePercent;
      const bv = b.changePercent;
      if (av == null && bv == null) return a.symbol.localeCompare(b.symbol);
      if (av == null) return 1;
      if (bv == null) return -1;
      return bv - av;
    });
  }, [board, query, sort]);

  return (
    <section className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold">الأسهم</h2>
          <p className="mt-1 text-xs text-fg-muted">
            كل الأسهم المقيدة في البورصة المصرية. اضغط على أي سهم عشان تبدأ
            صفقة بيه.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSort(sort === 'name' ? 'change' : 'name')}
            className="rounded-md border border-border-default px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-surface-high"
          >
            {sort === 'name' ? 'رتّب بالتغيّر' : 'رتّب بالاسم'}
          </button>
        </div>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="دوّر بالرمز أو بالاسم…"
        aria-label="ابحث عن سهم"
        className="w-full rounded-md border border-border-default bg-surface-low px-3 py-2.5 text-sm outline-none focus:border-brand-ink"
      />

      {loading && (
        <p role="status" className="text-xs text-fg-subtle">
          جاري تحميل الأسعار…
        </p>
      )}

      {/* REPORTED, NOT SWALLOWED. This is the whole screen, not one blank cell
          beside a trade — an empty list with no reason reads as "the Egyptian
          exchange has no stocks". */}
      {error !== null && (
        <p
          role="alert"
          className="rounded-md border border-loss-border bg-loss-surface p-4 text-sm font-semibold text-loss"
        >
          {error}
        </p>
      )}

      {!loading && error === null && rows.length === 0 ? (
        <p className="rounded-lg border border-border-default bg-surface p-6 text-center text-sm text-fg-muted">
          مفيش سهم بالاسم ده.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ symbol, name, price, changePercent }) => {
            const pct = changePercent;
            const tone =
              pct == null || pct === 0
                ? 'text-fg-muted'
                : pct > 0
                  ? 'text-win'
                  : 'text-loss';

            return (
              <li key={symbol}>
                <button
                  type="button"
                  onClick={() => onPick(symbol)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-border-default bg-surface p-3 text-start transition-colors hover:border-border-strong hover:bg-surface-high"
                >
                  <span className="min-w-0">
                    <span className="num block text-sm font-bold" dir="ltr">
                      {symbol}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-fg-muted">
                      {name}
                    </span>
                  </span>

                  <span className="shrink-0 text-end">
                    <span className="num block text-sm font-bold">
                      {money(price)}
                    </span>
                    <span className={`num mt-0.5 block text-xs font-semibold ${tone}`}>
                      {pct == null ? '' : `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* THE DELAY IS STATED, AND IT IS READ OFF THE RESPONSE. Selling a
          fifteen-minute feed as live is the claim this product keeps clear of. */}
      <p className="text-xs leading-relaxed text-fg-subtle">
        الأسعار {DELAY_LABEL} ومن مصدر غير رسمي — مش أسعار لحظية. رادار بيعرضها
        كما هي ومش بيقدّم أي توصية بيع أو شراء.
      </p>
    </section>
  );
}
