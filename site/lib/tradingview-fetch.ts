import {
  parseBoard,
  SCANNER_BODY,
  SCANNER_URL,
  type BoardRow,
} from '@/lib/tradingview';

/**
 * The EGX board from TradingView's scanner. THE NETWORK ONLY — parsing lives
 * in `tradingview.ts`, and this file exists so the two routes that fall back to
 * TradingView share one request instead of two copies of it.
 *
 * ── IT IS THE FALLBACK, NOT THE SOURCE ─────────────────────────────────────
 *
 * EGXBot answers first everywhere a price is shown (owner's call, 11 سبتمبر
 * 2026). This is asked only for what EGXBot did not answer: a ticker it does
 * not carry, or the whole board when its page could not be read. Undocumented
 * and unversioned, it may stop answering at any time, and when both sources are
 * gone the UI says «مفيش سعر» rather than showing a zero.
 */
export async function fetchTradingViewBoard(): Promise<BoardRow[] | null> {
  // The Egypt scanner first, the global one if it is down — same payload, and
  // the global one answers the same rows a little slower.
  const urls = [SCANNER_URL, 'https://scanner.tradingview.com/global/scan'];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Origin: 'https://www.tradingview.com',
        },
        body: JSON.stringify(SCANNER_BODY),
        signal: AbortSignal.timeout(10_000),
        cache: 'no-store',
      });
      if (!response.ok) continue;
      const rows = parseBoard(await response.json());
      if (rows.length > 0) return rows;
    } catch {
      // Try the next endpoint.
    }
  }
  return null;
}
