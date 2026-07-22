/// Pre-trade discipline checklist shown before saving a planned or open trade.
///
/// Completion is persisted as a list of item *ids*, not a list of booleans
/// positional to this enum. That way reordering or inserting an item later
/// cannot silently reinterpret existing records.
enum ChecklistItem {
  trend('trend', 'الاتجاه مؤكد'),
  levels('levels', 'الدعم/المقاومة مؤكدة'),
  volume('volume', 'الحجم مؤكد'),
  risk('risk', 'المخاطرة مقبولة'),
  size('size', 'حجم المركز محسوب'),
  news('news', 'الأخبار متابَعة');

  final String id;
  final String label;

  const ChecklistItem(this.id, this.label);

  static ChecklistItem? fromId(String id) {
    for (final item in ChecklistItem.values) {
      if (item.id == id) return item;
    }
    return null;
  }
}

/// Fraction of the checklist completed, 0.0–1.0.
///
/// Unknown ids — an item removed in a later build — are ignored rather than
/// counted, so a stale record can never report more than 100%.
double checklistCompletion(List<String> completedIds) {
  final total = ChecklistItem.values.length;
  if (total == 0) return 0;

  final valid = <String>{};
  for (final id in completedIds) {
    if (ChecklistItem.fromId(id) != null) valid.add(id);
  }
  return valid.length / total;
}

bool isChecklistComplete(List<String> completedIds) =>
    checklistCompletion(completedIds) >= 1.0;
