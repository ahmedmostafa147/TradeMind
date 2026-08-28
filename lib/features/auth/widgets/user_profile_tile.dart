import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../cubit/auth_cubit.dart';
import '../models/user_account.dart';
import 'login_sheet.dart';

/// Account status card displayed in Settings and shell headers.
class UserProfileTile extends StatelessWidget {
  const UserProfileTile({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthCubit>().account ?? UserAccount.guest;
    final theme = Theme.of(context);

    return Card(
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: CircleAvatar(
          backgroundColor: theme.colorScheme.primaryContainer,
          child: Text(
            user.isLoggedIn ? user.initial : '؟',
            style: TextStyle(
              color: theme.colorScheme.onPrimaryContainer,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        title: Text(
          user.isLoggedIn ? user.name : 'مستخدم زائر',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        subtitle: Text(
          user.isLoggedIn ? user.email : 'اضغط لتسجيل الدخول وحفظ صفقاتك باسمك',
          style: theme.textTheme.bodySmall,
        ),
        trailing: user.isLoggedIn
            ? IconButton(
                icon: const Icon(Icons.logout),
                tooltip: 'تسجيل الخروج',
                // logout() ends the session; the auth stream reports it and
                // the gate returns to the sign-in screen by itself.
                onPressed: context.read<AuthCubit>().logout,
              )
            : FilledButton.tonal(
                onPressed: () => showModalBottomSheet(
                  context: context,
                  isScrollControlled: true,
                  builder: (_) => const LoginSheet(),
                ),
                child: const Text('دخول'),
              ),
      ),
    );
  }
}
