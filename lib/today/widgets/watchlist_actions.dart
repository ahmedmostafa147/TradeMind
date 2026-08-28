import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../settings/cubit/settings_cubit.dart';
import '../../watchlist/cubit/watchlist_cubit.dart';

import '../../watchlist/watchlist_item.dart';

Future<void> deleteWatchlistItem(
  BuildContext context,
  WatchlistItem item,
) async {
  // Read before the dialog: `context` is not safe to use across an await.
  final watchlist = context.read<WatchlistCubit>();
  final confirmed =
      !context.read<SettingsCubit>().requireSettings.enableConfirmations ||
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
    await watchlist.delete(item.id);
  }
}
