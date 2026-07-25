import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme.dart';
import '../../../trades/trades_providers.dart';
import '../../../watchlist/watchlist_providers.dart';
import '../providers/auth_providers.dart';
import '../services/auth_exception.dart';

/// In-app account deletion.
///
/// Google Play requires every app that offers account creation to offer
/// deletion from inside the app **and** from a public web page, and to name
/// both in the Data Safety form. This is the in-app half; the web half is a
/// form on the published site.
///
/// Only rendered for a signed-in user — a guest has no account to delete, and
/// showing the control anyway would suggest their local journal is at risk.
class DeleteAccountTile extends ConsumerStatefulWidget {
  const DeleteAccountTile({super.key});

  @override
  ConsumerState<DeleteAccountTile> createState() => _DeleteAccountTileState();
}

class _DeleteAccountTileState extends ConsumerState<DeleteAccountTile> {
  bool _working = false;

  Future<void> _confirmAndDelete() async {
    final wipeLocal = await showDialog<bool>(
      context: context,
      builder: (_) => const _ConfirmDeleteDialog(),
    );
    if (wipeLocal == null || !mounted) return;

    setState(() => _working = true);
    try {
      await ref
          .read(authProvider.notifier)
          .deleteAccount(
            wipeLocalJournal: wipeLocal,
            clearLocalJournal: () async {
              await ref.read(tradesBoxProvider).clear();
              await ref.read(watchlistBoxProvider).clear();
              ref.invalidate(tradesProvider);
              ref.invalidate(watchlistProvider);
            },
          );

      // Back to the auth screen rather than into a journal belonging to an
      // account that no longer exists.
      await ref.read(authGateSkipProvider.notifier).reset();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('تم حذف الحساب وكل بياناته.')),
      );
    } on AuthException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('تعذّر حذف الحساب. اتأكد من الإنترنت وجرّب تاني.'),
        ),
      );
    } finally {
      if (mounted) setState(() => _working = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!ref.watch(authProvider).isLoggedIn) return const SizedBox.shrink();

    final colors = context.resultColors;

    return Card(
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: _working
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : Icon(Icons.person_remove_rounded, color: colors.loss),
        title: Text(
          'حذف الحساب نهائيًا',
          style: TextStyle(color: colors.loss, fontWeight: FontWeight.bold),
        ),
        subtitle: const Text(
          'يمسح حسابك وكل النسخة السحابية من صفقاتك. مش ممكن الرجوع فيه.',
        ),
        onTap: _working ? null : _confirmAndDelete,
      ),
    );
  }
}

/// Returns whether to wipe the local journal too, or null if the user backed
/// out. Deliberately not a plain yes/no: the destructive extra is a separate,
/// opt-in decision from deleting the account itself.
class _ConfirmDeleteDialog extends StatefulWidget {
  const _ConfirmDeleteDialog();

  @override
  State<_ConfirmDeleteDialog> createState() => _ConfirmDeleteDialogState();
}

class _ConfirmDeleteDialogState extends State<_ConfirmDeleteDialog> {
  bool _wipeLocal = false;

  @override
  Widget build(BuildContext context) {
    final colors = context.resultColors;

    return AlertDialog(
      title: const Text('حذف الحساب نهائيًا؟'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'هيتمسح حسابك والنسخة المحفوظة من صفقاتك على السيرفر. '
            'العملية دي نهائية ومفيش رجوع فيها.',
          ),
          const SizedBox(height: 12),
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            controlAffinity: ListTileControlAffinity.leading,
            value: _wipeLocal,
            onChanged: (v) => setState(() => _wipeLocal = v ?? false),
            title: const Text('امسح كمان الصفقات المحفوظة على التليفون'),
            // Off by default: after the cloud copy goes, this is the only one
            // left, and it may well predate the account entirely.
            subtitle: const Text(
              'من غيرها، دفترك هيفضل على الجهاز زي ما هو.',
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('رجوع'),
        ),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: colors.loss),
          onPressed: () => Navigator.of(context).pop(_wipeLocal),
          child: const Text('احذف الحساب'),
        ),
      ],
    );
  }
}
