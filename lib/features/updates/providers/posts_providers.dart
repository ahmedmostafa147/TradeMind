import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_ce/hive.dart';

import '../../../settings/settings_providers.dart';
import '../models/post.dart';
import '../services/posts_service.dart';

/// The key holding the last time the updates screen was opened.
///
/// Lives in the settings box rather than in a new one: it is a UI preference,
/// not journal data, and opening another box on startup for a single timestamp
/// would cost a file handle for nothing.
const String kLastSeenPostsKey = 'last_seen_posts_at';

/// Everything the operator has published.
///
/// A FutureProvider so the screen gets loading and error states for free, and
/// so `ref.invalidate` is the whole implementation of pull-to-refresh.
final postsProvider = FutureProvider<List<Post>>((ref) async {
  return PostsService.fetchAll();
});

/// When the user last opened the updates screen, or null if never.
final lastSeenPostsProvider =
    NotifierProvider<LastSeenPosts, DateTime?>(LastSeenPosts.new);

class LastSeenPosts extends Notifier<DateTime?> {
  Box get _box => ref.read(settingsBoxProvider);

  @override
  DateTime? build() {
    final raw = ref.watch(settingsBoxProvider).get(kLastSeenPostsKey);
    return raw is String ? DateTime.tryParse(raw) : null;
  }

  /// Marks everything currently published as seen.
  ///
  /// State first, disk second — the badge should clear the instant the screen
  /// opens rather than after a file write, and holding the UI on I/O is what
  /// makes this untestable in a widget test, where the fake-async clock means a
  /// real disk write never completes at all.
  Future<void> markSeen() async {
    final now = DateTime.now();
    state = now;
    await _box.put(kLastSeenPostsKey, now.toIso8601String());
  }
}

/// How many posts arrived since the last visit.
///
/// Zero while the fetch is in flight or has failed: a badge is a promise that
/// there is something to read, and showing one over an empty screen teaches the
/// user to ignore it.
final unseenPostsProvider = Provider<int>((ref) {
  final posts = ref.watch(postsProvider).value;
  if (posts == null || posts.isEmpty) return 0;
  return unseenCount(posts, ref.watch(lastSeenPostsProvider));
});
