import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';

import '../models/post.dart';

/// Reads what the operator published.
///
/// WHY THIS EXISTS
/// The admin console has written to `announcements` and `signals` since it was
/// built, and nothing anywhere read them — not the app, not the site. Every
/// post went into a collection no surface consulted, so publishing one had no
/// effect a user could observe.
///
/// Read-only by construction. There is no write path here and there must not
/// be: firestore.rules grants writes to members of the `admins` collection
/// only, and that collection is unreachable from every client path.
class PostsService {
  const PostsService._();

  static bool get _available => Firebase.apps.isNotEmpty;

  static FirebaseFirestore get _db => FirebaseFirestore.instance;

  /// Every announcement and signal, newest first.
  ///
  /// Returns an empty list on ANY failure — offline, unconfigured Firebase, or
  /// a rules denial for a signed-out session. The updates screen renders that
  /// as "nothing published yet", which is the honest reading: the app cannot
  /// distinguish an empty feed from an unreachable one, and an error banner
  /// over a feature the user did not ask for would be noise.
  ///
  /// Both collections are fetched together rather than in sequence, so one slow
  /// response does not serialise onto the other.
  static Future<List<Post>> fetchAll() async {
    if (!_available) return const [];
    try {
      final results = await Future.wait([
        _fetch(PostKind.announcement),
        _fetch(PostKind.signal),
      ]);
      return sortPosts([for (final list in results) ...list]);
    } catch (_) {
      return const [];
    }
  }

  static Future<List<Post>> _fetch(PostKind kind) async {
    // No orderBy: the field is missing on a post whose server timestamp has not
    // resolved, and Firestore drops documents that lack the ordered field
    // entirely — a just-published post would vanish from the feed for a few
    // seconds. Sorting happens in Dart, where a null is a value that can be
    // placed rather than a document that disappears.
    final snapshot = await _db.collection(kind.collection).get();
    return [
      for (final doc in snapshot.docs)
        Post.fromMap(
          doc.id,
          kind,
          doc.data(),
          readTimestamp: _readTimestamp,
        ),
    ];
  }

  /// Firestore hands back a [Timestamp]; the model itself only knows how to
  /// parse an ISO string, so the cloud_firestore type is unwrapped here rather
  /// than making the model depend on the SDK.
  static DateTime? _readTimestamp(Object? value) {
    if (value is Timestamp) return value.toDate();
    if (value is String) return DateTime.tryParse(value);
    return null;
  }
}
