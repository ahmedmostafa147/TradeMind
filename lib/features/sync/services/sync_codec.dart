import '../../../settings/settings.dart';
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
  // Risk settings
  //
  // Only the three values that change what a NUMBER means travel: capital, the
  // per-trade risk ceiling, and the waiting threshold. The rest of [Settings] is
  // device preference — whether to show the checklist, whether to confirm a
  // delete — and syncing those would push one device's habits onto another.
  // ---------------------------------------------------------------------------

  static Map<String, dynamic> riskSettingsToMap(Settings s) => {
    'capital': s.capital,
    'maxRiskPercent': s.maxRiskPercent,
    'waitingThresholdDays': s.waitingThresholdDays,
    // Added with the move to a single store. CLAUDE.md §5 recorded the cost of
    // leaving them out: the website hard-coded 5% and 2% because there was
    // nothing synced to read, so the two surfaces gave the same trade two
    // different verdicts for anybody who changed a default.
    'defaultTakeProfitPercent': s.defaultTakeProfitPercent,
    'defaultStopLossPercent': s.defaultStopLossPercent,
  };

  /// Applies a remote settings document onto [onto], field by field.
  ///
  /// Returns [onto] unchanged for anything missing or unusable rather than
  /// falling back to the class defaults: a half-written document must not
  /// silently reset a capital the user actually configured. The bounds match
  /// the ones firestore.rules enforces on write, because a document written
  /// before those rules existed is not covered by them.
  static Settings riskSettingsFromMap(
    Map<String, dynamic> map, {
    required Settings onto,
  }) {
    final capital = _toDouble(map['capital']);
    final maxRisk = _toDouble(map['maxRiskPercent']);
    // A whole number can arrive as either `int` or `double` depending on which
    // SDK wrote it, so it is read as `num` and rounded rather than cast.
    final waiting = _toDouble(map['waitingThresholdDays']);
    final takeProfit = _toDouble(map['defaultTakeProfitPercent']);
    final stopLoss = _toDouble(map['defaultStopLossPercent']);

    return onto.copyWith(
      capital: (capital != null && capital.isFinite && capital > 0)
          ? capital
          : null,
      maxRiskPercent: (maxRisk != null && maxRisk.isFinite && maxRisk > 0 && maxRisk <= 1)
          ? maxRisk
          : null,
      waitingThresholdDays: (waiting != null && waiting.isFinite && waiting >= 1)
          ? waiting.round()
          : null,
      defaultTakeProfitPercent:
          (takeProfit != null && takeProfit.isFinite && takeProfit > 0 && takeProfit <= 1)
          ? takeProfit
          : null,
      defaultStopLossPercent:
          (stopLoss != null && stopLoss.isFinite && stopLoss > 0 && stopLoss < 1)
          ? stopLoss
          : null,
    );
  }

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
