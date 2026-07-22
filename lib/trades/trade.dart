import 'timeline_entry.dart';
import 'trade_status.dart';

/// A single long-only position in the journal.
///
/// Deliberately knows nothing about capital or the risk limit — those live in
/// [Settings] and are passed explicitly into the calculation layer. That is what
/// lets a settings change recompute every trade's metrics for free.
class Trade {
  final String id;
  final DateTime entryDate;
  final String ticker;
  final String reason;
  final double entryPrice;
  final double stopPrice;
  final int quantity;

  /// null means the position is still open.
  final double? exitPrice;
  final DateTime? exitDate;
  final String? notes;

  // ---- Added in phase 2. All default so every phase-1 call site still
  // compiles unchanged, and records written before these existed read back
  // with the same defaults.

  /// Null means "not explicitly set" — see the [status] getter. A const
  /// constructor cannot compute a default from another parameter, and storing
  /// a hardcoded `open` here would silently reclassify every closed trade that
  /// predates this field.
  final TradeStatus? _status;

  /// Free-form labels: بريك أوت، سوينج، توزيعات…
  final List<String> tags;

  final bool isFavorite;

  /// Absolute paths to images copied into the app's documents directory.
  /// Paths, never bytes — image blobs in Hive would bloat the box and wreck
  /// the large-journal performance target.
  final List<String> screenshotPaths;

  /// Ids of ticked [ChecklistItem]s, not positional booleans.
  final List<String> completedChecklistItems;

  final List<TimelineEntry> timeline;

  /// Who recommended the trade. Copied from the watchlist item it came from,
  /// so the analytics screen can answer "which source actually makes money".
  final String? source;

  /// The planned target. Never used to compute realised P&L — that always
  /// comes from [exitPrice]. This is the intended exit, which is what the
  /// portfolio scenarios project from.
  final double? takeProfitPrice;

  const Trade({
    required this.id,
    required this.entryDate,
    required this.ticker,
    required this.reason,
    required this.entryPrice,
    required this.stopPrice,
    required this.quantity,
    this.exitPrice,
    this.exitDate,
    this.notes,
    TradeStatus? status,
    this.tags = const [],
    this.isFavorite = false,
    this.screenshotPaths = const [],
    this.completedChecklistItems = const [],
    this.timeline = const [],
    this.source,
    this.takeProfitPrice,
       // Not an initializing formal: the parameter is deliberately named
       // `status` (what callers mean) while the field is `_status` (raw,
       // possibly unset), and the getter of the same name resolves the two.
       // ignore: prefer_initializing_formals
  }) : _status = status,
       assert(
         (exitPrice == null) == (exitDate == null),
         'exitPrice and exitDate must be set together or both left null — '
         'otherwise a trade counts in totalPnl but vanishes from the equity '
         'curve, breaking "last point == currentCapital".',
       );

  /// Note there is deliberately no assert on entryPrice > 0, stopPrice <
  /// entryPrice, or quantity > 0. Those are enforced by form validation on the
  /// way in. Asserting them here would make a legacy or corrupt Hive record
  /// unloadable, and would contradict the calculation layer's guarantee that it
  /// is total — it returns null for nonsensical input rather than throwing.
  bool get isOpen => exitPrice == null;

  /// Falls back to the phase-1 derivation when no status was stored, so a
  /// record written before this field existed — or constructed without one —
  /// behaves exactly as it always did.
  TradeStatus get status =>
      _status ?? (exitPrice == null ? TradeStatus.open : TradeStatus.closed);

  /// True only for positions that actually risked money. Planned and cancelled
  /// ideas are excluded from every performance statistic.
  bool get isExecuted => status.isExecuted;

  Trade copyWith({
    String? id,
    DateTime? entryDate,
    String? ticker,
    String? reason,
    double? entryPrice,
    double? stopPrice,
    int? quantity,
    double? exitPrice,
    DateTime? exitDate,
    String? notes,
    TradeStatus? status,
    List<String>? tags,
    bool? isFavorite,
    List<String>? screenshotPaths,
    List<String>? completedChecklistItems,
    List<TimelineEntry>? timeline,
    String? source,
    double? takeProfitPrice,
    bool clearExit = false,
    bool clearNotes = false,
  }) {
    return Trade(
      id: id ?? this.id,
      entryDate: entryDate ?? this.entryDate,
      ticker: ticker ?? this.ticker,
      reason: reason ?? this.reason,
      entryPrice: entryPrice ?? this.entryPrice,
      stopPrice: stopPrice ?? this.stopPrice,
      quantity: quantity ?? this.quantity,
      exitPrice: clearExit ? null : (exitPrice ?? this.exitPrice),
      exitDate: clearExit ? null : (exitDate ?? this.exitDate),
      notes: clearNotes ? null : (notes ?? this.notes),
      status: status ?? _status,
      tags: tags ?? this.tags,
      isFavorite: isFavorite ?? this.isFavorite,
      screenshotPaths: screenshotPaths ?? this.screenshotPaths,
      completedChecklistItems:
          completedChecklistItems ?? this.completedChecklistItems,
      timeline: timeline ?? this.timeline,
      source: source ?? this.source,
      takeProfitPrice: takeProfitPrice ?? this.takeProfitPrice,
    );
  }
}
