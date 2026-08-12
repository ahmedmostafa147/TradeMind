import 'dart:convert';
import 'package:http/http.dart' as http;

import '../models/egx_stock_info.dart';
import 'trading_view_service.dart';

/// EGX (Egyptian Exchange) market data service integrated with TradingView.
class EgxMarketService {
  static final Map<String, EgxStockInfo> _cache = {};
  static DateTime? _lastBoardFetch;

  static const _headers = {
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
        '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
  };

  static const String _originOverride = String.fromEnvironment('RADAR_ORIGIN');
  static const String _fallbackOrigin = 'https://radar-one-phi.vercel.app';

  static List<String> get _quoteEndpoints => [
    if (_originOverride.isNotEmpty) '$_originOverride/api/quote',
    if (_originOverride != _fallbackOrigin) '$_fallbackOrigin/api/quote',
  ];

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

  static String? nameFor(String symbol) => egxDirectory[normalize(symbol)];

  static List<MapEntry<String, String>> search(String query) {
    final q = query.trim();
    if (q.isEmpty) return egxDirectory.entries.toList();
    final upper = q.toUpperCase();
    return egxDirectory.entries
        .where((e) => e.key.contains(upper) || e.value.contains(q))
        .toList();
  }

  static String normalize(String symbol) =>
      symbol.trim().toUpperCase().replaceAll('.CA', '');

  /// Fetches full market quotes from TradingView scanner.
  static Future<List<EgxStockInfo>> fetchTradingViewBoard() async {
    if (_lastBoardFetch != null &&
        DateTime.now().difference(_lastBoardFetch!).inMinutes < 3 &&
        _cache.isNotEmpty) {
      return _cache.values.toList();
    }
    final board = await TradingViewService.fetchBoard();
    if (board.isNotEmpty) {
      _lastBoardFetch = DateTime.now();
      for (final stock in board) {
        _cache[stock.symbol] = stock;
      }
    }
    return board.isNotEmpty ? board : _cache.values.toList();
  }

  static Future<EgxStockInfo?> fetchStockInfo(String symbol) async {
    final cleanSymbol = normalize(symbol);
    if (cleanSymbol.isEmpty) return null;

    final cached = _cache[cleanSymbol];
    if (cached != null &&
        DateTime.now().difference(cached.lastUpdated).inMinutes < 5) {
      return cached;
    }

    final board = await fetchTradingViewBoard();
    final fromBoard = board.where((s) => s.symbol == cleanSymbol).firstOrNull;
    if (fromBoard != null) {
      _cache[cleanSymbol] = fromBoard;
      return fromBoard;
    }

    for (final endpoint in _quoteEndpoints) {
      final info = await _fetchFromRoute(endpoint, cleanSymbol);
      if (info != null) {
        _cache[cleanSymbol] = info;
        return info;
      }
    }

    try {
      final direct = await _fetchDirect(cleanSymbol);
      if (direct != null) _cache[cleanSymbol] = direct;
      return direct;
    } catch (_) {
      return null;
    }
  }

  static Future<EgxStockInfo?> _fetchFromRoute(
      String endpoint, String cleanSymbol) async {
    try {
      final url = Uri.parse('$endpoint?symbols=$cleanSymbol');
      final response = await http.get(url, headers: _headers).timeout(
            const Duration(seconds: 8),
          );
      if (response.statusCode != 200) return null;
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final quotes = data['quotes'] as List?;
      if (quotes == null || quotes.isEmpty) return null;

      final quote = quotes.first as Map<String, dynamic>;
      final price = (quote['price'] as num?)?.toDouble();
      if (price == null || !price.isFinite || price <= 0) return null;

      final change = (quote['change'] as num?)?.toDouble() ?? 0;
      final changePct = ((quote['changePercent'] as num?)?.toDouble() ?? 0) * 100;

      return EgxStockInfo(
        symbol: cleanSymbol,
        name: egxDirectory[cleanSymbol] ?? (quote['name'] as String? ?? cleanSymbol),
        price: price,
        change: change.isFinite ? change : 0,
        changePercent: changePct.isFinite ? changePct : 0,
        high52: 0,
        low52: 0,
        lastUpdated: DateTime.now(),
      );
    } catch (_) {
      return null;
    }
  }

  static Future<EgxStockInfo?> _fetchDirect(String symbol) async {
    final url = Uri.parse(
        'https://query1.finance.yahoo.com/v8/finance/chart/$symbol.CA?range=1y&interval=1d');
    final response = await http.get(url, headers: _headers).timeout(
          const Duration(seconds: 8),
        );
    if (response.statusCode != 200) return null;
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    final result = data['chart']?['result'] as List?;
    if (result == null || result.isEmpty) return null;
    return EgxStockInfo.fromYahooJson(
      symbol,
      result.first as Map<String, dynamic>,
      preferredName: egxDirectory[symbol],
    );
  }
}
