import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/auth_providers.dart';

/// Modal bottom sheet for logging in and creating a Firebase user account.
class LoginSheet extends ConsumerStatefulWidget {
  const LoginSheet({super.key});

  @override
  ConsumerState<LoginSheet> createState() => _LoginSheetState();
}

class _LoginSheetState extends ConsumerState<LoginSheet> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isSignUp = false;
  bool _loading = false;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();
    final name = _nameController.text.trim();

    if (email.isEmpty || password.isEmpty) return;
    if (_isSignUp && name.isEmpty) return;

    setState(() => _loading = true);

    try {
      if (_isSignUp) {
        await ref.read(authProvider.notifier).signUp(
              name: name,
              email: email,
              password: password,
            );
      } else {
        await ref.read(authProvider.notifier).login(
              email: email,
              password: password,
              nameFallback: name.isNotEmpty ? name : null,
            );
      }

      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              _isSignUp
                  ? 'تم إنشاء الحساب ومزامنة البيانات بالسحابة بنجاح!'
                  : 'أهلاً بك! تم تسجيل الدخول واستعادة البيانات.',
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('خطأ: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

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
              Text(
                _isSignUp ? 'إنشاء حساب جديد بالسحابة' : 'تسجيل الدخول',
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'حسابك يضمن استعادة وتزامن صفقاتك حتى عند مسح التطبيق.',
            style: theme.textTheme.bodyMedium,
          ),
          const SizedBox(height: 16),
          if (_isSignUp) ...[
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'اسم المتداول',
                prefixIcon: Icon(Icons.person_outline),
              ),
            ),
            const SizedBox(height: 10),
          ],
          TextField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(
              labelText: 'البريد الإلكتروني',
              prefixIcon: Icon(Icons.email_outlined),
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _passwordController,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'كلمة السر',
              prefixIcon: Icon(Icons.lock_outline),
            ),
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _loading ? null : _submit,
            child: _loading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(_isSignUp ? 'إنشاء الحساب ومزامنة البيانات' : 'تسجيل الدخول'),
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: () => setState(() => _isSignUp = !_isSignUp),
            child: Text(
              _isSignUp
                  ? 'لديك حساب بالفعل؟ سجل الدخول هنا'
                  : 'ليس لديك حساب؟ أنشئ حساباً جديداً',
            ),
          ),
        ],
      ),
    );
  }
}
