import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/auth_providers.dart';
import 'login_sheet.dart';

/// Account status card displayed in Settings and shell headers.
class UserProfileTile extends ConsumerWidget {
  const UserProfileTile({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider);
    final theme = Theme.of(context);

    return Card(
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: CircleAvatar(
          backgroundColor: theme.colorScheme.primaryContainer,
          child: Text(
            user.isLoggedIn ? user.name[0].toUpperCase() : '؟',
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
                onPressed: () => ref.read(authProvider.notifier).logout(),
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
