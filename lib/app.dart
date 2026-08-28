import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'core/preferences/device_prefs_cubit.dart';
import 'core/state/state_views.dart';
import 'core/theme.dart';
import 'features/auth/cubit/auth_cubit.dart';
import 'features/auth/screens/auth_screen.dart';
import 'features/onboarding/screens/onboarding_screen.dart';
import 'shell/home_shell.dart';

class EgxJournalApp extends StatelessWidget {
  const EgxJournalApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Radar',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: context.select((DevicePrefsCubit c) => c.state.themeMode),

      // Single locale, so no ARB files and no gen_l10n — Arabic strings are
      // inline literals. flutter_localizations is still mandatory: without
      // GlobalMaterialLocalizations the first dialog, date picker or Dismissible
      // throws "No MaterialLocalizations found", and GlobalWidgetsLocalizations
      // is what actually establishes TextDirection.rtl app-wide.
      locale: const Locale('ar'),
      supportedLocales: const [Locale('ar')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],

      // Intro, then auth, then the risk rule, then the journal.
      //
      // The tour comes BEFORE sign-in deliberately: it is the answer to "why
      // should I make an account for this?", and putting it after the gate
      // would only ever be read by people who had already decided.
      //
      // SettingsGate is innermost because it is the only one that needs an
      // account to resolve at all — outside AuthGate it would spin forever for
      // a signed-out visitor, in front of the sign-in screen they need.
      home: const OnboardingGate(
        child: AuthGate(child: SettingsGate(child: HomeShell())),
      ),
    );
  }
}

/// Shows the intro once, then gets out of the way forever.
///
/// A gate rather than a route push: the flag lives in a cubit, so finishing the
/// tour swaps the subtree with no navigator involved and no back gesture that
/// could return the user to slide four from the journal.
class OnboardingGate extends StatelessWidget {
  final Widget child;

  const OnboardingGate({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final seen = context.select((DevicePrefsCubit c) => c.state.onboardingSeen);
    return seen ? child : const OnboardingScreen();
  }
}

/// Chooses between the auth screen and the journal.
///
/// The third branch is new and it is not cosmetic: Firebase restores its
/// session asynchronously, so there is a real moment where the answer is not
/// known. Treating that as "signed out" would flash a login form at somebody
/// who has been signed in for months, on every single launch.
class AuthGate extends StatelessWidget {
  final Widget child;

  const AuthGate({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthCubit, AuthState>(
      builder: (context, state) => switch (state) {
        AuthSignedIn() => child,
        AuthSignedOut() => const AuthScreen(),
        AuthRestoring() => const Scaffold(body: LoadingView()),
      },
    );
  }
}

/// Shown when the app cannot start at all — in practice, when Firebase fails to
/// initialise. Rather than a white screen or a crash, the user gets a readable
/// explanation; and since the journal now lives entirely in the account, "no
/// backend" really does mean "no app", so saying so plainly is the honest
/// answer rather than a degraded one.
class StartupFailureApp extends StatelessWidget {
  final Object error;

  const StartupFailureApp(this.error, {super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      locale: const Locale('ar'),
      supportedLocales: const [Locale('ar')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: Scaffold(
        body: Padding(
          padding: const EdgeInsets.all(24),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, size: 48),
                const SizedBox(height: 16),
                Text(
                  'تعذّر تشغيل التطبيق',
                  style: Theme.of(context).textTheme.titleLarge,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                const Text(
                  'حاول إغلاق التطبيق وفتحه من جديد. لو استمرت المشكلة، '
                  'اتأكد من الإنترنت.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                Text(
                  '$error',
                  style: Theme.of(context).textTheme.bodySmall,
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
