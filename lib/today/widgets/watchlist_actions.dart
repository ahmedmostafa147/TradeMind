import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../settings/settings_providers.dart';
import '../../watchlist/watchlist_item.dart';
import '../../watchlist/watchlist_providers.dart';

Future<void> deleteWatchlistItem(
  BuildContext context,
  WidgetRef ref,
  WatchlistItem item,
) async {
  final confirmed = !ref.read(settingsProvider).enableConfirmations ||
      await showDialog<bool>(
            context: context,
            builder: (ctx) => AlertDialog(
              title: const Text('حذف من المتابعة'),
              content: Text('متأكد إنك عايز تحذف ${item.ticker}؟'),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(false),
                  child: const Text('رجوع'),
                ),
                FilledButton(
                  onPressed: () => Navigator.of(ctx).pop(true),
                  child: const Text('حذف'),
                ),
              ],
            ),
          ) ==
          true;
  if (confirmed) {
    await ref.read(watchlistProvider.notifier).remove(item.id);
  }
}
