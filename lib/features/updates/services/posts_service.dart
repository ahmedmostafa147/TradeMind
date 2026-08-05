import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';

import '../models/post.dart';

/// Reads what the operator published.
///
/// Read-only by construction. There is no write path here and there must not
/// be: firestore.rules grants writes to members of the `admins` collection
/// only, and that collection is unreachable from every client path.
///
/// THIS USED TO FETCH `signals` TOO, AND IT HAD TO STOP.
/// That collection carried operator-published trade ideas; it is gone from the
/// admin console and denied by firestore.rules, for the reasons recorded there.
/// The fetch could not simply be left in place: it ran inside a [Future.wait]
/// whose `catch` returns an empty list, so one denied read would have taken the
/// announcements down with it and the updates tab would have gone quietly blank
/// with no error anywhere.
class PostsService {
  const PostsService._();

  static bool get _available => Firebase.apps.isNotEmpty;

  static FirebaseFirestore get _db => FirebaseFirestore.instance;

  /// Every announcement, newest first.
  ///
  /// Returns an empty list on ANY failure — offline, unconfigured Firebase, or
  /// a rules denial for a signed-out session. The updates screen renders that
  /// as "nothing published yet", which is the honest reading: the app cannot
  /// distinguish an empty feed from an unreachable one, and an error banner
  /// over a feature the user did not ask for would be noise.
  static Future<List<Post>> fetchAll() async {
    if (!_available) return const [];
    try {
      return sortPosts(await _fetch(PostKind.announcement));
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
