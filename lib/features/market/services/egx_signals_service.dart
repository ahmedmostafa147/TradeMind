import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';

import '../models/egx_signals.dart';

/// Reads the published quantitative screen.
///
/// READ-ONLY BY CONSTRUCTION, and there is no write path here on purpose: the
/// documents are produced by the analysis notebook, which writes with a service
/// account. firestore.rules denies writes to every client, this one included.
///
/// Reads are open — no sign-in — because the market tab is the first thing a
/// new user opens, and a rules denial surfaces as an empty screen rather than
/// an error in both readers.
class EgxSignalsService {
  const EgxSignalsService._();

  static const String collection = 'egxSignals';

  static bool get _available => Firebase.apps.isNotEmpty;

  /// The newest published session.
  ///
  /// Ordered by document id — the id IS the date, which sorts chronologically
  /// as a string and needs no composite index. Ordering by the `date` field
  /// would demand one for the same result, exactly as MarketFlowsService notes.
  ///
  /// Costs ONE document read: every table for the session lives in that single
  /// document, which is why the notebook writes arrays rather than a document
  /// per stock.
  ///
  /// Returns null on ANY failure — offline, Firebase unconfigured, a rules
  /// denial, or a document too malformed to decode. The screen renders that as
  /// "not published yet", which is the honest reading: the app cannot tell an
  /// empty feed from an unreachable one.
  static Future<EgxSignals?> fetchLatest() async {
    if (!_available) return null;
    try {
      final snapshot = await FirebaseFirestore.instance
          .collection(collection)
          .orderBy(FieldPath.documentId, descending: true)
          .limit(1)
          .get();
      if (snapshot.docs.isEmpty) return null;
      return EgxSignals.fromMap(snapshot.docs.first.data());
    } catch (_) {
      return null;
    }
  }

  /// One specific session, for the history view. [date] is `YYYY-MM-DD`.
  static Future<EgxSignals?> fetchSession(String date) async {
    if (!_available || date.isEmpty) return null;
    try {
      final doc = await FirebaseFirestore.instance
          .collection(collection)
          .doc(date)
          .get();
      final data = doc.data();
      return data == null ? null : EgxSignals.fromMap(data);
    } catch (_) {
      return null;
    }
  }

  /// Recent session dates, newest first — enough to populate a picker without
  /// downloading every payload.
  ///
  /// Firestore has no projection API, so a plain query would pull each full
  /// document just to read its id. `FieldPath.documentId` in the where-clause
  /// with an empty field mask is not available either; the pragmatic fix is to
  /// keep [limit] small, since the caller only ever shows a short list.
  static Future<List<String>> fetchRecentDates({int limit = 14}) async {
    if (!_available) return const [];
    try {
      final snapshot = await FirebaseFirestore.instance
          .collection(collection)
          .orderBy(FieldPath.documentId, descending: true)
          .limit(limit)
          .get();
      return [for (final doc in snapshot.docs) doc.id];
    } catch (_) {
      return const [];
    }
  }
}
