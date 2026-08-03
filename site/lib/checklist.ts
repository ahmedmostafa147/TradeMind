/**
 * A mirror of the app's ChecklistItem enum (lib/trades/checklist.dart).
 *
 * THE IDS ARE THE CONTRACT. Completion is persisted as a list of item *ids*,
 * not as booleans positional to this array — the Dart file says so in its own
 * comment, and the reason is that reordering or inserting an item would
 * otherwise silently reinterpret every existing record. So these six strings
 * must stay byte-identical to the Dart side; the labels are free to be reworded
 * on either surface without consequence.
 *
 * `checklistCompletion` in Dart ignores ids it does not recognise, so a record
 * written here can never report more than 100% on the phone even if this file
 * drifts ahead of the app.
 */
export type ChecklistItem = {
  id: string;
  label: string;
};

export const CHECKLIST: ChecklistItem[] = [
  { id: 'trend', label: 'الاتجاه مؤكد' },
  { id: 'levels', label: 'الدعم/المقاومة مؤكدة' },
  { id: 'volume', label: 'الحجم مؤكد' },
  { id: 'risk', label: 'المخاطرة مقبولة' },
  { id: 'size', label: 'حجم المركز محسوب' },
  { id: 'news', label: 'الأخبار متابَعة' },
];

/** Fraction completed, 0–1. Unknown ids are ignored, exactly as Dart does. */
export function checklistCompletion(completedIds: string[]): number {
  if (CHECKLIST.length === 0) return 0;
  const known = new Set(CHECKLIST.map((item) => item.id));
  const valid = new Set(completedIds.filter((id) => known.has(id)));
  return valid.size / CHECKLIST.length;
}

export const isChecklistComplete = (completedIds: string[]): boolean =>
  checklistCompletion(completedIds) >= 1.0;
