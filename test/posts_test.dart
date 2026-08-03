import 'package:egx_trade_journal/features/updates/models/post.dart';
import 'package:flutter_test/flutter_test.dart';

Post p(String id, {DateTime? at, PostKind kind = PostKind.announcement}) => Post(
  id: id,
  kind: kind,
  title: id,
  body: '',
  createdAt: at,
);

void main() {
  group('sortPosts', () {
    test('newest first', () {
      final sorted = sortPosts([
        p('old', at: DateTime(2026, 1, 1)),
        p('new', at: DateTime(2026, 6, 1)),
        p('mid', at: DateTime(2026, 3, 1)),
      ]);

      expect(sorted.map((x) => x.id), ['new', 'mid', 'old']);
    });

    test('an undated post sorts LAST, never first', () {
      // A post written a moment ago has a null createdAt until Firestore
      // resolves serverTimestamp() on the server. Sorting nulls to the front
      // would let a half-written post displace the real newest one for the few
      // seconds before it round-trips.
      final sorted = sortPosts([
        p('pending'),
        p('real', at: DateTime(2026, 6, 1)),
      ]);

      expect(sorted.first.id, 'real');
      expect(sorted.last.id, 'pending');
    });

    test('ties break on id, so the order cannot reshuffle between rebuilds', () {
      final same = DateTime(2026, 6, 1);
      final first = sortPosts([p('b', at: same), p('a', at: same)]);
      final second = sortPosts([p('a', at: same), p('b', at: same)]);

      expect(first.map((x) => x.id), ['a', 'b']);
      expect(second.map((x) => x.id), ['a', 'b']);
    });

    test('announcements and signals share one ordering', () {
      final sorted = sortPosts([
        p('ann', at: DateTime(2026, 1, 1)),
        p('sig', at: DateTime(2026, 6, 1), kind: PostKind.signal),
      ]);

      expect(sorted.first.id, 'sig');
    });
  });

  group('unseenCount', () {
    test('counts only what is newer than the last visit', () {
      final posts = [
        p('a', at: DateTime(2026, 6, 10)),
        p('b', at: DateTime(2026, 6, 5)),
        p('c', at: DateTime(2026, 6, 1)),
      ];

      expect(unseenCount(posts, DateTime(2026, 6, 4)), 2);
    });

    test('a never-opened screen counts everything dated', () {
      final posts = [p('a', at: DateTime(2026, 6, 1)), p('b')];

      // The undated one is excluded even here — see below.
      expect(unseenCount(posts, null), 1);
    });

    test('an undated post never counts as unseen', () {
      // Otherwise it would raise a badge that no amount of opening the screen
      // could clear: markSeen() stores `now`, and a null date is never after
      // anything, so the post would stay "new" forever.
      expect(unseenCount([p('pending')], DateTime(2026, 1, 1)), 0);
    });

    test('a post exactly at the last-seen instant is not unseen', () {
      final at = DateTime(2026, 6, 1);
      expect(unseenCount([p('a', at: at)], at), 0);
    });

    test('nothing published means no badge', () {
      expect(unseenCount(const [], null), 0);
    });
  });

  group('Post.fromMap', () {
    test('missing fields decode to empty strings, never null', () {
      final post = Post.fromMap('id', PostKind.announcement, {});

      expect(post.title, '');
      expect(post.body, '');
      expect(post.createdAt, isNull);
    });

    test('an ISO string date is parsed', () {
      final post = Post.fromMap('id', PostKind.signal, {
        'createdAt': '2026-06-01T00:00:00.000',
      });

      expect(post.createdAt, DateTime(2026, 6, 1));
    });

    test('a readTimestamp hook takes precedence over the string parser', () {
      // This is how the Firestore Timestamp is unwrapped without the model
      // depending on cloud_firestore.
      final post = Post.fromMap(
        'id',
        PostKind.announcement,
        {'createdAt': 'ignored'},
        readTimestamp: (_) => DateTime(2026, 2, 2),
      );

      expect(post.createdAt, DateTime(2026, 2, 2));
    });
  });

  test('collection names match what the admin console writes to', () {
    // These strings are the contract with site/components/dashboard/
    // admin-dashboard.tsx and with firestore.rules. A typo here is a feed that
    // silently stays empty forever.
    expect(PostKind.announcement.collection, 'announcements');
    expect(PostKind.signal.collection, 'signals');
  });
}
