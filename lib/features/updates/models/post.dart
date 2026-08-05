import 'package:flutter/foundation.dart';

/// Which collection a post came from.
///
/// `signal` IS NO LONGER REACHABLE and is kept only so this file and the
/// updates screen still compile. The `signals` collection was removed from the
/// admin console and is denied by firestore.rules — see the note there —
/// so [PostsService] never constructs one, and the badge and disclaimer
/// branches in updates_screen.dart are dead code.
///
/// The app half of this cleanup was deliberately left minimal: only the fetch
/// changed, because a denied read inside its `Future.wait` would have blanked
/// the announcements feed too. Deleting the enum value and its two UI branches
/// is the tidy-up still owed.
enum PostKind {
  announcement,
  signal;

  String get collection => switch (this) {
    PostKind.announcement => 'announcements',
    PostKind.signal => 'signals',
  };

  String get label => switch (this) {
    PostKind.announcement => 'إعلان',
    PostKind.signal => 'فكرة صفقة',
  };
}

/// Something the operator published for every signed-in user to read.
///
/// Written from the web admin console. The app only ever reads these — there is
/// no client write path, and firestore.rules refuses one for anybody who is not
/// in the `admins` collection.
@immutable
class Post {
  final String id;
  final PostKind kind;
  final String title;
  final String body;

  /// Null for a post whose server timestamp has not resolved yet. Callers must
  /// render that as "no date" rather than as the epoch.
  final DateTime? createdAt;

  const Post({
    required this.id,
    required this.kind,
    required this.title,
    required this.body,
    required this.createdAt,
  });

  /// Rebuilds from a Firestore document.
  ///
  /// `createdAt` arrives as a Firestore Timestamp here, NOT as the ISO string
  /// the trade codec uses — the admin console writes it with
  /// `serverTimestamp()`. Both are accepted anyway: a post written by some
  /// future surface that stores a string must not silently lose its date.
  factory Post.fromMap(
    String id,
    PostKind kind,
    Map<String, dynamic> map, {
    DateTime? Function(Object?)? readTimestamp,
  }) {
    return Post(
      id: id,
      kind: kind,
      title: map['title'] as String? ?? '',
      body: map['body'] as String? ?? '',
      createdAt: readTimestamp?.call(map['createdAt']) ?? _toDate(map['createdAt']),
    );
  }

  static DateTime? _toDate(Object? value) =>
      value is String ? DateTime.tryParse(value) : null;
}

/// Newest first, with undated posts LAST.
///
/// A post written a moment ago briefly has a null `createdAt` — Firestore
/// resolves `serverTimestamp()` on the server, so a local snapshot sees null
/// until it round-trips. Sorting those to the end rather than the front stops a
/// half-written post from displacing the real newest one.
List<Post> sortPosts(List<Post> posts) {
  final sorted = [...posts];
  sorted.sort((a, b) {
    final x = a.createdAt;
    final y = b.createdAt;
    if (x == null && y == null) return a.id.compareTo(b.id);
    if (x == null) return 1;
    if (y == null) return -1;
    final byDate = y.compareTo(x);
    return byDate != 0 ? byDate : a.id.compareTo(b.id);
  });
  return List.unmodifiable(sorted);
}

/// How many posts are newer than [since]. Undated posts never count as unseen —
/// they would otherwise flash a badge that never clears.
int unseenCount(List<Post> posts, DateTime? since) {
  if (since == null) return posts.where((p) => p.createdAt != null).length;
  return posts
      .where((p) => p.createdAt != null && p.createdAt!.isAfter(since))
      .length;
}
