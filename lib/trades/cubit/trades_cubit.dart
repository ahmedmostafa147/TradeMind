import 'dart:async';

import '../../core/state/account_scoped_cubit.dart';
import '../data/trade_repository.dart';
import '../trade.dart';

/// What the journal screens see.
///
/// ── WHY THIS HAS A LOADING STATE AND THE RIVERPOD VERSION DID NOT ──────────
///
/// `TradesNotifier` was a plain `Notifier<List<Trade>>`, and its own comment
/// explained why: the Hive box was opened before `runApp`, so the data was
/// already in memory when the first widget built, and an `AsyncValue` unwrap
/// would have pushed loading and error branches into the list, the dashboard,
/// the form and the calculator for a state that could never be observed.
///
/// That argument was right and it does not survive the move. A Firestore stream
/// has a real first frame with nothing in it, and a real failure mode — a denied
/// read, an expired session — that used to be impossible. Pretending otherwise
/// would render "you have no trades yet" to somebody who has plenty, which is
/// the single worst thing a journal can say.
sealed class TradesState {
  const TradesState();
}

/// Before the first snapshot. Distinct from an empty journal, on purpose.
class TradesLoading extends TradesState {
  const TradesLoading();
}

class TradesLoaded extends TradesState {
  /// Newest first, ordered by the repository.
  final List<Trade> trades;

  const TradesLoaded(this.trades);
}

/// The read failed. Carries the reason rather than an empty list, because an
/// empty list is a legitimate answer and this is not.
class TradesFailure extends TradesState {
  final Object error;

  const TradesFailure(this.error);
}

/// Signed out. Not an error and not empty — there is no journal to show.
class TradesSignedOut extends TradesState {
  const TradesSignedOut();
}

class TradesCubit extends AccountScopedCubit<TradesState> {
  final TradeRepository _repository;

  TradesCubit(this._repository) : super(const TradesLoading());

  @override
  TradesState get loadingState => const TradesLoading();

  @override
  TradesState get signedOutState => const TradesSignedOut();

  @override
  StreamSubscription<void> subscribe(String userId) =>
      _repository.watch(userId).listen(
        (trades) => emit(TradesLoaded(trades)),
        // Surfaced, never swallowed. A denied read and an empty journal look
        // identical to a `catch` that returns `[]` — the quiet failure §19 of
        // CLAUDE.md was written about, the one that looks like data.
        onError: (Object error) => emit(TradesFailure(error)),
      );

  /// Writes one trade. The stream reports the result — this does not emit.
  ///
  /// No optimistic local update: Firestore's own cache applies the write
  /// immediately and the snapshot arrives on the next tick, so the UI already
  /// updates without a round trip. Emitting here as well would put a second
  /// writer on the same state and reintroduce, in miniature, the two-sources
  /// problem this whole change removes.
  Future<void> save(Trade trade) async {
    final id = userId;
    if (id == null) return;
    await _repository.save(id, trade);
  }

  Future<void> delete(String tradeId) async {
    final id = userId;
    if (id == null) return;
    await _repository.delete(id, tradeId);
  }

  /// The current journal, or an empty list while loading, failed or signed out.
  ///
  /// For callers that need a snapshot rather than a stream — CSV export, the
  /// calculators. A convenience over [state], not a replacement: anything that
  /// renders has to tell the four states apart.
  List<Trade> get trades =>
      state is TradesLoaded ? (state as TradesLoaded).trades : const [];
}
