enum WatchPriority {
  high,
  medium,
  low;

  String get label => switch (this) {
    WatchPriority.high => 'عالية',
    WatchPriority.medium => 'متوسطة',
    WatchPriority.low => 'منخفضة',
  };

  /// Sort weight — high first.
  int get rank => switch (this) {
    WatchPriority.high => 0,
    WatchPriority.medium => 1,
    WatchPriority.low => 2,
  };

  static WatchPriority fromName(String? name) {
    for (final value in WatchPriority.values) {
      if (value.name == name) return value;
    }
    return WatchPriority.medium;
  }
}

/// A ticker being watched for a future entry.
///
/// Deliberately NOT a trade, and stored in its own box: nothing here may ever
/// reach the journal's statistics, because a watched idea has never risked
/// money. Converting one produces a real [Trade] with status `planned`.
class WatchlistItem {
  final String id;
  final String ticker;
  final double targetBuyPrice;
  final double stopPrice;
  final String reason;
  final WatchPriority priority;
  final DateTime dateAdded;

  /// Who recommended it — a channel, an analyst, "تحليلي". Carried onto the
  /// trade when converted, so performance can be attributed back to it.
  final String? source;

  const WatchlistItem({
    required this.id,
    required this.ticker,
    required this.targetBuyPrice,
    required this.stopPrice,
    required this.reason,
    required this.priority,
    required this.dateAdded,
    this.source,
  });

  WatchlistItem copyWith({
    String? ticker,
    double? targetBuyPrice,
    double? stopPrice,
    String? reason,
    WatchPriority? priority,
    DateTime? dateAdded,
    String? source,
    bool clearSource = false,
  }) => WatchlistItem(
    id: id,
    ticker: ticker ?? this.ticker,
    targetBuyPrice: targetBuyPrice ?? this.targetBuyPrice,
    stopPrice: stopPrice ?? this.stopPrice,
    reason: reason ?? this.reason,
    priority: priority ?? this.priority,
    dateAdded: dateAdded ?? this.dateAdded,
    source: clearSource ? null : (source ?? this.source),
  );
}
