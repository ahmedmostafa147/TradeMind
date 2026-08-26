import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../today/widgets/watchlist_card.dart';
import '../watchlist_form_screen.dart';
import '../watchlist_providers.dart';

/// «قائمة المراقبة» — the stocks being waited on, before any money moves.
///
/// ── ADDING ONE WAS UNREACHABLE FROM THE PHONE ──────────────────────────────
///
/// `WatchlistFormScreen` has always had an add mode — it titles itself
/// «إضافة للمتابعة» when handed no `existing` — and nothing in the app ever
/// constructed it that way. The only route into the form was the «تعديل» button
/// on a card in «قرار اليوم», which requires an item to already exist. So a user
/// could add a watch on the website, watch it sync down, and edit it on the
/// phone; they could not create one there. On a fresh account the feature was
/// invisible on the phone entirely.
///
/// The site has carried a «قائمة المراقبة» tab with a «+ ضيف سهم» button all
/// along. This is that tab, in the same slot in the same strip.
class WatchlistView extends ConsumerWidget {
  const WatchlistView({super.key});

  static const String addLabel = 'ضيف سهم للمراقبة';

  void _add(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const WatchlistFormScreen()),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final items = ref.watch(sortedWatchlistProvider);

    if (items.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('قائمة المراقبة فاضية', style: theme.textTheme.titleMedium),
              const SizedBox(height: 8),
              Text(
                'حط فيها الأسهم اللي بتستنى سعر معيّن عشان تدخلها، بسعر شراء '
                'مستهدف واستوب. أول ما تقرر تنفّذ، حوّلها لصفقة بضغطة.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: () => _add(context),
                icon: const Icon(Icons.add_rounded),
                label: const Text(addLabel),
              ),
            ],
          ),
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
      children: [
        Align(
          alignment: AlignmentDirectional.centerStart,
          child: FilledButton.icon(
            onPressed: () => _add(context),
            icon: const Icon(Icons.add_rounded),
            label: const Text(addLabel),
          ),
        ),
        const SizedBox(height: 16),
        // The same card «قرار اليوم» draws, so an item looks like itself
        // wherever it is met.
        for (final item in items) WatchlistCard(item: item),
      ],
    );
  }
}
