/// Pre-fill values handed from the calculator to the add-trade form.
///
/// Passed as a route argument rather than held in a provider on purpose: a
/// global draft outlives the moment it was meant for, so a user who taps
/// "استخدم دي كصفقة جديدة" then backs out would later open the FAB and find a
/// mystery prefill. A route argument has exactly the route's lifetime and needs
/// no clearing logic.
class TradeDraft {
  final double? entryPrice;
  final double? stopPrice;
  final int? quantity;

  /// The planned target, when the draft came from the smart builder.
  final double? takeProfitPrice;

  final String? reason;

  const TradeDraft({
    this.entryPrice,
    this.stopPrice,
    this.quantity,
    this.takeProfitPrice,
    this.reason,
  });
}
