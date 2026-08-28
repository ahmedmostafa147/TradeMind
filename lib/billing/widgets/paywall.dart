import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../cubit/billing_cubit.dart';

/// What an account without full access sees where a paid surface would be.
///
/// ── THE APP NEVER MENTIONS MONEY. NOT A PRICE, NOT A PLAN NAME, NOT A WAY TO
///    PAY, NOT A LINK TO ONE. ───────────────────────────────────────────────
///
/// There was a card here that read «الاشتراك بيتم يدوي دلوقتي: ابعتلنا من الموقع
/// أو على بريد التواصل، وأول ما تدفع بنفعّله على حسابك». Google Play requires
/// every in-app purchase of digital content to go through Play Billing, and that
/// sentence is a textbook instruction to pay outside it — an emailed transfer for
/// a subscription the app then unlocks. It is grounds for rejection or removal
/// whether or not a button is attached, because the policy is about DIRECTING the
/// user, and directing was the entire purpose of the card.
///
/// «رادار Pro» went with it. A plan name is a product being sold; naming it here
/// is advertising a purchase the app is not allowed to transact.
///
/// So the lock states the surface and the reason, and stops. Selling happens on
/// the website, where Play's policy does not reach and where the user can
/// actually act — they arrive there through their own account, not through a
/// prompt shipped in an APK.
///
/// It still NAMES the surface it stands in front of rather than showing one
/// generic wall everywhere: "you cannot see this" is not information, and a user
/// who forgot which of four things they were reaching for learns nothing from an
/// unlabelled lock.
class Paywall extends StatelessWidget {
  final String title;

  /// One line on what this particular surface does.
  final String what;

  const Paywall({super.key, required this.title, required this.what});

  /// The ONE phrase used for every locked surface in the app.
  ///
  /// «باقة» is a plan, not a price — it says why the screen is empty without
  /// advertising anything. Four different wordings for one state is how «محتاج
  /// اشتراك» and «من مميزات رادار Pro» ended up on the same screen.
  static const String lockedLabel = 'مش متاح في باقتك الحالية';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final entitlement = context.watch<BillingCubit>().state.entitlement;

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
              // The reassurance is the one thing worth keeping from the old
              // copy: somebody whose access just narrowed needs to know their
              // records did not. It says nothing about buying anything.
              entitlement.trialExpired
                  ? '$lockedLabel — ودفترك وصفقاتك زي ما هي ومفتوحة.'
                  : lockedLabel,
              style: theme.textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
