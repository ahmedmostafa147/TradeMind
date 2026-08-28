import 'package:flutter/material.dart';

import '../widgets/auth_form.dart';

/// The first screen on a fresh install, and there is no way past it.
///
/// THIS USED TO OFFER A GUEST PATH and the comment here used to defend one. It
/// is gone by the owner's decision: Radar is an account-based product, the
/// journal lives in the account, and the app and the website are the same
/// account. `test/auth_gate_test.dart` pins that — «the sign-in screen offers no
/// way past it» — because a stray footer link would quietly undo it.
///
/// Firebase Auth persists and restores its own session, so only the first
/// launch needs the user to type anything. The journal itself is online now,
/// though — see the note on AuthCubit.
class AuthScreen extends StatelessWidget {
  const AuthScreen({super.key});

  @override
  Widget build(BuildContext context) {
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
                  Center(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Image.asset(
                        'assets/logo.png',
                        width: 64,
                        height: 64,
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
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

