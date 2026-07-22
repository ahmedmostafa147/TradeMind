import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_ce/hive.dart';
import 'package:uuid/uuid.dart';

import '../trades/trade.dart';
import '../trades/trade_status.dart';
import '../trades/trades_providers.dart';
import 'watchlist_item.dart';

final watchlistBoxProvider = Provider<Box<WatchlistItem>>(
  (ref) => throw UnimplementedError('watchlistBoxProvider must be overridden'),
);

final watchlistProvider =
    NotifierProvider<WatchlistNotifier, List<WatchlistItem>>(
      WatchlistNotifier.new,
    );

class WatchlistNotifier extends Notifier<List<WatchlistItem>> {
  Box<WatchlistItem> get _box => ref.read(watchlistBoxProvider);

  @override
  List<WatchlistItem> build() =>
      ref.watch(watchlistBoxProvider).values.toList();

  Future<void> add(WatchlistItem item) async {
    await _box.put(item.id, item);
    state = [...state, item];
  }

  Future<void> update(WatchlistItem item) async {
    await _box.put(item.id, item);
    state = [
      for (final existing in state) existing.id == item.id ? item : existing,
    ];
  }

  Future<void> remove(String id) async {
    await _box.delete(id);
    state = state.where((item) => item.id != id).toList();
  }

  /// Turns a watched idea into a real planned trade and drops it from the
  /// watchlist.
  ///
  /// Quantity is 0 because nothing has been bought yet — a planned trade needs
  /// no share count, and the position sizing happens when it is marked open.
  Future<Trade> convertToPlannedTrade(WatchlistItem item) async {
    final trade = Trade(
      id: const Uuid().v4(),
      entryDate: _today(),
      ticker: item.ticker,
      reason: item.reason,
      entryPrice: item.targetBuyPrice,
      stopPrice: item.stopPrice,
      quantity: 0,
      status: TradeStatus.planned,
      // Carried over so the analytics screen can attribute the eventual
      // result back to whoever recommended it.
      source: item.source,
    );
    await ref.read(tradesProvider.notifier).add(trade);
    await remove(item.id);
    return trade;
  }

  static DateTime _today() {
    final now = DateTime.now();
    return DateTime(now.year, now.month, now.day);
  }
}

/// Highest priority first, then newest. The id tie-break keeps the order
/// stable across rebuilds, since List.sort is not stable and same-day
/// additions collide constantly.
final sortedWatchlistProvider = Provider<List<WatchlistItem>>((ref) {
  final items = [...ref.watch(watchlistProvider)];
  items.sort((a, b) {
    final byPriority = a.priority.rank.compareTo(b.priority.rank);
    if (byPriority != 0) return byPriority;
    final byDate = b.dateAdded.compareTo(a.dateAdded);
    return byDate != 0 ? byDate : a.id.compareTo(b.id);
  });
  return items;
});
