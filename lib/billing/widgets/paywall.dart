import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/formatters.dart';
import '../billing_providers.dart';
import '../entitlements.dart';

/// What a free account sees where a paid surface would be.
///
/// It names the surface it is standing in front of rather than showing one
/// generic wall everywhere: "you cannot see this" is not information, and a
/// user who forgot which of four things they were reaching for learns nothing
/// from an unlabelled lock.
class Paywall extends ConsumerWidget {
  final String title;

  /// One line on what this particular surface does.
  final String what;

  const Paywall({super.key, required this.title, required this.what});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final entitlement = ref.watch(entitlementProvider);

    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 96),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.lock_outline_rounded,
              size: 36,
              color: theme.colorScheme.outline,
            ),
            const SizedBox(height: 16),
            Text(
              title,
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              what,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Text(
              entitlement.trialExpired
                  ? 'تجربتك المجانية خلصت. دفترك وصفقاتك زي ما هي ومفتوحة — '
                        'اللي اتقفل هو الأدوات دي بس.'
                  : 'دي من مميزات رادار Pro.',
              style: theme.textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            // NO BUY BUTTON, because nothing here can take money yet.
            //
            // A button that opens a checkout that does not exist is worse than
            // no button, and on Android a purchase for a digital subscription
            // has to go through Play Billing — which is not wired up. Saying
            // so is the honest state of the feature.
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  'الاشتراك لسه مش متاح من التطبيق. كلّمنا وهنفعّله على حسابك، '
                  'وهيتفتح هنا وعلى الموقع على طول.',
                  style: theme.textTheme.bodySmall,
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// The countdown, and afterwards the notice.
///
/// Silent for the first nine days: a banner that says «باقي 14 يوم» on day one
/// is a nag, and a bar that is always there stops being read by the time it
/// says something that matters.
class TrialBanner extends ConsumerWidget {
  const TrialBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final entitlement = ref.watch(entitlementProvider);

    if (entitlement.plan == Plan.pro) return const SizedBox.shrink();

    final String message;
    if (entitlement.trialExpired) {
      message = 'تجربتك خلصت — الدفتر والحاسبات شغّالين زي ما هما.';
    } else if (entitlement.shouldWarnAboutTrial) {
      final days = entitlement.trialDaysLeft ?? 0;
      message = 'باقي ${quantity(days)} '
          '${days == 1 ? 'يوم' : days == 2 ? 'يومين' : 'أيام'} في تجربتك المجانية.';
    } else {
      return const SizedBox.shrink();
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      color: theme.colorScheme.surfaceContainerHigh,
      child: Text(message, style: theme.textTheme.bodySmall),
    );
  }
}
