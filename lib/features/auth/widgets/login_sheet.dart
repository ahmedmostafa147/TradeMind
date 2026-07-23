import 'package:flutter/material.dart';

import 'auth_form.dart';

/// Modal sheet wrapper around [AuthForm], opened from the settings profile
/// tile. The form itself — validation, error handling, sign-up toggle — lives
/// in [AuthForm] and is shared with the first-run auth screen.
class LoginSheet extends StatelessWidget {
  const LoginSheet({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: EdgeInsets.fromLTRB(
        24,
        24,
        24,
        MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Icon(Icons.cloud_sync_rounded, size: 32),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'حساب السحابة',
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'الحساب بيحفظ صفقاتك بالسحابة كنسخة احتياطية.',
            style: theme.textTheme.bodyMedium,
          ),
          const SizedBox(height: 16),
          AuthForm(
            onSuccess: () {
              // Captured before the pop, since the sheet's own context is
              // defunct by the time the SnackBar is shown.
              final messenger = ScaffoldMessenger.of(context);
              Navigator.of(context).pop();
              messenger.showSnackBar(
                const SnackBar(content: Text('أهلاً بك! تم تسجيل الدخول.')),
              );
            },
          ),
        ],
      ),
    );
  }
}
