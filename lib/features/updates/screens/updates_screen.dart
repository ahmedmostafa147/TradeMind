import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/formatters.dart';
import '../models/post.dart';
import '../providers/posts_providers.dart';

/// «المستجدات» — what the operator published.
///
/// Announcements and trade ideas arrive in one stream, marked rather than split
/// into two tabs: they are published in one order and should be read in it, and
/// a second tab would hide today's idea behind a click for no gain.
/// Marking-as-seen is the SHELL's job, not this screen's — see
/// `HomeShell._select`.
///
/// It used to happen here, in initState. That looked right and was not: the
/// shell holds its four screens in an IndexedStack, which builds every child
/// the moment the app opens. So this screen mounted at launch whatever tab the
/// user was on, and marked the feed read before anybody had looked at it — the
/// badge could never appear for a post that arrived while the app was closed,
/// which is the only kind of post a badge is for.
///
/// It also hung every widget test that pumps the app. The mark writes to Hive,
/// and an un-awaited disk write left pending under the test binding's clock
/// means `pumpAndSettle` never settles; three tests sat there until the
/// ten-minute timeout killed them.
class UpdatesScreen extends ConsumerStatefulWidget {
  const UpdatesScreen({super.key});

  @override
  ConsumerState<UpdatesScreen> createState() => _UpdatesScreenState();
}

class _UpdatesScreenState extends ConsumerState<UpdatesScreen> {
  @override
  Widget build(BuildContext context) {
    final async = ref.watch(postsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('المستجدات')),
      body: RefreshIndicator(
        onRefresh: () async => ref.refresh(postsProvider.future),
        child: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          // The service already swallows its failures and returns an empty
          // list, so this branch is nearly unreachable — but a silent blank
          // screen would be worse than a sentence if it ever is reached.
          error: (_, _) => const _Empty(
            message: 'تعذّر تحميل المستجدات. اسحب لتحت عشان تجرّب تاني.',
          ),
          data: (posts) => posts.isEmpty
              ? const _Empty(
                  message:
                      'مفيش مستجدات لسه. أول ما يتنشر إعلان أو فكرة صفقة هتلاقيها هنا.',
                )
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                  itemCount: posts.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 12),
                  itemBuilder: (context, index) => _PostCard(post: posts[index]),
                ),
        ),
      ),
    );
  }
}

class _PostCard extends StatelessWidget {
  final Post post;

  const _PostCard({required this.post});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                _KindBadge(kind: post.kind),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    post.title,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(post.body, style: theme.textTheme.bodyMedium),
            if (post.createdAt != null) ...[
              const SizedBox(height: 10),
              NumericText(
                dateLabel(post.createdAt),
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
            // Not decoration. RELEASE.md requires the product to state outright
            // that it gives no investment advice so Play does not classify it
            // under the restricted financial categories — and this is the one
            // screen where the operator hands the user a specific ticker.
            // Saying it next to the thing it applies to is the whole point.
            if (post.kind == PostKind.signal) ...[
              const SizedBox(height: 14),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'دي مش نصيحة استثمارية. رادار مبيقدّمش توصيات ومبينفّذش أي '
                  'عملية — احسب مخاطرتك بنفسك قبل ما تدخل، والقرار مسؤوليتك وحدك.',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _KindBadge extends StatelessWidget {
  final PostKind kind;

  const _KindBadge({required this.kind});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    // Neutral, never the money colours: a trade idea is not a profit, and
    // colouring it green would borrow the one signal the P&L figures own.
    final isSignal = kind == PostKind.signal;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: isSignal
            ? theme.colorScheme.surfaceContainerHighest
            : theme.colorScheme.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      child: Text(
        kind.label,
        style: theme.textTheme.labelSmall?.copyWith(
          fontWeight: FontWeight.w700,
          color: isSignal
              ? theme.colorScheme.onSurface
              : theme.colorScheme.onSurfaceVariant,
        ),
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  final String message;

  const _Empty({required this.message});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    // A ListView, not a Center: RefreshIndicator needs a scrollable child or
    // pull-to-refresh does nothing on the one screen where retrying matters.
    return ListView(
      padding: const EdgeInsets.all(32),
      children: [
        const SizedBox(height: 80),
        Icon(
          Icons.campaign_outlined,
          size: 48,
          color: theme.colorScheme.onSurfaceVariant,
        ),
        const SizedBox(height: 16),
        Text(
          message,
          textAlign: TextAlign.center,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}
