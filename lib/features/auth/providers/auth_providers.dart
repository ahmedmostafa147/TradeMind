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

/// Whether the user chose to carry on without an account.
///
/// Persisted rather than held in memory: the journal works fully offline, so
/// someone who declined an account once should not be asked again on every
/// cold start. Signing out clears it, which puts the gate back.
class AuthGateSkip extends Notifier<bool> {
  static const _key = 'skipped_auth';

  @override
  bool build() => ref.watch(authBoxProvider).get(_key) as bool? ?? false;

  /// State first, disk second. The gate should open the instant the button is
  /// tapped rather than after a file write — and holding the UI on I/O is what
  /// makes this untestable in a widget test, where the fake-async clock means
  /// a real disk write never completes at all.
  Future<void> skip() async {
    state = true;
    await ref.read(authBoxProvider).put(_key, true);
  }

  Future<void> reset() async {
    state = false;
    await ref.read(authBoxProvider).delete(_key);
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
