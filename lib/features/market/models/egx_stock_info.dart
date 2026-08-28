import 'package:flutter/foundation.dart';

/// A price quote for an EGX-listed stock.
@immutable
class EgxStockInfo {
  final String symbol;
  final String name;
  final double price;
  final double change;
  final double changePercent;

  /// Highest and lowest close in the fetched window. The service asks for a
  /// year of daily candles, so these are the 52-week figures the names claim —
  /// but they are only ever as wide as the range the caller requested.
  final double high52;
  final double low52;

  final String currency;

  /// TradingView's slug for the company logo — `telecom-egypt`.
  ///
  /// Null for the ~3% of listings that have none, and for every quote that came
  /// from Yahoo, which knows nothing about logos. The UI treats null as a normal
  /// state and shows the ticker chip — see [StockLogo].
  final String? logoId;

  /// When the app fetched this.
  final DateTime lastUpdated;

  /// The close date of the candle [price] came from — EGX closes daily, so
  /// this is normally the previous trading day. Surfaced so the UI can say how
  /// old the number is instead of implying it is a live tick.
  final DateTime? priceDate;

  const EgxStockInfo({
    required this.symbol,
    required this.name,
    required this.price,
    required this.change,
    required this.changePercent,
    required this.high52,
    required this.low52,
    this.logoId,
    this.currency = 'EGP',
    required this.lastUpdated,
    this.priceDate,
  });

  /// Builds a quote from Yahoo's chart payload.
  ///
  /// The price comes from the **candle series**, not from `meta`. For EGX
  /// symbols Yahoo's `meta` block is a stale mutual-fund record: for COMI it
  /// reported 81.20 dated July 2024 while the real close was 140.00, and its
  /// own `fiftyTwoWeekLow` (91.50) sat *above* that price — impossible, and the
  /// clearest proof the block cannot be trusted. Every ticker tested showed the
  /// same skew (ETEL 32.77 vs 103.28, EGAL 103.05 vs 301.12).
  ///
  /// Returns null when there is no usable candle, so callers show "unavailable"
  /// rather than a fabricated number.
  static EgxStockInfo? fromYahooJson(
    String ticker,
    Map<String, dynamic> json, {
    /// Wins over Yahoo's own name — the curated Arabic directory beats
    /// "COMI.CA,0P0000AUZ4,5721726".
    String? preferredName,
  }) {
    final meta = json['meta'] as Map<String, dynamic>? ?? const {};

    final quote =
        ((json['indicators'] as Map<String, dynamic>?)?['quote'] as List?)
            ?.firstOrNull as Map<String, dynamic>?;
    final closes = (quote?['close'] as List?) ?? const [];
    final timestamps = (json['timestamp'] as List?) ?? const [];

    // Trailing nulls are normal: today's candle exists before it has traded.
    final usable = <({double close, int? ts})>[];
    for (var i = 0; i < closes.length; i++) {
      final value = (closes[i] as num?)?.toDouble();
      if (value == null || !value.isFinite || value <= 0) continue;
      usable.add((
        close: value,
        ts: i < timestamps.length ? (timestamps[i] as num?)?.toInt() : null,
      ));
    }
    if (usable.isEmpty) return null;

    final latest = usable.last;
    final previous = usable.length > 1 ? usable[usable.length - 2].close : null;

    final change = previous == null ? 0.0 : latest.close - previous;
    final changePercent = (previous == null || previous == 0)
        ? 0.0
        : (change / previous) * 100;

    // Derived from the same series for the same reason the price is.
    final allCloses = usable.map((e) => e.close);
    final high = allCloses.reduce((a, b) => a > b ? a : b);
    final low = allCloses.reduce((a, b) => a < b ? a : b);

    return EgxStockInfo(
      symbol: (meta['symbol'] as String? ?? ticker).replaceAll('.CA', ''),
      name: preferredName ?? ticker,
      price: latest.close,
      change: change,
      changePercent: changePercent,
      high52: high,
      low52: low,
      currency: meta['currency'] as String? ?? 'EGP',
      lastUpdated: DateTime.now(),
      priceDate: latest.ts == null
          ? null
          : DateTime.fromMillisecondsSinceEpoch(latest.ts! * 1000),
    );
  }
}
