/**
 * «لو عايز مبلغ معيّن بعد مدة — هتوصله إمتى؟»
 *
 * The answer is computed from the user's OWN closed trades, never from a return
 * rate they type in. That is the whole point of the feature and the whole
 * difference between it and every compound-interest calculator on the internet:
 * those ask you to guess your edge and then flatter the guess. This one reads
 * the edge off the journal, and when the edge is negative it says so instead of
 * quietly projecting a smaller number.
 *
 * THE MODEL
 *   monthly profit = expectancy per trade × trades per month
 *   monthly rate   = monthly profit ÷ capital
 *   months         = ln(target ÷ capital) ÷ ln(1 + rate)
 *
 * Compounding, not flat addition, because the product itself compounds: the
 * position calculator sizes every trade from capital × risk%, so as capital
 * grows the money at risk grows with it and so does the expected profit per
 * trade. Projecting flat growth would understate a winning journal for exactly
 * the reason the app is built the way it is.
 *
 * WHY THIS IS WEB-ONLY, FOR NOW
 * Every other calculation in lib/ is a mirror of a Dart file in
 * lib/core/calc/ and the two must change together. This one has no Dart
 * counterpart yet because it is a new surface and the owner asked for the
 * website to be the focus. If it is ever added to the app, it moves under the
 * same mirroring rule as the rest — see CLAUDE.md §5.
 */

/**
 * Below this many closed trades the expectancy is noise, and a projection built
 * on it is a confident-looking number with nothing behind it.
 *
 * Ten is a judgement call, not a statistical threshold — a real confidence
 * interval on a trader's edge needs far more — but it is the point at which one
 * lucky trade stops dominating the average. The UI states the count rather than
 * hiding the rule, so somebody at seven trades knows exactly what unlocks it.
 */
export const MIN_CLOSED_TRADES = 10;

/**
 * Past this, the answer stops being a projection and becomes a joke. A journal
 * grinding out 0.1% a month against a 10× target genuinely does compute to
 * centuries, and printing «١٤٧٣ شهر» invites the reader to take the arithmetic
 * seriously when the honest message is "not on this trajectory".
 */
const MAX_MONTHS = 600;

export type Projection =
  /** Enough history, a positive edge, and a target that is actually ahead. */
  | {
      kind: 'reachable';
      months: number;
      /** True when the horizon was clamped — the caller must not print months. */
      beyondHorizon: boolean;
      monthlyProfit: number;
      monthlyRate: number;
      tradesPerMonth: number;
      expectancy: number;
    }
  /** The target is at or below current capital. */
  | { kind: 'already-there' }
  /** Fewer than MIN_CLOSED_TRADES closed trades. */
  | { kind: 'not-enough-history'; closedCount: number; needed: number }
  /**
   * Expectancy is zero or negative: the journal loses money per trade on
   * average, so no amount of time reaches a higher number. This is the most
   * valuable answer the feature gives, and it must never be softened into a
   * very large month count.
   */
  | { kind: 'no-edge'; expectancy: number; monthlyProfit: number };

/** A closed trade, reduced to the two fields this file needs. */
export type ClosedPoint = { exitDate: Date; pnl: number };

/**
 * Trades per month, measured over the span the journal actually covers.
 *
 * Uses first-to-last exit date rather than "trades ÷ months since signup": a
 * user who traded hard for two months, stopped for a year, and came back should
 * be projected on how they trade, not punished for the gap. The floor of one
 * month stops a burst of trades inside a single week from implying a rate of
 * eighty a month.
 */
export function tradesPerMonth(closed: ClosedPoint[]): number | null {
  if (closed.length === 0) return null;

  const times = closed.map((c) => c.exitDate.getTime());
  const spanDays = (Math.max(...times) - Math.min(...times)) / 86_400_000;
  const spanMonths = Math.max(1, spanDays / 30.44);

  return closed.length / spanMonths;
}

export function project({
  closed,
  capital,
  target,
  expectancy,
}: {
  closed: ClosedPoint[];
  capital: number;
  target: number;
  /**
   * Passed in rather than recomputed so this file and the dashboard can never
   * disagree about the figure — it is `Analytics.expectancy`, the same number
   * the «التوقّع الرياضي» tile shows.
   */
  expectancy: number | null;
}): Projection {
  if (target <= capital) return { kind: 'already-there' };

  if (closed.length < MIN_CLOSED_TRADES) {
    return {
      kind: 'not-enough-history',
      closedCount: closed.length,
      needed: MIN_CLOSED_TRADES,
    };
  }

  const rate = tradesPerMonth(closed);
  if (expectancy === null || rate === null) {
    return {
      kind: 'not-enough-history',
      closedCount: closed.length,
      needed: MIN_CLOSED_TRADES,
    };
  }

  const monthlyProfit = expectancy * rate;

  // Checked before the logarithm, not after: ln(1 + r) for r <= -1 is NaN or
  // -Infinity, and either would propagate into a rendered month count.
  if (monthlyProfit <= 0) {
    return { kind: 'no-edge', expectancy, monthlyProfit };
  }

  const monthlyRate = monthlyProfit / capital;
  const months = Math.log(target / capital) / Math.log(1 + monthlyRate);

  return {
    kind: 'reachable',
    months: Math.min(Math.ceil(months), MAX_MONTHS),
    beyondHorizon: months > MAX_MONTHS,
    monthlyProfit,
    monthlyRate,
    tradesPerMonth: rate,
    expectancy,
  };
}

/**
 * «سنة و٣ شهور» rather than «15 شهر».
 *
 * Arabic duals and plurals do not follow the English pattern — ١ شهر, ٢ شهرين,
 * ٣-١٠ شهور, ١١+ شهر — so this is spelled out rather than templated, because a
 * projection that reads like a bad translation undermines the number it carries.
 */
export function monthsLabel(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;

  const monthPart =
    rest === 0
      ? ''
      : rest === 1
        ? 'شهر'
        : rest === 2
          ? 'شهرين'
          : rest <= 10
            ? `${rest} شهور`
            : `${rest} شهر`;

  if (years === 0) return monthPart;

  const yearPart =
    years === 1
      ? 'سنة'
      : years === 2
        ? 'سنتين'
        : years <= 10
          ? `${years} سنين`
          : `${years} سنة`;

  return monthPart === '' ? yearPart : `${yearPart} و${monthPart}`;
}
