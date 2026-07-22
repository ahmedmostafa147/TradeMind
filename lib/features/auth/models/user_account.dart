import 'package:flutter/foundation.dart';

/// User account entity representing authenticated user session.
@immutable
class UserAccount {
  final String id;
  final String name;
  final String email;
  final bool isLoggedIn;
  final DateTime? lastLogin;

  const UserAccount({
    required this.id,
    required this.name,
    required this.email,
    required this.isLoggedIn,
    this.lastLogin,
  });

  static const guest = UserAccount(
    id: 'guest',
    name: 'زائر',
    email: 'guest@trademind.app',
    isLoggedIn: false,
  );

  Map<String, dynamic> toMap() => {
        'id': id,
        'name': name,
        'email': email,
        'isLoggedIn': isLoggedIn,
        'lastLogin': lastLogin?.toIso8601String(),
      };

  factory UserAccount.fromMap(Map<dynamic, dynamic>? map) {
    if (map == null) return guest;
    return UserAccount(
      id: map['id'] as String? ?? 'user_1',
      name: map['name'] as String? ?? 'مستخدم البورصة',
      email: map['email'] as String? ?? 'trader@egx.com',
      isLoggedIn: map['isLoggedIn'] as bool? ?? false,
      lastLogin: map['lastLogin'] != null
          ? DateTime.tryParse(map['lastLogin'] as String)
          : null,
    );
  }
}
