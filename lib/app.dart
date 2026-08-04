import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/theme.dart';
import 'features/auth/screens/auth_screen.dart';
import 'features/onboarding/providers/onboarding_providers.dart';
import 'features/onboarding/screens/onboarding_screen.dart';
import 'settings/settings_providers.dart';
import 'shell/home_shell.dart';

class EgxJournalApp extends ConsumerWidget {
  const EgxJournalApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp(
      title: 'Radar',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ref.watch(themeModeProvider),

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

      // Intro, then auth, then the journal.
      //
      // The tour comes BEFORE sign-in deliberately: it is the answer to "why
      // should I make an account for this?", and putting it after the gate
      // would only ever be read by people who had already decided.
      home: const OnboardingGate(child: AuthGate(child: HomeShell())),
    );
  }
}

/// Shows the intro once, then gets out of the way forever.
///
/// A gate rather than a route push: the flag lives in a provider, so finishing
/// the tour swaps the subtree with no navigator involved and no back gesture
/// that could return the user to slide four from the journal.
class OnboardingGate extends ConsumerWidget {
  final Widget child;

  const OnboardingGate({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ref.watch(onboardingSeenProvider) ? child : const OnboardingScreen();
  }
}

/// Shown when Hive cannot be opened. Rather than a white screen or a crash, the
/// user gets a readable explanation — and since this app is the only copy of
/// their journal, that matters more than it would elsewhere.
class StorageFailureApp extends StatelessWidget {
  final Object error;

  const StorageFailureApp(this.error, {super.key});

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
                  'تعذّر فتح قاعدة البيانات المحلية',
                  style: Theme.of(context).textTheme.titleLarge,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                const Text(
                  'حاول إغلاق التطبيق وفتحه من جديد. لو استمرت المشكلة، '
                  'قد تكون مساحة التخزين ممتلئة.',
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
