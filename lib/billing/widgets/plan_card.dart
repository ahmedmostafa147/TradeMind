import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/formatters.dart';
import '../billing_providers.dart';
import '../entitlements.dart';

/// «باقتك» in الإعدادات — the app's counterpart of the web's `PlanCard`.
///
/// The app had NOTHING here. The plan was visible only through [TrialBanner],
/// which stays silent for the first nine days, or by walking into a paywall.
/// So a user could not answer «أنا على أنهي باقة» or «التجربة بتخلص إمتى»
/// without hitting a locked screen first, while the browser answered both in
/// the settings tab.
class PlanCard extends ConsumerWidget {
  const PlanCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final entitlement = ref.watch(entitlementProvider);
    // `maybeWhen`, not a value getter: while the probe is in flight there is
    // nothing to report, and flashing the failure card at every launch would
    // train the owner to ignore it.
    final readable = ref
        .watch(billingReadableProvider)
        .maybeWhen(data: (value) => value, orElse: () => null);

    // The one state worth interrupting for: the document cannot be read, so
    // this account — and every other — is being treated as free by a fallback
    // rather than by a decision. See billingReadableProvider.
    if (readable == false) {
      return _Card(
        color: theme.colorScheme.errorContainer,
        onColor: theme.colorScheme.onErrorContainer,
        title: 'مش قادرين نقرا حالة اشتراكك',
        body:
            'الحساب شغّال عادي والدفتر بيتزامن، بس بيانات الباقة مترفوضة من '
            'السيرفر — فالتطبيق بيعاملك كباقة مجانية مؤقتًا، والتجربة ما بدأتش.\n\n'
            'ده بيحصل لما قواعد Firestore ما تكونش اتنشرت. لو انت المالك: '
            'شغّل «firebase deploy --only firestore:rules».',
      );
    }

    final (title, body) = _copy(entitlement);

    return _Card(
      color: theme.colorScheme.surfaceContainerHigh,
      onColor: theme.colorScheme.onSurface,
      title: title,
      body: body,
    );
  }

  (String, String) _copy(Entitlement entitlement) {
    const paid =
        'المدفوع: السوق · أسعار الإغلاق للمراكز المفتوحة · التحليل بالـAI · '
        'الأداء والتحليلات. الدفتر والحاسبات مجانية للأبد.';

    switch (entitlement.plan) {
      case Plan.trial:
        final left = entitlement.trialDaysLeft;
        final when = left == null
            ? 'التجربة شغّالة'
            : left <= 0
                ? 'التجربة خلصت'
                : 'باقي ${quantity(left)} ${_dayWord(left)} في التجربة';
        return ('التجربة المجانية · $when', paid);
      case Plan.pro:
        return (
          'Radar Pro',
          'كل المميزات مفتوحة. $paid',
        );
      case Plan.free:
        return (
          'الباقة المجانية',
          'التجربة خلصت. $paid\n\n'
              'الاشتراك بيتم يدوي دلوقتي: ابعتلنا من الموقع أو على بريد '
              'التواصل، وأول ما تدفع بنفعّله على حسابك — وهيتفتح هنا وعلى '
              'الموقع بنفس الحساب على طول.',
        );
    }
  }

  /// ١ يوم · ٢ يومين · ٣-١٠ أيام · ١١+ يوم — same shape as `monthsLabel`.
  static String _dayWord(int days) => switch (days) {
    1 => 'يوم',
    2 => 'يومين',
    <= 10 => 'أيام',
    _ => 'يوم',
  };
}

class _Card extends StatelessWidget {
  final Color color;
  final Color onColor;
  final String title;
  final String body;

  const _Card({
    required this.color,
    required this.onColor,
    required this.title,
    required this.body,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: EdgeInsets.zero,
      color: color,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
                color: onColor,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              body,
              style: theme.textTheme.bodySmall?.copyWith(
                color: onColor,
                height: 1.6,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
