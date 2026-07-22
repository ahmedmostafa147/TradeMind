import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_ce/hive.dart';

import '../models/user_account.dart';

/// Manages authentication session and Hive persistence.
class AuthRepository extends Notifier<UserAccount> {
  late final Box _box;

  AuthRepository(Box box) : _box = box;

  @override
  UserAccount build() {
    final data = _box.get('current_user') as Map?;
    return UserAccount.fromMap(data);
  }

  Future<void> login({required String name, required String email}) async {
    final account = UserAccount(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      name: name,
      email: email,
      isLoggedIn: true,
      lastLogin: DateTime.now(),
    );
    await _box.put('current_user', account.toMap());
    state = account;
  }

  Future<void> logout() async {
    await _box.delete('current_user');
    state = UserAccount.guest;
  }
}
