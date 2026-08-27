import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';

import '../../data/trade_repository.dart';
import '../trade.dart';

/// What the journal screens see.
///
/// ── WHY THIS HAS A LOADING STATE AND THE RIVERPOD VERSION DID NOT ──────────
///
/// `TradesNotifier` was a plain `Notifier<List<Trade>>` with a comment
/// explaining the choice: the Hive box was opened before `runApp`, so the data
/// was already in memory when the first widget built, and an `AsyncValue`
/// unwrap would have pushed loading and error branches into the list, the
/// dashboard, the form and the calculator for a state that could never be
/// observed.
///
/// That argument was correct and it does not survive the move. A Firestore
/// stream has a real first frame with nothing in it, and a real failure mode —
/// a denied read, an expired session — that used to be impossible. Pretending
/// otherwise would render "you have no trades yet" to somebody who has plenty,
/// which is the single worst thing a journal can say.
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

class TradesCubit extends Cubit<TradesState> {
  final TradeRepository _repository;

  StreamSubscription<List<Trade>>? _subscription;
  String? _userId;

  /// Whether [signIn] has ever been called.
  ///
  /// Needed because `_userId` starts null and "signed out" is ALSO null, so
  /// comparing ids alone cannot tell the two apart. Without this, the first
  /// `signIn(null)` — which is what the auth listener reports for a visitor
  /// who is simply not logged in — matched the initial value, returned early,
  /// and left the cubit in [TradesLoading] forever. A spinner that never
  /// resolves, on the most ordinary path there is.
  bool _pointed = false;

  TradesCubit(this._repository) : super(const TradesLoading());

  /// Points the journal at an account, or at nobody.
  ///
  /// Called from the auth listener. Re-pointing at the same id is ignored
  /// once it has been pointed at least once:
  /// Firebase Auth re-emits the current user on token refresh, and tearing the
  /// subscription down and back up for that would blank the screen and cost a
  /// fresh read every hour.
  Future<void> signIn(String? userId) async {
    if (_pointed && userId == _userId) return;
    _pointed = true;
    _userId = userId;
    await _subscription?.cancel();
    _subscription = null;

    if (userId == null) {
      emit(const TradesSignedOut());
      return;
    }

    emit(const TradesLoading());
    _subscription = _repository.watch(userId).listen(
      (trades) => emit(TradesLoaded(trades)),
      // Surfaced, never swallowed. A denied read and an empty journal look
      // identical to a `catch` that returns `[]`, and that is exactly the
      // failure §19 was written about: the quiet one that looks like data.
      onError: (Object error) => emit(TradesFailure(error)),
    );
  }

  /// Writes one trade. The stream reports the result — this does not emit.
  ///
  /// No optimistic local update: Firestore's own cache applies the write
  /// immediately and the snapshot arrives on the next tick, so the UI already
  /// updates without a round trip. Emitting here as well would put a second
  /// writer on the same state and reintroduce, in miniature, the two-sources
  /// problem this whole change removes.
  Future<void> save(Trade trade) async {
    final userId = _userId;
    if (userId == null) return;
    await _repository.save(userId, trade);
  }

  Future<void> delete(String tradeId) async {
    final userId = _userId;
    if (userId == null) return;
    await _repository.delete(userId, tradeId);
  }

  /// The current journal, or an empty list while loading or failed.
  ///
  /// For callers that need a snapshot rather than a stream — CSV export, the
  /// calculators. It is a convenience over [state], not a replacement: anything
  /// that renders has to tell the four states apart.
  List<Trade> get trades =>
      state is TradesLoaded ? (state as TradesLoaded).trades : const [];

  @override
  Future<void> close() async {
    await _subscription?.cancel();
    return super.close();
  }
}
