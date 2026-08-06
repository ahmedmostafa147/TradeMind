import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';

import '../models/market_flows.dart';

/// Reads the stored EGX sessions.
///
/// READ-ONLY BY CONSTRUCTION, and there is no write path here on purpose:
/// egx.com.eg sits behind F5 Shape bot defence, so nothing scrapes it
/// automatically. The admin enters a session by hand in the web console and it
/// lands in `marketFlows/{YYYY-MM-DD}`; every other client, this one included,
/// only reads. firestore.rules enforces that.
class MarketFlowsService {
  const MarketFlowsService._();

  static bool get _available => Firebase.apps.isNotEmpty;

  /// The most recent sessions, newest first.
  ///
  /// Ordered by document id — the id IS the date, which sorts chronologically
  /// as a string and needs no composite index. Ordering by the `date` field
  /// would demand one for the same result.
  ///
  /// Returns an empty list on ANY failure: offline, unconfigured Firebase, or a
  /// rules denial for a signed-out session. The screen renders that as "no data
  /// yet", which is the honest reading — the app cannot tell an empty feed from
  /// an unreachable one.
  static Future<List<MarketFlows>> fetchRecent({int limit = 30}) async {
    if (!_available) return const [];
    try {
      final snapshot = await FirebaseFirestore.instance
          .collection('marketFlows')
          .orderBy(FieldPath.documentId, descending: true)
          .limit(limit)
          .get();

      // Per-record decoding: one malformed session must not empty the screen,
      // the same rule the journal's own restore path follows.
      return sortSessions([
        for (final doc in snapshot.docs) ?MarketFlows.fromMap(doc.data()),
      ]);
    } catch (_) {
      return const [];
    }
  }
}
