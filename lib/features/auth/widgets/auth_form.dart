import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/auth_providers.dart';
import '../services/auth_exception.dart';
import '../services/firebase_auth_service.dart';

/// The sign-in / sign-up form, shared by the full-screen gate and the settings
/// sheet so the validation rules and error handling exist in exactly one place.
class AuthForm extends ConsumerStatefulWidget {
  /// Called after a verified sign-in. The two hosts do different things —
  /// the sheet pops itself, the gate lets its provider swap the screen.
  final VoidCallback? onSuccess;

  /// Rendered under the buttons. The gate puts "continue as guest" here.
  final Widget? footer;

  const AuthForm({super.key, this.onSuccess, this.footer});

  @override
  ConsumerState<AuthForm> createState() => _AuthFormState();
}

class _AuthFormState extends ConsumerState<AuthForm> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _isSignUp = false;
  bool _loading = false;
  bool _obscurePassword = true;

  /// Shown inline above the button. A SnackBar was losing the message behind
  /// the sheet, so failures looked like the button simply did nothing.
  String? _error;

  /// Firebase's own minimum, checked here so the common mistake costs no round
  /// trip.
  static const _minPasswordLength = 6;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  /// Deliberately permissive — `a@b.c` is a valid address. This only catches
  /// obvious typos; Firebase is the real authority.
  static bool _looksLikeEmail(String value) =>
      RegExp(r'^[^@\s]+@[^@\s.]+\.[^@\s]+$').hasMatch(value);

  String? _validate(String name, String email, String password) {
    if (email.isEmpty) return 'اكتب البريد الإلكتروني.';
    if (!_looksLikeEmail(email)) return 'صيغة البريد الإلكتروني غير صحيحة.';
    if (password.isEmpty) return 'اكتب كلمة السر.';
    if (_isSignUp) {
      if (name.isEmpty) return 'اكتب اسمك.';
      if (password.length < _minPasswordLength) {
        return 'كلمة السر لازم تكون $_minPasswordLength حروف أو أرقام على الأقل.';
      }
    }
    return null;
  }

  Future<void> _submit() async {
    final email = _emailController.text.trim();
    // Not trimmed: a password's leading and trailing spaces are part of it.
    final password = _passwordController.text;
    final name = _nameController.text.trim();

    final problem = _validate(name, email, password);
    if (problem != null) {
      setState(() => _error = problem);
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final notifier = ref.read(authProvider.notifier);
      if (_isSignUp) {
        await notifier.signUp(name: name, email: email, password: password);
      } else {
        await notifier.login(
          email: email,
          password: password,
          nameFallback: name.isNotEmpty ? name : null,
        );
      }
      if (mounted) widget.onSuccess?.call();
    } on AuthException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'حصل خطأ غير متوقع. جرّب تاني.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _google() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      await ref.read(authProvider.notifier).loginWithGoogle();
      if (mounted) widget.onSuccess?.call();
    } on AuthException catch (e) {
      // Backing out of the Google sheet is a choice, not an error, so it leaves
      // the form as it was rather than flashing a red banner.
      if (mounted && e.failure != AuthFailure.cancelled) {
        setState(() => _error = e.message);
      }
    } catch (_) {
      if (mounted) setState(() => _error = 'حصل خطأ غير متوقع. جرّب تاني.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final backendDown = !FirebaseAuthService.isAvailable;
    final disabled = _loading || backendDown;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Stated up front rather than after a failed attempt: with no Firebase
        // config on the build there is nothing to sign in to.
        if (backendDown) ...[
          AuthBanner(
            icon: Icons.cloud_off_rounded,
            text: AuthException.backendUnavailable.message,
          ),
          const SizedBox(height: 16),
        ],

        if (_isSignUp) ...[
          TextField(
            controller: _nameController,
            enabled: !disabled,
            textInputAction: TextInputAction.next,
            decoration: const InputDecoration(
              labelText: 'اسم المتداول',
              prefixIcon: Icon(Icons.person_outline),
            ),
          ),
          const SizedBox(height: 10),
        ],
        TextField(
          controller: _emailController,
          enabled: !disabled,
          keyboardType: TextInputType.emailAddress,
          autocorrect: false,
          textDirection: TextDirection.ltr,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            labelText: 'البريد الإلكتروني',
            prefixIcon: Icon(Icons.email_outlined),
          ),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _passwordController,
          enabled: !disabled,
          obscureText: _obscurePassword,
          autocorrect: false,
          enableSuggestions: false,
          textDirection: TextDirection.ltr,
          textInputAction: TextInputAction.done,
          onSubmitted: (_) {
            if (!disabled) _submit();
          },
          decoration: InputDecoration(
            labelText: 'كلمة السر',
            prefixIcon: const Icon(Icons.lock_outline),
            helperText: _isSignUp
                ? '$_minPasswordLength حروف أو أرقام على الأقل'
                : null,
            suffixIcon: IconButton(
              icon: Icon(
                _obscurePassword
                    ? Icons.visibility_outlined
                    : Icons.visibility_off_outlined,
              ),
              tooltip: _obscurePassword ? 'إظهار كلمة السر' : 'إخفاء كلمة السر',
              onPressed: () =>
                  setState(() => _obscurePassword = !_obscurePassword),
            ),
          ),
        ),

        if (_error != null) ...[
          const SizedBox(height: 14),
          AuthBanner(icon: Icons.error_outline_rounded, text: _error!),
        ],

        const SizedBox(height: 20),
        FilledButton(
          onPressed: disabled ? null : _submit,
          child: _loading
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Text(_isSignUp ? 'إنشاء الحساب' : 'تسجيل الدخول'),
        ),

        const SizedBox(height: 12),
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
          onPressed: disabled ? null : _google,
          icon: const Icon(Icons.g_mobiledata_rounded, size: 28),
          label: const Text('المتابعة بحساب جوجل'),
        ),

        const SizedBox(height: 16),
        // The switch is a PANEL, not a line of text.
        //
        // It used to be a bare TextButton in body colour, sitting under a
        // Google button that outranked it visually — so the single most
        // important action for a first-time visitor, the one that creates the
        // account the whole app now requires, was the quietest thing on the
        // screen. It gets its own tinted field and a coloured verb here.
        //
        // The tint is `secondaryContainer`, not the brand: the brand fill
        // belongs to the primary button directly above, and repeating it would
        // give the screen two things claiming to be the main action.
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: theme.colorScheme.secondaryContainer,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Flexible(
                child: Text(
                  _isSignUp ? 'لديك حساب بالفعل؟' : 'ليس لديك حساب؟',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSecondaryContainer,
                  ),
                ),
              ),
              TextButton(
                onPressed: _loading
                    ? null
                    : () => setState(() {
                        _isSignUp = !_isSignUp;
                        // The old error belongs to the other mode's rules.
                        _error = null;
                      }),
                style: TextButton.styleFrom(
                  // The palette's readable ink. `primary` is the lime fill and
                  // measures 1.15:1 as text — the generator's contrast gate
                  // exists to catch exactly this, and ColorScheme.primary is
                  // bound to `accent` for the same reason.
                  foregroundColor: theme.colorScheme.primary,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  minimumSize: const Size(0, 40),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: Text(
                  _isSignUp ? 'سجّل الدخول' : 'أنشئ حساباً جديداً',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    decoration: TextDecoration.underline,
                  ),
                ),
              ),
            ],
          ),
        ),

        ?widget.footer,
      ],
    );
  }
}

/// Soft error/notice strip used by the auth surfaces.
class AuthBanner extends StatelessWidget {
  final IconData icon;
  final String text;

  const AuthBanner({super.key, required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: theme.colorScheme.errorContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: theme.colorScheme.error),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onErrorContainer,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
