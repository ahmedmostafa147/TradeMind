import 'dart:convert';
import 'package:http/http.dart' as http;

import '../models/egx_stock_info.dart';

/// EGX Egyptian Stock Exchange market data service.
class EgxMarketService {
  static final Map<String, EgxStockInfo> _cache = {};

  /// Known Egyptian stocks directory with Arabic names.
  static const Map<String, String> egxDirectory = {
    'COMI': 'البنك التجاري الدولي (CIB)',
    'TMGH': 'مجموعة طلعت مصطفى القابضة',
    'SWDY': 'السويدي إلكتريك',
    'EAST': 'الشرقية - إيسترن كومباني',
    'ABUK': 'أبو قير للأساد والأصباغ',
    'HRHO': 'مجموعة أي إف جي القابضة (هيرميس)',
    'ETEL': 'المصرية للاتصالات',
    'EKHO': 'المصرية الكويتية القابضة',
    'ORWE': 'النساجون الشرقيون',
    'AMOC': 'الإسكندرية للزيوت المعدنية (أموك)',
    'CICH': 'سي آي كابيتال القابضة',
    'MFPC': 'مصر لإنتاج الأسمدة (موبكو)',
    'HELW': 'حديد عز',
    'ISPH': 'ابن سينا فارما',
  };

  /// Fetches stock info & live price for given symbol (e.g., COMI, TMGH).
  static Future<EgxStockInfo?> fetchStockInfo(String symbol) async {
    final cleanSymbol = symbol.trim().toUpperCase().replaceAll('.CA', '');
    if (cleanSymbol.isEmpty) return null;

    if (_cache.containsKey(cleanSymbol)) {
      final cached = _cache[cleanSymbol]!;
      if (DateTime.now().difference(cached.lastUpdated).inMinutes < 5) {
        return cached;
      }
    }

    try {
      final url = Uri.parse(
        'https://query1.finance.yahoo.com/v8/finance/chart/$cleanSymbol.CA',
      );
      final response = await http.get(url).timeout(const Duration(seconds: 6));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final result = data['chart']?['result'] as List?;
        if (result != null && result.isNotEmpty) {
          final info = EgxStockInfo.fromYahooJson(
            cleanSymbol,
            result.first as Map<String, dynamic>,
          );
          _cache[cleanSymbol] = info;
          return info;
        }
      }
    } catch (_) {}

    // Fallback info if offline or ticker unsupported
    final arabicName = egxDirectory[cleanSymbol] ?? cleanSymbol;
    return EgxStockInfo(
      symbol: cleanSymbol,
      name: arabicName,
      price: 0.0,
      change: 0.0,
      changePercent: 0.0,
      high52: 0.0,
      low52: 0.0,
      lastUpdated: DateTime.now(),
    );
  }
}
