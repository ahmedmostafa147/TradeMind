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
                  // The product's own mark, not a stock Material glyph.
                  // `candlestick_chart_rounded` stood here and was wrong twice
                  // over: it is the icon a dozen other trading apps ship, and
                  // it shared nothing with the launcher icon or the splash, so
                  // the first screen after launch looked like a different app.
                  //
                  // ClipRRect because the source is a rounded square with
                  // TRANSPARENT corners; letting it draw unclipped is fine, but
                  // clipping to the same radius keeps the edge crisp when the
                  // image is scaled down from 1024px.
                  //
                  // No «Radar» wordmark under it — removed by request. The name
                  // still reaches a screen reader through the semantic label.
                  Semantics(
                    label: 'Radar',
                    image: true,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(18),
                      child: Image.asset(
                        'assets/logo.png',
                        width: 84,
                        height: 84,
                        // The mark is a fixed square; anything else would be a
                        // packaging mistake worth seeing rather than hiding.
                        fit: BoxFit.contain,
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'سجّل صفقاتك، احسب المخاطرة، والتزم بقواعدك.',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 32),
                  const AuthForm(),
                ],
              ),
            ),
          ),
        ),
      ),
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
