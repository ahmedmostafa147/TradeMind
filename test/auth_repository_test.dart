import 'dart:io';

import 'package:egx_trade_journal/core/hive_keys.dart';
import 'package:egx_trade_journal/features/auth/models/user_account.dart';
import 'package:egx_trade_journal/features/auth/providers/auth_providers.dart';
import 'package:egx_trade_journal/features/auth/repositories/auth_repository.dart';
import 'package:egx_trade_journal/features/auth/services/auth_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_ce/hive.dart';

/// These run with Firebase uninitialised — the state of any build without a
/// google-services.json, which is every build of this app today.
///
/// The behaviour under test is the one that matters most: when identity cannot
/// be verified, no session is created. An earlier version fell back to a
/// locally minted user id here, so any email with any password produced a real,
/// persisted, "logged in" account.
void main() {
  late Directory tempDir;
  late Box authBox;
  late ProviderContainer container;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('egx_auth');
    Hive.init(tempDir.path);
    authBox = await Hive.openBox(kAuthBox);
    container = ProviderContainer(
      overrides: [
        authBoxProvider.overrideWithValue(authBox),
        authProvider.overrideWith(() => AuthRepository(authBox)),
      ],
    );
  });

  tearDown(() async {
    container.dispose();
    await Hive.close();
    if (tempDir.existsSync()) tempDir.deleteSync(recursive: true);
  });

  AuthRepository notifier() => container.read(authProvider.notifier);

  test('a fresh install starts as a guest', () {
    expect(container.read(authProvider).isLoggedIn, isFalse);
    expect(container.read(authProvider).id, 'guest');
  });

  test('login fails loudly when the backend cannot verify it', () async {
    await expectLater(
      notifier().login(
        email: 'nobody@example.com',
        password: 'not-the-right-password',
      ),
      throwsA(
        isA<AuthException>().having(
          (e) => e.failure,
          'failure',
          AuthFailure.backendUnavailable,
        ),
      ),
    );
  });

  test('a failed login leaves the user a guest and writes nothing', () async {
    await expectLater(
      notifier().login(email: 'nobody@example.com', password: 'wrong'),
      throwsA(isA<AuthException>()),
    );

    expect(container.read(authProvider).isLoggedIn, isFalse);
    expect(
      authBox.get('current_user'),
      isNull,
      reason: 'An unverified attempt must not leave a session on disk.',
    );
  });

  test('sign-up fails loudly too', () async {
    await expectLater(
      notifier().signUp(
        name: 'أحمد',
        email: 'new@example.com',
        password: 'longenough',
      ),
      throwsA(isA<AuthException>()),
    );
    expect(container.read(authProvider).isLoggedIn, isFalse);
  });

  test('logout returns to guest and clears the box', () async {
    await notifier().logout();
    expect(container.read(authProvider), UserAccount.guest);
    expect(authBox.get('current_user'), isNull);
  });

  group('avatar initial', () {
    UserAccount named(String name) =>
        UserAccount(id: 'x', name: name, email: 'a@b.c', isLoggedIn: true);

    test('an empty name does not throw', () {
      // The tile used to render `name[0]`, a RangeError on this input.
      expect(named('').initial, '؟');
      expect(named('   ').initial, '؟');
    });

    test('takes the first letter, uppercased', () {
      expect(named('ahmed').initial, 'A');
      expect(named('أحمد').initial, 'أ');
    });

    test('does not split a multi-code-unit grapheme', () {
      expect(named('👨‍💻 trader').initial.isNotEmpty, isTrue);
    });
  });
}
