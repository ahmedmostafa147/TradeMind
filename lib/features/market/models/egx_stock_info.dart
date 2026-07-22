import 'package:flutter/foundation.dart';

/// Stock market price and metadata model for Egyptian Stock Exchange (EGX).
@immutable
class EgxStockInfo {
  final String symbol;
  final String name;
  final double price;
  final double change;
  final double changePercent;
  final double high52;
  final double low52;
  final String currency;
  final DateTime lastUpdated;

  const EgxStockInfo({
    required this.symbol,
    required this.name,
    required this.price,
    required this.change,
    required this.changePercent,
    required this.high52,
    required this.low52,
    this.currency = 'EGP',
    required this.lastUpdated,
  });

  factory EgxStockInfo.fromYahooJson(String ticker, Map<String, dynamic> json) {
    final meta = json['meta'] as Map<String, dynamic>? ?? {};
    final currentPrice =
        (meta['regularMarketPrice'] as num?)?.toDouble() ?? 0.0;
    final prevClose = (meta['chartPreviousClose'] as num?)?.toDouble() ??
        (meta['previousClose'] as num?)?.toDouble() ??
        currentPrice;
    final change = currentPrice - prevClose;
    final changePercent =
        prevClose != 0 ? ((change / prevClose) * 100) : 0.0;

    return EgxStockInfo(
      symbol: (meta['symbol'] as String? ?? ticker).replaceAll('.CA', ''),
      name: meta['longName'] as String? ??
          meta['shortName'] as String? ??
          ticker,
      price: currentPrice,
      change: change,
      changePercent: changePercent,
      high52: (meta['fiftyTwoWeekHigh'] as num?)?.toDouble() ?? currentPrice,
      low52: (meta['fiftyTwoWeekLow'] as num?)?.toDouble() ?? currentPrice,
      currency: meta['currency'] as String? ?? 'EGP',
      lastUpdated: DateTime.now(),
    );
  }
}
