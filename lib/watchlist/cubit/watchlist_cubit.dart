import 'dart:async';

import 'package:uuid/uuid.dart';

import '../../core/state/account_scoped_cubit.dart';
import '../../trades/cubit/trades_cubit.dart';
import '../../trades/trade.dart';
import '../../trades/trade_status.dart';
import '../data/watchlist_repository.dart';
import '../watchlist_item.dart';

/// The four states the watchlist can be in, for the same reason the journal has
/// them: a stream has a first frame with nothing in it, and a refused read is
/// not an empty list.
sealed class WatchlistState {
  const WatchlistState();
}

class WatchlistLoading extends WatchlistState {
  const WatchlistLoading();
}

class WatchlistLoaded extends WatchlistState {
  /// Highest priority first, ordered by the repository.
  final List<WatchlistItem> items;

  const WatchlistLoaded(this.items);
}

class WatchlistFailure extends WatchlistState {
  final Object error;

  const WatchlistFailure(this.error);
}

class WatchlistSignedOut extends WatchlistState {
  const WatchlistSignedOut();
}

class WatchlistCubit extends AccountScopedCubit<WatchlistState> {
  final WatchlistRepository _repository;

  /// Needed only by [convertToPlannedTrade], which has to write into the
  /// journal as well as this list.
  final TradesCubit _trades;

  WatchlistCubit(this._repository, this._trades)
    : super(const WatchlistLoading());

  @override
  WatchlistState get loadingState => const WatchlistLoading();

  @override
  WatchlistState get signedOutState => const WatchlistSignedOut();

  @override
  StreamSubscription<void> subscribe(String userId) =>
      _repository.watch(userId).listen(
        (items) => emit(WatchlistLoaded(items)),
        onError: (Object error) => emit(WatchlistFailure(error)),
      );

  Future<void> save(WatchlistItem item) async {
    final id = userId;
    if (id == null) return;
    await _repository.save(id, item);
  }

  Future<void> delete(String itemId) async {
    final id = userId;
    if (id == null) return;
    await _repository.delete(id, itemId);
  }

  /// Turns a watched idea into a planned trade and drops it from the list.
  ///
  /// Quantity is 0 because nothing has been bought yet — a planned trade needs
  /// no share count, and the sizing happens when it is marked open. The source
  /// is carried over so the analytics screen can attribute the eventual result
  /// back to whoever recommended it.
  ///
  /// THE TRADE IS WRITTEN BEFORE THE ITEM IS DROPPED, and the order matters:
  /// the reverse loses the idea outright if the second write fails. Firestore
  /// has no transaction across two collections that is worth taking here, so
  /// the failure mode is chosen rather than avoided — a duplicate the user can
  /// delete, never a disappearance they cannot recover.
  Future<Trade?> convertToPlannedTrade(WatchlistItem item) async {
    final id = userId;
    if (id == null) return null;

    final trade = Trade(
      id: const Uuid().v4(),
      entryDate: _today(),
      ticker: item.ticker,
      reason: item.reason,
      entryPrice: item.targetBuyPrice,
      stopPrice: item.stopPrice,
      quantity: 0,
      status: TradeStatus.planned,
      source: item.source,
    );

    await _trades.save(trade);
    await delete(item.id);
    return trade;
  }

  /// The current list, or empty while loading, failed or signed out.
  List<WatchlistItem> get items =>
      state is WatchlistLoaded ? (state as WatchlistLoaded).items : const [];

  static DateTime _today() {
    final now = DateTime.now();
    return DateTime(now.year, now.month, now.day);
  }
}
