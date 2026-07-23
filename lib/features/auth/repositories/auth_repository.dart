import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_ce/hive.dart';

import '../models/user_account.dart';
import '../services/firebase_auth_service.dart';

/// Manages authentication session, Firebase Auth sync, and Hive persistence.
class AuthRepository extends Notifier<UserAccount> {
  late final Box _box;

  AuthRepository(Box box) : _box = box;

  @override
  UserAccount build() {
    final data = _box.get('current_user') as Map?;
    return UserAccount.fromMap(data);
  }

  /// Sign up with Firebase Auth (or fallback to local session if Firebase is uninitialized).
  Future<void> signUp({
    required String name,
    required String email,
    required String password,
  }) async {
    String userId = DateTime.now().millisecondsSinceEpoch.toString();
    try {
      final credential = await FirebaseAuthService.signUp(
        email: email,
        password: password,
        displayName: name,
      );
      if (credential?.user != null) {
        userId = credential!.user!.uid;
      }
    } catch (e) {
      // Fallback for offline/local-only mode
    }

    final account = UserAccount(
      id: userId,
      name: name,
      email: email,
      isLoggedIn: true,
      lastLogin: DateTime.now(),
    );

    await _box.put('current_user', account.toMap());
    state = account;
  }

  /// Sign in with Firebase Auth.
  Future<void> login({
    required String email,
    required String password,
    String? nameFallback,
  }) async {
    String userId = DateTime.now().millisecondsSinceEpoch.toString();
    String displayName = nameFallback ?? email.split('@').first;

    try {
      final credential = await FirebaseAuthService.signIn(
        email: email,
        password: password,
      );
      if (credential?.user != null) {
        userId = credential!.user!.uid;
        displayName = credential.user!.displayName ?? displayName;
      }
    } catch (_) {}

    final account = UserAccount(
      id: userId,
      name: displayName,
      email: email,
      isLoggedIn: true,
      lastLogin: DateTime.now(),
    );

    await _box.put('current_user', account.toMap());
    state = account;
  }

  /// Sign out current user.
  Future<void> logout() async {
    await FirebaseAuthService.signOut();
    await _box.delete('current_user');
    state = UserAccount.guest;
  }
}
