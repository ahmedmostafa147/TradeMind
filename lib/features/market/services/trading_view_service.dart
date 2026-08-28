import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/egx_stock_info.dart';

/// Fetches full EGX board quotes directly from TradingView's Egypt scanner.
class TradingViewService {
  static const _scannerUrl = 'https://scanner.tradingview.com/egypt/scan';

  static const _headers = {
    'Content-Type': 'application/json',
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
        '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Origin': 'https://www.tradingview.com',
  };

  /// IDENTICAL TO `SCANNER_BODY` IN site/lib/tradingview.ts — ON PURPOSE.
  ///
  /// This is the app's fallback for when `/api/stocks` cannot be reached, and a
  /// fallback that asks a different question is not a fallback. The filter used
  /// to be `type == stock` over 600 rows while the site asked `market == egypt`
  /// over 300, so the two surfaces ranked different sets of listings and showed
  /// different «أعلى ٥ أسهم» for the same session. Change one, change both.
  static const _payload = {
    'filter': [
      {'left': 'market', 'operation': 'equal', 'right': 'egypt'}
    ],
    'markets': ['egypt'],
    'options': {'lang': 'ar'},
    'columns': [
      'name',
      'description',
      'close',
      'change',
      'volume',
      'update_mode',
      // APPENDED, never inserted — both parsers read cells BY INDEX.
      'logoid'
    ],
    'sort': {'sortBy': 'volume', 'sortOrder': 'desc'},
    'range': [0, 300],
  };

  /// A logo slug, or null.
  ///
  /// MIRROR OF `LOGO_ID` in site/lib/tradingview.ts, and validated here for the
  /// same reason: the value ends up in a URL path. Measured against every slug
  /// the board returns — all 284 are `[a-z0-9-]`, longest 64 characters.
  static final RegExp _logoIdPattern = RegExp(r'^[a-z0-9][a-z0-9-]{0,79}$');

  static String? slug(Object? value) {
    if (value is! String) return null;
    final trimmed = value.trim().toLowerCase();
    return _logoIdPattern.hasMatch(trimmed) ? trimmed : null;
  }

  /// Fetches all listed EGX stocks with live prices from TradingView.
  static Future<List<EgxStockInfo>> fetchBoard() async {
    try {
      final response = await http
          .post(
            Uri.parse(_scannerUrl),
            headers: _headers,
            body: jsonEncode(_payload),
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode != 200) return [];
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      final data = body['data'] as List?;
      if (data == null) return [];

      final List<EgxStockInfo> stocks = [];
      final now = DateTime.now();

      for (final item in data) {
        if (item is! Map<String, dynamic>) continue;
        final cells = item['d'] as List?;
        if (cells == null || cells.length < 4) continue;

        final rawSymbol = cells[0] as String?;
        if (rawSymbol == null || rawSymbol.trim().isEmpty) continue;

        final symbol = rawSymbol.trim().toUpperCase().replaceAll('.CA', '');
        final description = (cells[1] as String?)?.trim();
        final close = (cells[2] as num?)?.toDouble();
        final changePct = (cells[3] as num?)?.toDouble() ?? 0.0;
        final logoId = cells.length > 6 ? slug(cells[6]) : null;

        if (close == null || !close.isFinite || close <= 0) continue;

        final changeVal = (close * changePct) / 100.0;

        stocks.add(
          EgxStockInfo(
            symbol: symbol,
            name: (description != null && description.isNotEmpty)
                ? description
                : symbol,
            price: close,
            change: changeVal.isFinite ? changeVal : 0.0,
            changePercent: changePct.isFinite ? changePct : 0.0,
            high52: close,
            low52: close,
            logoId: logoId,
            lastUpdated: now,
          ),
        );
      }
      return stocks;
    } catch (_) {
      return [];
    }
  }
}
