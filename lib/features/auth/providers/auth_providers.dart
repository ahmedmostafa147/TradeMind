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

/// True only when there is a signed-in account.
///
/// The guest path is gone: TradePilot is an account-based product now, and
/// every install belongs to a user. The previous version let a fresh install
/// walk straight into the journal and kept sign-in as an optional step in
/// Settings.
///
/// **This does not make the app require a network to open.** The session is
/// persisted in Hive by [AuthRepository] and read back synchronously in its
/// `build()`, so `isLoggedIn` is a local disk read, not a call to Firebase.
/// Only the FIRST launch needs connectivity; after that the journal opens
/// offline exactly as it did before, which is what keeps a user from being
/// locked out of their own records when the backend is unreachable.
final authGatePassedProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).isLoggedIn;
});
