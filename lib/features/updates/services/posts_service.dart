import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';

import '../models/post.dart';

/// Reads what the operator published.
///
/// Read-only by construction. There is no write path here and there must not
/// be: firestore.rules grants writes to members of the `admins` collection
/// only, and that collection is unreachable from every client path.
///
/// THIS FEATURE IS DEAD AND THIS CLASS NOW ALWAYS RETURNS AN EMPTY LIST.
///
/// It read two collections. `signals` carried operator-published trade ideas
/// and contradicted the product's own no-advice disclaimer; `announcements` was
/// a broadcast feed the owner then dropped as well. Both are denied by
/// firestore.rules — see the note there — so the read below is refused and the
/// `catch` turns that into an empty feed. No crash, no error banner: the
/// updates tab simply shows its "nothing published yet" state forever.
///
/// That is deliberate for now, not an oversight. The site half of this removal
/// is done; deleting the app's updates tab, its screen, its providers and the
/// shell wiring is the cleanup still owed, and was left out because the owner
/// asked for the website to be the whole focus.
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
