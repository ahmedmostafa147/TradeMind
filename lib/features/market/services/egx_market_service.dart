import 'dart:convert';
import 'package:http/http.dart' as http;

import '../models/egx_stock_info.dart';

/// EGX (Egyptian Exchange) market data.
///
/// Prices come from Yahoo's chart endpoint, which is unofficial: it needs no
/// key but it is not a contract, and it can change or disappear. Treat a
/// missing price as "unknown", never as zero.
class EgxMarketService {
  static final Map<String, EgxStockInfo> _cache = {};

  /// Yahoo rejects Dart's default `Dart/3.x (dart:io)` agent with
  /// **429 Too Many Requests** — on the very first call, so it reads as rate
  /// limiting when it is really agent filtering. A browser agent returns 200.
  /// This single header is the difference between the live price working and
  /// every quote silently failing.
  static const _headers = {
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
        '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
  };

  /// Known Egyptian stocks with Arabic names, for offline suggestions and to
  /// label a ticker before any quote arrives.
  ///
  /// Every code here was verified against the live endpoint — an earlier
  /// version mapped `HELW` to حديد عز, but HELW returns no data at all and
  /// Ezz Steel is `ESRS`.
  static const Map<String, String> egxDirectory = {
    'COMI': 'البنك التجاري الدولي (CIB)',
    'TMGH': 'مجموعة طلعت مصطفى القابضة',
    'SWDY': 'السويدي إلكتريك',
    'EAST': 'الشرقية - إيسترن كومباني',
    'ABUK': 'أبو قير للأسمدة والصناعات الكيماوية',
    'HRHO': 'مجموعة إي إف چي القابضة (هيرميس)',
    'ETEL': 'المصرية للاتصالات',
    'EKHO': 'القابضة المصرية الكويتية',
    'ORWE': 'النساجون الشرقيون',
    'AMOC': 'الإسكندرية للزيوت المعدنية (أموك)',
    'CICH': 'سي آي كابيتال القابضة',
    'MFPC': 'مصر لإنتاج الأسمدة (موبكو)',
    'ISPH': 'ابن سينا فارما',
    'ESRS': 'حديد عز',
    'SKPC': 'سيدي كرير للبتروكيماويات',
    'OCDI': 'السادس من أكتوبر للتنمية (سوديك)',
    'PHDC': 'بالم هيلز للتعمير',
    'HDBK': 'بنك التعمير والإسكان',
    'ADIB': 'مصرف أبوظبي الإسلامي - مصر',
    'CIEB': 'بنك كريدي أجريكول مصر',
    'JUFO': 'جهينة للصناعات الغذائية',
    'EFIH': 'إي فاينانس للاستثمارات المالية والرقمية',
    'BTFH': 'بلتون المالية القابضة',
    'GBCO': 'جي بي كورب (غبور)',
    'EFID': 'إيديتا للصناعات الغذائية',
    'ARCC': 'العربية للأسمنت',
    'SUGR': 'الدلتا للسكر',
    'RAYA': 'راية القابضة',
    'OLFI': 'عبور لاند للصناعات الغذائية',
    'EGAL': 'مصر للألومنيوم',
  };

  /// The Arabic name for a ticker, or null when it is not in the directory.
  static String? nameFor(String symbol) =>
      egxDirectory[normalize(symbol)];

  /// Directory entries matching [query] by code or by Arabic name, for the
  /// ticker autocomplete. Empty query returns the whole list.
  static List<MapEntry<String, String>> search(String query) {
    final q = query.trim();
    if (q.isEmpty) return egxDirectory.entries.toList();
    final upper = q.toUpperCase();
    return egxDirectory.entries
        .where(
          (e) => e.key.contains(upper) || e.value.contains(q),
        )
        .toList();
  }

  /// Strips the `.CA` suffix and normalises case, so "comi.ca" and "COMI" hit
  /// the same cache entry.
  static String normalize(String symbol) =>
      symbol.trim().toUpperCase().replaceAll('.CA', '');

  /// Live quote for [symbol], or null when it cannot be fetched.
  ///
  /// Returns null rather than a zero-priced placeholder: callers render "price
  /// unavailable" for null, and a 0.0 would otherwise be arithmetic-ed into a
  /// 100% loss.
  static Future<EgxStockInfo?> fetchStockInfo(String symbol) async {
    final cleanSymbol = normalize(symbol);
    if (cleanSymbol.isEmpty) return null;

    final cached = _cache[cleanSymbol];
    if (cached != null &&
        DateTime.now().difference(cached.lastUpdated).inMinutes < 5) {
      return cached;
    }

    try {
      // The range/interval are required, not cosmetic: without them Yahoo
      // returns empty `indicators` and the only price left is the stale `meta`
      // block. A year of daily candles is what makes [EgxStockInfo.high52] and
      // `low52` mean what their names say — a month of them did not — and it
      // is still only ~250 numbers.
      final url = Uri.parse(
        'https://query1.finance.yahoo.com/v8/finance/chart/$cleanSymbol.CA'
        '?range=1y&interval=1d',
      );
      final response = await http
          .get(url, headers: _headers)
          .timeout(const Duration(seconds: 10));

      if (response.statusCode != 200) return null;

      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final result = data['chart']?['result'] as List?;
      if (result == null || result.isEmpty) return null;

      final info = EgxStockInfo.fromYahooJson(
        cleanSymbol,
        result.first as Map<String, dynamic>,
        // Yahoo has no Arabic names and often no longName for EGX at all, so
        // the curated directory wins when it knows the ticker.
        preferredName: egxDirectory[cleanSymbol],
      );
      // Null when the symbol has no candles at all (ESRS behaves this way).
      if (info == null || info.price <= 0) return null;

      _cache[cleanSymbol] = info;
      return info;
    } catch (_) {
      return null;
    }
  }
}
