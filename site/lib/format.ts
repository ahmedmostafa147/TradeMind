/**
 * A faithful port of the app's lib/core/formatters.dart.
 *
 * The product mock-ups on this page show real numbers in the app's real
 * formats. Re-deriving them here rather than eyeballing "looks about right"
 * strings is what keeps the marketing screenshots honest as the app evolves —
 * and it preserves the one rule that file exists to enforce.
 *
 * That rule: every formatter is built against locale 'en' ON PURPOSE. intl's
 * 'ar' locale sets ZERO_DIGIT to ٠ and would render ٦٬٨٠٠٫٠٠; 'ar_EG' does not
 * help either, since CLDR assigns Egypt the 'arab' numbering system too. The
 * app requires Western digits, so 'en-US' it is, with the Arabic currency
 * suffix appended as a plain literal.
 */

export const EMPTY_VALUE = '—';
const CURRENCY_SUFFIX = 'ج.م';

const moneyFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const oneDecimalFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const integerFormat = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

/** "6,800.00 ج.م" */
export function money(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return EMPTY_VALUE;
  return `${moneyFormat.format(value)} ${CURRENCY_SUFFIX}`;
}

/** "+816.00 ج.م" / "-272.00 ج.م" — for P&L, where the sign carries meaning. */
export function signedMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return EMPTY_VALUE;
  const sign = value > 0 ? '+' : '';
  return `${sign}${moneyFormat.format(value)} ${CURRENCY_SUFFIX}`;
}

/** Takes a FRACTION and renders a percent: 0.12 -> "12.0%". */
export function percent(fraction: number | null | undefined): string {
  if (fraction == null || !Number.isFinite(fraction)) return EMPTY_VALUE;
  return `${oneDecimalFormat.format(fraction * 100)}%`;
}

/**
 * "+4.14%" — signed, two decimals, for an unrealised move.
 *
 * A port of LivePnlView._signedPct, and deliberately NOT `percent`: that one is
 * for a risk ratio, where a sign would be noise and one decimal is the
 * convention. This one sits next to a profit figure and has to agree with it.
 */
export function signedPercent(fraction: number | null | undefined): string {
  if (fraction == null || !Number.isFinite(fraction)) return EMPTY_VALUE;
  const pct = fraction * 100;
  return `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`;
}

/** "2.4R" */
export function rMultiple(r: number | null | undefined): string {
  if (r == null || !Number.isFinite(r)) return EMPTY_VALUE;
  return `${oneDecimalFormat.format(r)}R`;
}

export function quantity(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return EMPTY_VALUE;
  return integerFormat.format(value);
}

/** "2026/03/05" — built by hand, exactly as the Dart version is. */
export function dateLabel(value: Date | null | undefined): string {
  if (!value) return EMPTY_VALUE;
  const year = String(value.getFullYear()).padStart(4, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}
