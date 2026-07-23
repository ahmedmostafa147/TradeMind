import '../../../trades/timeline_entry.dart';
import '../../../trades/trade.dart';
import '../../../trades/trade_status.dart';
import '../../../watchlist/watchlist_item.dart';

/// Converts journal records to and from the plain maps Firestore stores.
///
/// Separated from the network layer so the round-trip is unit-testable without
/// Firebase — a backup that silently drops fields is worse than no backup, and
/// the only way to know it does not is to assert `decode(encode(x)) == x`.
///
/// Dates are ISO-8601 strings rather than Firestore Timestamps: the same codec
/// then works for a local JSON export, and there is no server-vs-client clock
/// ambiguity to reason about.
class SyncCodec {
  const SyncCodec._();

  // ---------------------------------------------------------------------------
  // Trade
  // ---------------------------------------------------------------------------

  static Map<String, dynamic> tradeToMap(Trade t) => {
    'id': t.id,
    'entryDate': t.entryDate.toIso8601String(),
    'ticker': t.ticker,
    'reason': t.reason,
    'entryPrice': t.entryPrice,
    'stopPrice': t.stopPrice,
    'quantity': t.quantity,
    'exitPrice': t.exitPrice,
    'exitDate': t.exitDate?.toIso8601String(),
    'notes': t.notes,
    // The resolved status, not the raw nullable field: a record written before
    // the status field existed must round-trip as what it actually behaves as.
    'status': t.status.name,
    'tags': t.tags,
    'isFavorite': t.isFavorite,
    'completedChecklistItems': t.completedChecklistItems,
    'timeline': [
      for (final e in t.timeline)
        {'date': e.date.toIso8601String(), 'text': e.text},
    ],
    'source': t.source,
    'takeProfitPrice': t.takeProfitPrice,
    // Absolute paths into this device's documents directory. Stored so a
    // same-device restore keeps its images; deliberately NOT restored onto a
    // different install, where they would be dangling references — see
    // [tradeFromMap].
    'screenshotPaths': t.screenshotPaths,
  };

  /// Rebuilds a trade. [keepScreenshots] should only be true when restoring
  /// onto the device the paths came from.
  static Trade tradeFromMap(
    Map<String, dynamic> map, {
    bool keepScreenshots = false,
  }) {
    final exitPrice = _toDouble(map['exitPrice']);
    final exitDate = _toDate(map['exitDate']);

    return Trade(
      id: map['id'] as String,
      entryDate: _toDate(map['entryDate']) ?? DateTime.now(),
      ticker: map['ticker'] as String? ?? '',
      reason: map['reason'] as String? ?? '',
      entryPrice: _toDouble(map['entryPrice']) ?? 0,
      stopPrice: _toDouble(map['stopPrice']) ?? 0,
      quantity: (map['quantity'] as num?)?.toInt() ?? 0,
      // Trade asserts these two are set together. A partially-written remote
      // record would otherwise crash the whole restore, so the pair is
      // normalised to "still open" rather than trusted.
      exitPrice: exitDate == null ? null : exitPrice,
      exitDate: exitPrice == null ? null : exitDate,
      notes: map['notes'] as String?,
      status: TradeStatus.fromName(
        map['status'] as String?,
        fallback: exitPrice == null ? TradeStatus.open : TradeStatus.closed,
      ),
      tags: _toStringList(map['tags']),
      isFavorite: map['isFavorite'] as bool? ?? false,
      completedChecklistItems: _toStringList(map['completedChecklistItems']),
      timeline: [
        for (final raw in (map['timeline'] as List?) ?? const [])
          if (raw is Map)
            TimelineEntry(
              date: _toDate(raw['date']) ?? DateTime.now(),
              text: raw['text'] as String? ?? '',
            ),
      ],
      source: map['source'] as String?,
      takeProfitPrice: _toDouble(map['takeProfitPrice']),
      screenshotPaths:
          keepScreenshots ? _toStringList(map['screenshotPaths']) : const [],
    );
  }

  // ---------------------------------------------------------------------------
  // Watchlist
  // ---------------------------------------------------------------------------

  static Map<String, dynamic> watchlistToMap(WatchlistItem w) => {
    'id': w.id,
    'ticker': w.ticker,
    'targetBuyPrice': w.targetBuyPrice,
    'stopPrice': w.stopPrice,
    'reason': w.reason,
    'priority': w.priority.name,
    'dateAdded': w.dateAdded.toIso8601String(),
    'source': w.source,
  };

  static WatchlistItem watchlistFromMap(Map<String, dynamic> map) =>
      WatchlistItem(
        id: map['id'] as String,
        ticker: map['ticker'] as String? ?? '',
        targetBuyPrice: _toDouble(map['targetBuyPrice']) ?? 0,
        stopPrice: _toDouble(map['stopPrice']) ?? 0,
        reason: map['reason'] as String? ?? '',
        priority: WatchPriority.fromName(map['priority'] as String?),
        dateAdded: _toDate(map['dateAdded']) ?? DateTime.now(),
        source: map['source'] as String?,
      );

  // ---------------------------------------------------------------------------
  // Coercion helpers
  //
  // Firestore hands back `int` for a whole number even when a `double` was
  // written, so every numeric read goes through `num`.
  // ---------------------------------------------------------------------------

  static double? _toDouble(Object? value) => (value as num?)?.toDouble();

  static DateTime? _toDate(Object? value) =>
      value is String ? DateTime.tryParse(value) : null;

  static List<String> _toStringList(Object? value) => [
    for (final item in (value as List?) ?? const []) item.toString(),
  ];
}
