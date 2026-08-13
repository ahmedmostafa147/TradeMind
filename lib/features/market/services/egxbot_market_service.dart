import 'dart:convert';
import 'package:http/http.dart' as http;

class EgxBotHeroModel {
  final double? egx30Price;
  final double? egx30ChangePct;
  final String? gainerCode;
  final double? gainerChangePct;
  final DateTime asOf;

  EgxBotHeroModel({
    this.egx30Price,
    this.egx30ChangePct,
    this.gainerCode,
    this.gainerChangePct,
    required this.asOf,
  });

  factory EgxBotHeroModel.fromJson(Map<String, dynamic> json) {
    double? price;
    double? egxPct;
    if (json['egx30'] is Map<String, dynamic>) {
      final e = json['egx30'] as Map<String, dynamic>;
      if (e['price'] is num) price = (e['price'] as num).toDouble();
      if (e['change_pct'] is num) {
        egxPct = (e['change_pct'] as num).toDouble() / 100;
      }
    }

    String? gCode;
    double? gPct;
    if (json['gainer'] is Map<String, dynamic>) {
      final g = json['gainer'] as Map<String, dynamic>;
      if (g['code'] is String) gCode = g['code'] as String;
      if (g['change_pct'] is num) {
        gPct = (g['change_pct'] as num).toDouble() / 100;
      }
    }

    return EgxBotHeroModel(
      egx30Price: price,
      egx30ChangePct: egxPct,
      gainerCode: gCode,
      gainerChangePct: gPct,
      asOf: DateTime.now(),
    );
  }
}

class EgxBotMarketService {
  static const String _heroUrl = 'https://egxbot.com/live/hero';

  static Future<EgxBotHeroModel?> fetchLiveHero() async {
    try {
      final res = await http.get(
        Uri.parse(_heroUrl),
        headers: {
          'Accept': 'application/json',
          'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      ).timeout(const Duration(seconds: 5));

      if (res.statusCode == 200) {
        final body = json.decode(res.body);
        if (body is Map<String, dynamic>) {
          return EgxBotHeroModel.fromJson(body);
        }
      }
    } catch (_) {
      // Quiet fallback for non-blocking UI
    }
    return null;
  }
}
