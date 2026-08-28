import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/formatters.dart';
import '../cubit/billing_cubit.dart';
import '../entitlements.dart';

/// «باقتك» in الإعدادات — the app's counterpart of the web's `PlanCard`.
///
/// The app had NOTHING here. The plan was visible only through [TrialBanner],
/// which stays silent for the first nine days, or by walking into a paywall.
/// So a user could not answer «أنا على أنهي باقة» or «التجربة بتخلص إمتى»
/// without hitting a locked screen first, while the browser answered both in
/// the settings tab.
class PlanCard extends StatelessWidget {
  const PlanCard({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final billing = context.watch<BillingCubit>().state;
    final entitlement = billing.entitlement;
    // Null while the read is in flight — the base state answers that way on
    // purpose, because flashing the failure card at every launch would train
    // the owner to ignore it.
    final readable = billing.readable;

    // The one state worth interrupting for: the document cannot be read, so
    // this account — and every other — is being treated as free by a fallback
    // rather than by a decision. See BillingCubit.
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

    // NOTHING IS LOCKED, SO THERE IS NO TIER TO REPORT. The paid copy below is
    // intact and returns the moment [kEverythingFree] flips. The red
    // unreadable-subscription card above still runs first, because a denied read
    // is worth surfacing whether or not anything is being sold — it means the
    // rules are unpublished.
    if (kEverythingFree) {
      return _Card(
        color: theme.colorScheme.surfaceContainerHigh,
        onColor: theme.colorScheme.onSurface,
        title: 'كل المميزات مفتوحة',
        body:
            'رادار مجاني بالكامل دلوقتي — من غير اشتراك ومن غير بطاقة. '
            'السوق وأسعار الإغلاق والتحليل بالـAI والأداء، كلها شغّالة.',
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
      // ── NO PURCHASE DIRECTION, AND NO PLAN NAME. ──────────────────────────
      //
      // The free case used to end with «ابعتلنا من الموقع أو على بريد التواصل،
      // وأول ما تدفع بنفعّله على حسابك». Google Play requires every in-app
      // purchase of digital content to go through Play Billing, and that
      // sentence is a textbook instruction to pay outside it — grounds for
      // rejection whether or not a button is attached, because the policy is
      // about DIRECTING the user.
      //
      // «Radar Pro» went for the same reason: a plan name is a product being
      // sold, and naming it advertises a purchase the app may not transact.
      // What is left describes the ACCOUNT'S STATE, which is what somebody
      // opening الإعدادات came here to read. Selling happens on the website,
      // where the policy does not reach and where the user can actually act.
      //
      // test/play_billing_copy_test.dart reads this file to keep it that way.
      case Plan.pro:
        return ('الباقة المدفوعة', 'كل المميزات مفتوحة. $paid');
      case Plan.free:
        return ('الباقة المجانية', 'التجربة خلصت. $paid');
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
