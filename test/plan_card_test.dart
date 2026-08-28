import 'package:egx_trade_journal/billing/cubit/billing_cubit.dart';
import 'package:egx_trade_journal/billing/entitlements.dart';
import 'package:egx_trade_journal/billing/widgets/plan_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';

/// «باقتك» in الإعدادات. The app had nothing here at all, so the only way to
/// learn which plan you were on was to walk into a paywall.
///
/// ── THE TIER TESTS ARE SKIPPED WHILE `kEverythingFree` IS ON, NOT DELETED. ──
///
/// The paid tier is paused (owner's call, 12 أغسطس) and the card reports «كل
/// المميزات مفتوحة» for every entitlement, so «باقي 9 أيام» has nothing to
/// assert against. Each one comes back with the switch — which is the point of
/// skipping rather than deleting.
///
/// TWO ARE NEVER SKIPPED, because they do not depend on the tier at all: the
/// unreadable-subscription card (an unpublished-rules diagnostic, useful whether
/// or not anything is sold) and the Play-copy guard.
void main() {
  // `testWidgets` takes a bool here, unlike `test`.
  const tieredOnly = kEverythingFree;

  Future<void> pumpCard(
    WidgetTester tester, {
    required Entitlement entitlement,
    bool? readable = true,
  }) async {
    await tester.pumpWidget(
      BlocProvider(
        create: (_) =>
            BillingCubit(initial: BillingLoaded(entitlement, readable)),
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
  }, skip: tieredOnly);

  testWidgets('Arabic counts its days properly', (tester) async {
    await pumpCard(
      tester,
      entitlement: const Entitlement(plan: Plan.trial, trialDaysLeft: 2),
    );
    expect(find.textContaining('باقي 2 يومين'), findsOneWidget);
  }, skip: tieredOnly);

  /// ── THESE TWO USED TO ASSERT THE OPPOSITE, AND THE OWNER OVERRULED IT. ────
  ///
  /// One was named «a lapsed account is told how to pay» and required the card to
  /// contain «الاشتراك بيتم يدوي» — i.e. it PINNED the instruction to pay us
  /// outside Play Billing. The other asserted the title «Radar Pro».
  ///
  /// Google Play requires in-app purchases of digital content to go through Play
  /// Billing, which this project has not integrated, so the app must not sell,
  /// price, or point at a way to pay. The owner's call (12 أغسطس) was to remove
  /// every trace of it from the app and keep selling on the website.
  ///
  /// A test that pins forbidden copy is worse than no test: it makes the next
  /// person who removes the copy think they broke something.
  testWidgets('a paid account is shown its state, not a product name', (
    tester,
  ) async {
    await pumpCard(tester, entitlement: const Entitlement(plan: Plan.pro));

    expect(find.text('الباقة المدفوعة'), findsOneWidget);
    expect(find.text('Radar Pro'), findsNothing);
    expect(find.textContaining('ابعتلنا'), findsNothing);
  }, skip: tieredOnly);

  testWidgets('a lapsed account is NOT told how to pay', (tester) async {
    await pumpCard(
      tester,
      entitlement: const Entitlement(plan: Plan.free, trialExpired: true),
    );

    expect(find.text('الباقة المجانية'), findsOneWidget);
    // What it still says: which surfaces are paid, and that the journal is free.
    expect(find.textContaining('الدفتر والحاسبات مجانية للأبد'), findsOneWidget);
    // What it must never say again.
    expect(find.textContaining('الاشتراك بيتم يدوي'), findsNothing);
    expect(find.textContaining('ابعتلنا'), findsNothing);
    expect(find.textContaining('تدفع'), findsNothing);
  }, skip: tieredOnly);

  /// THE PLAY GUARD, IN WHICHEVER MODE THE PRODUCT IS IN.
  ///
  /// Split from the test above so pausing the paid tier could not take the
  /// purchase-direction assertions with it. `play_billing_copy_test.dart` scans
  /// the source for the same words; this proves what actually reaches the screen.
  testWidgets('no card ever tells the user how to pay', (tester) async {
    for (final entitlement in const [
      Entitlement.free,
      Entitlement(plan: Plan.pro),
      Entitlement(plan: Plan.trial, trialDaysLeft: 3),
      Entitlement(plan: Plan.free, trialExpired: true),
    ]) {
      await pumpCard(tester, entitlement: entitlement);
      expect(find.textContaining('ابعتلنا'), findsNothing);
      expect(find.textContaining('الاشتراك بيتم'), findsNothing);
      expect(find.text('Radar Pro'), findsNothing);
      expect(find.textContaining('تدفع'), findsNothing);
    }
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

    // The POINT of this test is the red card's absence — the title beside it
    // depends on the tier, so it is not asserted here.
    expect(find.text('مش قادرين نقرا حالة اشتراكك'), findsNothing);
    expect(find.byType(PlanCard), findsOneWidget);
  });
}
