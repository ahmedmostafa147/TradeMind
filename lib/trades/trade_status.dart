/// Lifecycle of a trade idea.
///
/// Phase 1 had no status — a trade was open or closed, derived from
/// `exitPrice`. That derivation is still the migration rule for records written
/// before this field existed, so old data keeps behaving exactly as it did.
enum TradeStatus {
  /// An idea, not executed. No quantity required, no exit.
  planned,

  /// Bought.
  open,

  /// Exited.
  closed,

  /// Idea abandoned without ever being executed.
  cancelled;

  String get label => switch (this) {
    TradeStatus.planned => 'مخططة',
    TradeStatus.open => 'مفتوحة',
    TradeStatus.closed => 'مغلقة',
    TradeStatus.cancelled => 'ملغاة',
  };

  /// Only executed positions belong in performance statistics. A planned or
  /// cancelled idea never risked money, so counting it would distort the win
  /// rate, the equity curve and every average.
  bool get isExecuted => this == TradeStatus.open || this == TradeStatus.closed;

  /// Parses the persisted form, falling back to [fallback] for values written
  /// by a future build or corrupted on disk.
  static TradeStatus fromName(String? name, {required TradeStatus fallback}) {
    for (final status in TradeStatus.values) {
      if (status.name == name) return status;
    }
    return fallback;
  }
}
