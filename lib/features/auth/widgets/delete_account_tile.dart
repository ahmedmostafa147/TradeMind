import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/theme.dart';
import '../cubit/auth_cubit.dart';
import '../services/auth_exception.dart';

/// In-app account deletion.
///
/// Google Play requires every app that offers account creation to offer
/// deletion from inside the app **and** from a public web page, and to name
/// both in the Data Safety form. This is the in-app half; the web half is a
/// form on the published site.
class DeleteAccountTile extends StatefulWidget {
  const DeleteAccountTile({super.key});

  @override
  State<DeleteAccountTile> createState() => _DeleteAccountTileState();
}

class _DeleteAccountTileState extends State<DeleteAccountTile> {
  bool _working = false;

  Future<void> _confirmAndDelete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => const _ConfirmDeleteDialog(),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _working = true);
    try {
      await context.read<AuthCubit>().deleteAccount();

      // No explicit navigation back to the auth screen: deleteAccount ends the
      // session, the auth stream reports it, and the gate lands there on its
      // own.
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
    if (context.watch<AuthCubit>().account == null) {
      return const SizedBox.shrink();
    }

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
          'يمسح حسابك وكل صفقاتك. مش ممكن الرجوع فيه.',
        ),
        onTap: _working ? null : _confirmAndDelete,
      ),
    );
  }
}

/// ── THE «امسح كمان من التليفون» CHECKBOX IS GONE ───────────────────────────
///
/// It used to be here, off by default, because the journal existed twice: once
/// in the account and once in a Hive box that could predate it. Wiping the
/// local copy was therefore a second, genuinely separate decision, and the
/// dialog returned which way it went rather than a plain yes/no.
///
/// There is one copy now. Offering the choice would ask the user to decide
/// about something that does not exist, and — worse — imply a copy survives the
/// deletion when none does.
class _ConfirmDeleteDialog extends StatelessWidget {
  const _ConfirmDeleteDialog();

  @override
  Widget build(BuildContext context) {
    final colors = context.resultColors;

    return AlertDialog(
      title: const Text('حذف الحساب نهائيًا؟'),
      content: const Text(
        'هيتمسح حسابك وكل صفقاتك وقائمة المراقبة وإعدادات المخاطرة. '
        'العملية دي نهائية ومفيش رجوع فيها ولا نسخة تانية في أي مكان.',
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('رجوع'),
        ),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: colors.loss),
          onPressed: () => Navigator.of(context).pop(true),
          child: const Text('احذف الحساب'),
        ),
      ],
    );
  }
}
