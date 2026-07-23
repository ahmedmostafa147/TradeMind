import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/auth_providers.dart';
import '../widgets/auth_form.dart';

/// The first screen on a fresh install: sign in, or carry on without an account.
///
/// The guest path is not a courtesy — this journal stores every trade locally
/// and is designed to work with no network at all. A hard gate would make the
/// app unusable whenever Firebase is unreachable or unconfigured, which is
/// precisely when someone most needs to reach their own records.
class AuthScreen extends ConsumerWidget {
  const AuthScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 32, 24, 32),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Icon(
                    Icons.candlestick_chart_rounded,
                    size: 56,
                    color: theme.colorScheme.primary,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'TradeMind',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'سجّل صفقاتك، احسب المخاطرة، والتزم بقواعدك.',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 32),
                  AuthForm(
                    footer: _GuestFooter(
                      onSkip: () =>
                          ref.read(authGateSkipProvider.notifier).skip(),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _GuestFooter extends StatelessWidget {
  final VoidCallback onSkip;

  const _GuestFooter({required this.onSkip});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(child: Divider(color: theme.colorScheme.outlineVariant)),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Text(
                'أو',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ),
            Expanded(child: Divider(color: theme.colorScheme.outlineVariant)),
          ],
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: onSkip,
          icon: const Icon(Icons.phone_android_rounded, size: 18),
          label: const Text('متابعة بدون حساب'),
        ),
        const SizedBox(height: 10),
        Text(
          'صفقاتك هتتحفظ على جهازك بس. اعمل حساب عشان تاخد نسخة احتياطية '
          'بالسحابة وتسترجعها لو شلت التطبيق.',
          textAlign: TextAlign.center,
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}

/// Chooses between the auth screen and the journal.
class AuthGate extends ConsumerWidget {
  final Widget child;

  const AuthGate({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ref.watch(authGatePassedProvider) ? child : const AuthScreen();
  }
}
