/// One dated note on a trade's timeline ("اشتريت النهاردة", "حركت الاستوب").
///
/// The single `notes` field from Phase 1 is kept as-is rather than folded in
/// here — removing it would be a schema change, and existing records would lose
/// data. The detail page renders both.
class TimelineEntry {
  final DateTime date;
  final String text;

  const TimelineEntry({required this.date, required this.text});
}
