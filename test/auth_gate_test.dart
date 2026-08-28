import 'package:egx_trade_journal/app.dart';
import 'package:egx_trade_journal/features/auth/cubit/auth_cubit.dart';
import 'package:egx_trade_journal/features/auth/models/user_account.dart';
import 'package:egx_trade_journal/features/auth/screens/auth_screen.dart';
import 'package:egx_trade_journal/shell/home_shell.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/app_harness.dart';

/// Which screen the app opens on.
///
/// ── THIS FILE USED TO BE ABOUT A HIVE BOX ──────────────────────────────────
///
/// The session was mirrored into `authBox` and read back synchronously, so the
/// gate had exactly two answers and half these tests were about what a written
/// record did to a provider. Firebase Auth persists and restores its own
/// session now, and the mirror is gone — so what is left to pin is what the
/// user is SHOWN, in each of the three states the gate can be in.
///
/// The third one is the new one, and it is not cosmetic: restoring is not
/// signed out, and rendering the sign-in screen while the answer is unknown
/// would flash a login form at somebody who has been signed in for months, on
/// every single launch.
void main() {
  late AppHarness app;

  setUp(() async {
    app = await AppHarness.create();
  });

  tearDown(() => app.dispose());

  /// The app with the auth cubit pinned to [state], everything else real.
  ///
  /// The harness's own auth cubit is replaced rather than reconfigured, so each
  /// test names the state it is about at the point it is about it.
  Future<void> pumpWithAuth(
    WidgetTester tester,
    AuthState state, {
    // A spinner animates forever, so «restoring» can never "settle".
    bool settle = true,
  }) async {
    // The auth screen is taller than the 800x600 default, which would leave the
    // lower half off-screen.
    tester.view.physicalSize = const Size(1000, 2000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final auth = AuthCubit.stub(state);
    addTearDown(auth.close);

    await app.follow();
    await tester.pumpWidget(
      // INSIDE the harness's providers, not outside: the nearest provider
      // wins, so wrapping the other way round would leave the harness's own
      // signed-in cubit answering every one of these tests.
      app.provide(
        BlocProvider<AuthCubit>.value(
          value: auth,
          child: const EgxJournalApp(),
        ),
      ),
    );
    if (settle) {
      await tester.pumpAndSettle();
    } else {
      await tester.pump();
    }
  }

  testWidgets('a fresh install lands on the sign-in screen', (tester) async {
    // The guest path is gone: Radar is account-based, so an install with no
    // session has nothing to show.
    await pumpWithAuth(tester, const AuthSignedOut());

    expect(find.byType(AuthScreen), findsOneWidget);
    expect(find.byType(HomeShell), findsNothing);
  });

  testWidgets('the sign-in screen offers no way past it', (tester) async {
    await pumpWithAuth(tester, const AuthSignedOut());

    expect(
      find.text('متابعة بدون حساب'),
      findsNothing,
      reason:
          'The guest path was removed; leaving the button would let a user tap '
          'into a journal the gate no longer lets them keep.',
    );
  });

  testWidgets('a restored session goes straight to the journal', (
    tester,
  ) async {
    await pumpWithAuth(
      tester,
      const AuthSignedIn(
        UserAccount(
          id: 'uid-123',
          name: 'أحمد',
          email: 'a@b.com',
          isLoggedIn: true,
        ),
      ),
    );

    expect(find.byType(HomeShell), findsOneWidget);
    expect(find.byType(AuthScreen), findsNothing);
  });

  testWidgets('while the session is still being restored, neither is shown', (
    tester,
  ) async {
    await pumpWithAuth(tester, const AuthRestoring(), settle: false);

    expect(
      find.byType(AuthScreen),
      findsNothing,
      reason:
          'Firebase restores asynchronously. Treating "not yet known" as '
          '"signed out" would flash a login form at a signed-in user on every '
          'launch.',
    );
    expect(find.byType(HomeShell), findsNothing);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });
}
