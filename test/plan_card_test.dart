import 'package:egx_trade_journal/billing/billing_providers.dart';
import 'package:egx_trade_journal/billing/entitlements.dart';
import 'package:egx_trade_journal/billing/widgets/plan_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

/// «باقتك» in الإعدادات. The app had nothing here at all, so the only way to
/// learn which plan you were on was to walk into a paywall.
void main() {
  Future<void> pumpCard(
    WidgetTester tester, {
    required Entitlement entitlement,
    bool? readable = true,
  }) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          entitlementProvider.overrideWithValue(entitlement),
          billingReadableProvider.overrideWith((ref) async => readable),
        ],
        child: const MaterialApp(
          home: Directionality(
            textDirection: TextDirection.rtl,
            child: Scaffold(body: SingleChildScrollView(child: PlanCard())),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('a running trial says how long is left', (tester) async {
    await pumpCard(
      tester,
      entitlement: const Entitlement(plan: Plan.trial, trialDaysLeft: 9),
    );

    expect(find.textContaining('التجربة المجانية'), findsOneWidget);
    expect(find.textContaining('باقي 9 أيام'), findsOneWidget);
  });

  testWidgets('Arabic counts its days properly', (tester) async {
    await pumpCard(
      tester,
      entitlement: const Entitlement(plan: Plan.trial, trialDaysLeft: 2),
    );
    expect(find.textContaining('باقي 2 يومين'), findsOneWidget);
  });

  testWidgets('a paid account is not asked to subscribe again', (tester) async {
    await pumpCard(tester, entitlement: const Entitlement(plan: Plan.pro));

    expect(find.text('Radar Pro'), findsOneWidget);
    expect(find.textContaining('الاشتراك بيتم يدوي'), findsNothing);
  });

  testWidgets('a lapsed account is told how to pay', (tester) async {
    await pumpCard(
      tester,
      entitlement: const Entitlement(plan: Plan.free, trialExpired: true),
    );

    expect(find.text('الباقة المجانية'), findsOneWidget);
    expect(find.textContaining('الاشتراك بيتم يدوي'), findsOneWidget);
  });

  /// THE FAILURE THIS CARD EXISTS FOR.
  ///
  /// A denied read and a fresh account both surface as "no document", and both
  /// resolve to `free`. If `firestore.rules` was never deployed the `billing`
  /// block does not exist, every account resolves to free, no trial ever
  /// starts, and all four paid surfaces lock themselves — with no error
  /// anywhere, because the denial is caught by design. The card names it.
  testWidgets('an unreadable subscription is reported, not shown as free', (
    tester,
  ) async {
    await pumpCard(
      tester,
      entitlement: Entitlement.free,
      readable: false,
    );

    expect(find.text('مش قادرين نقرا حالة اشتراكك'), findsOneWidget);
    expect(
      find.textContaining('firebase deploy --only firestore:rules'),
      findsOneWidget,
      reason: 'the fix belongs next to the symptom',
    );
    expect(find.text('الباقة المجانية'), findsNothing);
  });

  testWidgets('nothing is claimed while the probe is still running', (
    tester,
  ) async {
    // `readable == null` is "not applicable" — signed out, or no Firebase app.
    await pumpCard(tester, entitlement: Entitlement.free, readable: null);

    expect(find.text('مش قادرين نقرا حالة اشتراكك'), findsNothing);
    expect(find.text('الباقة المجانية'), findsOneWidget);
  });
}
