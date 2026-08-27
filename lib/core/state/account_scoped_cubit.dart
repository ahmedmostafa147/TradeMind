import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';

/// Base for a cubit whose data belongs to one signed-in account and arrives as
/// a stream.
///
/// The journal and the watchlist need exactly the same plumbing — follow one
/// account, drop the previous one, survive a token refresh, clean up on close —
/// and it is the part that is easy to get subtly wrong. Writing it twice would
/// mean fixing the next bug in it twice, so it is written once here and the
/// feature cubits keep only what is actually theirs: their own states and their
/// own writes.
///
/// Deliberately NOT generic over the state type. Making `TradesLoaded` into
/// `CollectionLoaded<Trade>` would save a few more lines and cost every call
/// site its readable name — the abstraction §2 warns about, where the file
/// count drops and the code gets harder to follow.
abstract class AccountScopedCubit<S> extends Cubit<S> {
  StreamSubscription<void>? _subscription;
  String? _userId;

  /// Whether [followAccount] has ever been called.
  ///
  /// `_userId` starts null and "signed out" is ALSO null, so comparing ids
  /// alone cannot tell the two apart. Without this the first `followAccount
  /// (null)` — what the auth listener reports for anyone who is simply not
  /// logged in — matches the initial value, returns early, and leaves the cubit
  /// on its loading state forever: a spinner that never resolves, on the most
  /// ordinary path there is.
  bool _pointed = false;

  AccountScopedCubit(super.initialState);

  /// The id currently being followed, or null when signed out.
  String? get userId => _userId;

  /// Emitted while waiting for the account's first snapshot.
  S get loadingState;

  /// Emitted when there is no account to show.
  S get signedOutState;

  /// Subscribes to the account's data. Implementations wire their own stream
  /// and map it to their own states.
  StreamSubscription<void> subscribe(String userId);

  /// Points at an account, or at nobody.
  ///
  /// Re-pointing at the same id is ignored once pointed at least once: Firebase
  /// Auth re-emits the current user on every token refresh, and rebuilding the
  /// subscription for that would blank the screen and buy a fresh read an hour.
  Future<void> followAccount(String? userId) async {
    if (_pointed && userId == _userId) return;
    _pointed = true;
    _userId = userId;

    await _subscription?.cancel();
    _subscription = null;

    if (userId == null) {
      emit(signedOutState);
      return;
    }

    emit(loadingState);
    _subscription = subscribe(userId);
  }

  @override
  Future<void> close() async {
    await _subscription?.cancel();
    return super.close();
  }
}
