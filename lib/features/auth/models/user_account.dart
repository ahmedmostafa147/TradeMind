import 'package:characters/characters.dart';
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
    email: 'guest@tradepilot.app',
    isLoggedIn: false,
  );

  /// Used when no name can be derived. Never empty: the profile tile renders
  /// `name[0]`, which throws a RangeError on an empty string.
  static const fallbackName = 'مستخدم';

  /// The avatar letter. Guards the empty-name case at the point of use, since
  /// a session restored from an older build may still carry one.
  String get initial =>
      name.trim().isEmpty ? '؟' : name.trim().characters.first.toUpperCase();

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
      name: map['name'] as String? ?? fallbackName,
      email: map['email'] as String? ?? 'trader@egx.com',
      isLoggedIn: map['isLoggedIn'] as bool? ?? false,
      lastLogin: map['lastLogin'] != null
          ? DateTime.tryParse(map['lastLogin'] as String)
          : null,
    );
  }
}
