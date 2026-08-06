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

  /// The site's quote route — the single source of last-close prices for the
  /// app AND the browser. See fetchStockInfo for why it is not Yahoo directly.
  ///
  /// Points at production rather than being configurable: there is one
  /// deployment, and a build flag nobody sets is a way to ship a debug URL.
  static const String _quoteApi =
      'https://radar-one-phi.vercel.app/api/quote';

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
      // ONE SOURCE FOR BOTH SURFACES.
      //
      // This used to call Yahoo's chart endpoint directly while the browser
      // called it through /api/quote, so the same open position could show two
      // different last-close prices on the phone and on the site — and the
      // owner saw exactly that. The browser CANNOT call Yahoo (no CORS
      // headers), so the only endpoint both can share is ours.
      //
      // The cost is a dependency on our own deployment being up. That is the
      // right trade for a number the user compares across two screens: a price
      // that is briefly unavailable reads as «مفيش سعر», which is honest, while
      // two prices that disagree read as a broken product.
      final url = Uri.parse('$_quoteApi?symbols=$cleanSymbol');
      final response = await http
          .get(url, headers: _headers)
          .timeout(const Duration(seconds: 10));

      if (response.statusCode != 200) {
        return _cacheOrNull(cleanSymbol, await _fetchDirect(cleanSymbol));
      }

      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final quotes = data['quotes'] as List?;
      if (quotes == null || quotes.isEmpty) {
        return _cacheOrNull(cleanSymbol, await _fetchDirect(cleanSymbol));
      }

      final quote = quotes.first as Map<String, dynamic>;
      final price = (quote['price'] as num?)?.toDouble();
      // Null rather than a zero-priced placeholder, the same rule the route
      // follows: a missing price must never be arithmetic-ed into a 100% loss.
      if (price == null || !price.isFinite || price <= 0) return null;

      final change = (quote['change'] as num?)?.toDouble() ?? 0;
      final changePercent =
          ((quote['changePercent'] as num?)?.toDouble() ?? 0) * 100;

      final info = EgxStockInfo(
        symbol: cleanSymbol,
        name: egxDirectory[cleanSymbol] ??
            (quote['name'] as String? ?? cleanSymbol),
        price: price,
        change: change.isFinite ? change : 0,
        changePercent: changePercent.isFinite ? changePercent : 0,
        // NOT CARRIED BY THE SHARED ROUTE, and nothing reads them. The route
        // asks for five days rather than a year, because the only figure either
        // surface renders is the last close and the change against the session
        // before it. If a 52-week range is ever shown, widen the route's range
        // and fill these — do not fetch a second source for them.
        high52: 0,
        low52: 0,
        lastUpdated: DateTime.tryParse(quote['asOf'] as String? ?? '') ??
            DateTime.now(),
      );

      _cache[cleanSymbol] = info;
      return info;
    } catch (_) {
      // Our deployment is unreachable — offline, or down. The phone falls back
      // to the upstream source rather than losing its prices with it.
      try {
        return _cacheOrNull(cleanSymbol, await _fetchDirect(cleanSymbol));
      } catch (_) {
        return null;
      }
    }
  }

  static EgxStockInfo? _cacheOrNull(String symbol, EgxStockInfo? info) {
    if (info != null) _cache[symbol] = info;
    return info;
  }

  /// Yahoo, directly — the FALLBACK, not the normal path.
  ///
  /// The shared route is what keeps the phone and the browser showing the same
  /// number, so this only runs when that route cannot be reached at all. The
  /// browser has no equivalent (Yahoo sends no CORS headers), which is why a
  /// disagreement is impossible here: when this runs, the site is showing
  /// nothing rather than something different.
  ///
  /// Asks for a year because [EgxStockInfo.fromYahooJson] derives the 52-week
  /// range from it, and because omitting range/interval makes Yahoo return
  /// empty `indicators` and leave only a stale `meta` price.
  static Future<EgxStockInfo?> _fetchDirect(String symbol) async {
    final url = Uri.parse(
      'https://query1.finance.yahoo.com/v8/finance/chart/$symbol.CA'
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
      symbol,
      result.first as Map<String, dynamic>,
      preferredName: egxDirectory[symbol],
    );
    if (info == null || info.price <= 0) return null;
    return info;
  }
}
