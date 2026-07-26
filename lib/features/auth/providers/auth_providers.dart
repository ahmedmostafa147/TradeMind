import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_ce/hive.dart';

import '../models/user_account.dart';
import '../repositories/auth_repository.dart';

final authBoxProvider = Provider<Box>((ref) {
  throw UnimplementedError('authBoxProvider must be overridden in main()');
});

final authProvider = NotifierProvider<AuthRepository, UserAccount>(() {
  throw UnimplementedError('authProvider must be overridden with Box');
});

/// Whether the journal should open directly, without asking for an account.
///
/// **Defaults to true on a fresh install.** The journal is local-first: it
/// stores every trade on the device and needs no account, no network and no
/// Firebase to be useful. Putting a sign-in screen in front of it made the
/// very first thing a new user saw a decision they had no context to make —
/// before seeing a single screen of what they were signing up for. Sign-in is
/// still one tap away in Settings, where it is an informed choice rather than
/// a toll gate.
///
/// The screen still appears after an explicit sign-out or account deletion,
/// where dropping straight back into the journal as an anonymous guest would
/// read as if the sign-out had failed.
class AuthGateSkip extends Notifier<bool> {
  static const _key = 'skipped_auth';

  @override
  bool build() => ref.watch(authBoxProvider).get(_key) as bool? ?? true;

  /// State first, disk second. The gate should open the instant the button is
  /// tapped rather than after a file write — and holding the UI on I/O is what
  /// makes this untestable in a widget test, where the fake-async clock means
  /// a real disk write never completes at all.
  Future<void> skip() async {
    state = true;
    await ref.read(authBoxProvider).put(_key, true);
  }

  /// Puts the sign-in screen back.
  ///
  /// Writes `false` rather than deleting the key: absence now means "fresh
  /// install, go straight in", so deleting would send a user who just signed
  /// out back into the journal instead.
  Future<void> reset() async {
    state = false;
    await ref.read(authBoxProvider).put(_key, false);
  }
}

final authGateSkipProvider = NotifierProvider<AuthGateSkip, bool>(
  AuthGateSkip.new,
);

/// True when the app should show the journal: the user is signed in, or they
/// explicitly chose to stay a guest.
///
/// Not a hard gate on purpose. The journal lives in local Hive and must stay
/// reachable with no network and no Firebase config — locking it would deny
/// people their own records exactly when the backend is down.
final authGatePassedProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).isLoggedIn || ref.watch(authGateSkipProvider);
});
