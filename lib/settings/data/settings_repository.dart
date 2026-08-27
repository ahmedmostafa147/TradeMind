// `hide Settings`: cloud_firestore exports its own Settings (the SDK's host
// and persistence options), which collides with the app's risk rule of the
// same name. Hiding the SDK's is right rather than prefixing ours — this file
// is about the app's settings, and the SDK's are configured in main().
import 'package:cloud_firestore/cloud_firestore.dart' hide Settings;
import 'package:flutter/foundation.dart';

import '../../features/sync/services/sync_codec.dart';
import '../settings.dart';

/// The account's risk rule, in Firestore.
///
/// ── WHY THIS IS ONE DOCUMENT AND NOT SEVEN FIELDS ON THE PROFILE ───────────
///
/// `users/{uid}` is the one document an admin is allowed to read. Capital is a
/// trader's portfolio size — the single most sensitive number they have — so
/// putting it there would hand the operator every user's net position as a side
/// effect of a sync feature, and make a sentence in the published privacy
/// policy false. Down here the rule is the one trades get: owner, nobody else.
///
/// ── WHAT LIVES HERE AND WHAT DOES NOT ──────────────────────────────────────
///
/// Five of the seven fields on [Settings]. `enableChecklist` and
/// `enableConfirmations` stay on the device, and that is a decision the sync
/// codec already recorded: they are habits — whether to be shown a checklist,
/// whether to be asked before a delete — and syncing a habit pushes one
/// device's preference onto another.
///
/// The two default percentages DID move, and that is the change. They were
/// device-only, so the website hard-coded 5% and 2% for want of anything to
/// read, and the same trade got two different verdicts on the two surfaces for
/// anyone who changed a default. CLAUDE.md §5 carried that as a known defect
/// with "the permanent fix is to add the two fields to this document" written
/// next to it. This is that fix; firestore.rules was widened to match.
class SettingsRepository {
  final FirebaseFirestore _db;

  const SettingsRepository(this._db);

  /// The document id is `risk`, matching what the old sync service wrote, so
  /// an account configured before this change is read, not orphaned.
  static const String _document = 'risk';

  DocumentReference<Map<String, dynamic>> _doc(String userId) => _db
      .collection('users')
      .doc(userId)
      .collection('settings')
      .doc(_document);

  /// The live risk rule, folded onto [defaults].
  ///
  /// Anything missing or out of range keeps the value it already had rather
  /// than snapping to the class defaults — a half-written document must not
  /// silently reset a capital the user actually configured.
  Stream<Settings> watch(String userId, {Settings defaults = const Settings()}) =>
      _doc(userId).snapshots().map((snap) => _decode(snap, defaults));

  Future<Settings> fetch(
    String userId, {
    Settings defaults = const Settings(),
  }) async => _decode(await _doc(userId).get(), defaults);

  Settings _decode(
    DocumentSnapshot<Map<String, dynamic>> snapshot,
    Settings defaults,
  ) {
    final data = snapshot.data();
    if (data == null) return defaults;
    try {
      return SyncCodec.riskSettingsFromMap(data, onto: defaults);
    } catch (error) {
      // Reported, not swallowed — §13. Falling back silently would leave the
      // user trading against numbers they did not choose, with nothing
      // anywhere saying the document could not be read.
      debugPrint('Could not read the risk settings, keeping current: $error');
      return defaults;
    }
  }

  /// Writes the whole rule.
  ///
  /// `merge: true` because this document is not exclusively ours: the fields
  /// the codec does not know about belong to whoever wrote them, and a full
  /// replace would delete a field added by a newer build of the website.
  Future<void> save(String userId, Settings settings) =>
      _doc(userId).set(SyncCodec.riskSettingsToMap(settings), SetOptions(merge: true));
}
