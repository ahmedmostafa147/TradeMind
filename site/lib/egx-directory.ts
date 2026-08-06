/**
 * The bundled EGX directory — codes and Arabic names, for ticker suggestions.
 *
 * MIRROR OF the `egxDirectory` map in
 * lib/features/market/services/egx_market_service.dart, per CLAUDE.md §5. Same
 * thirty codes, same names, same search rule. If a code is added on one side it
 * has to be added on the other, or the two surfaces suggest different stocks
 * for the same typed letters.
 *
 * THIS IS A NAME LOOKUP, NOT A RECOMMENDATION LIST. Nothing here ranks, scores
 * or picks a stock — it turns letters the user is already typing into the code
 * and the Arabic name that go with them, so a trade is never saved against a
 * ticker they half-remembered. Suggesting WHICH stock to buy is the thing the
 * disclaimer and RELEASE.md rule out, and this deliberately does not do it: the
 * list is fixed, alphabetically arbitrary, and identical for every user.
 *
 * It is bundled rather than fetched for the reason the Dart doc gives: Yahoo's
 * search endpoint does not resolve EGX codes (searching "COMI" returns a
 * Chinese company, "TMGH" returns nothing), and a bundled list works offline —
 * which on this site means it works inside the service worker's cached shell.
 */
export const EGX_DIRECTORY: Record<string, string> = {
  COMI: 'البنك التجاري الدولي (CIB)',
  TMGH: 'مجموعة طلعت مصطفى القابضة',
  SWDY: 'السويدي إلكتريك',
  EAST: 'الشرقية - إيسترن كومباني',
  ABUK: 'أبو قير للأسمدة والصناعات الكيماوية',
  HRHO: 'مجموعة إي إف چي القابضة (هيرميس)',
  ETEL: 'المصرية للاتصالات',
  EKHO: 'القابضة المصرية الكويتية',
  ORWE: 'النساجون الشرقيون',
  AMOC: 'الإسكندرية للزيوت المعدنية (أموك)',
  CICH: 'سي آي كابيتال القابضة',
  MFPC: 'مصر لإنتاج الأسمدة (موبكو)',
  ISPH: 'ابن سينا فارما',
  ESRS: 'حديد عز',
  SKPC: 'سيدي كرير للبتروكيماويات',
  OCDI: 'السادس من أكتوبر للتنمية (سوديك)',
  PHDC: 'بالم هيلز للتعمير',
  HDBK: 'بنك التعمير والإسكان',
  ADIB: 'مصرف أبوظبي الإسلامي - مصر',
  CIEB: 'بنك كريدي أجريكول مصر',
  JUFO: 'جهينة للصناعات الغذائية',
  EFIH: 'إي فاينانس للاستثمارات المالية والرقمية',
  BTFH: 'بلتون المالية القابضة',
  GBCO: 'جي بي كورب (غبور)',
  EFID: 'إيديتا للصناعات الغذائية',
  ARCC: 'العربية للأسمنت',
  SUGR: 'الدلتا للسكر',
  RAYA: 'راية القابضة',
  OLFI: 'عبور لاند للصناعات الغذائية',
  EGAL: 'مصر للألومنيوم',
};

/**
 * Strips the `.CA` suffix and normalises case, so "comi.ca" and "COMI" resolve
 * to the same entry.
 */
export function normalizeTicker(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/\.CA/g, '');
}

/** The Arabic name for a ticker, or null when it is not in the directory. */
export function nameForTicker(symbol: string): string | null {
  return EGX_DIRECTORY[normalizeTicker(symbol)] ?? null;
}

export type DirectoryEntry = { code: string; name: string };

/**
 * Entries matching [query] by code or by Arabic name. An empty query returns
 * the whole list — the same contract the Dart `search` has, so the field can
 * offer the directory on focus before a letter is typed.
 */
export function searchTickers(query: string): DirectoryEntry[] {
  const q = query.trim();
  const entries = Object.entries(EGX_DIRECTORY).map(([code, name]) => ({
    code,
    name,
  }));
  if (q === '') return entries;
  const upper = q.toUpperCase();
  return entries.filter(
    (e) => e.code.includes(upper) || e.name.includes(q)
  );
}
