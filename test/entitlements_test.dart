import 'package:flutter_test/flutter_test.dart';

import 'package:egx_trade_journal/billing/entitlements.dart';

void main() {
  final now = DateTime(2026, 8, 6, 12);

  Entitlement of({String? plan, DateTime? started, DateTime? until}) =>
      entitlementOf(
        storedPlan: plan,
        trialStartedAt: started,
        proUntil: until,
        now: now,
      );

  group('no subscription at all', () {
    test('a missing document is free, not a trial', () {
      // The trial has to be GRANTED — by a write the server timestamps. An
      // absent document meaning "trial" would hand full access to anyone who
      // simply never created one.
      final e = of();
      expect(e.plan, Plan.free);
      expect(e.hasFullAccess, isFalse);
      expect(e.trialExpired, isFalse);
    });

    test('an unknown plan string is free', () {
      expect(of(plan: 'platinum', started: now).plan, Plan.free);
    });

    test('a trial row with no start date is free', () {
      expect(of(plan: 'trial').plan, Plan.free);
    });
  });

  group('trial', () {
    test('the day it starts, the full length is left', () {
      final e = of(plan: 'trial', started: now);
      expect(e.plan, Plan.trial);
      expect(e.hasFullAccess, isTrue);
      expect(e.trialDaysLeft, kTrialDays);
    });

    test('counts down', () {
      final e = of(
        plan: 'trial',
        started: now.subtract(const Duration(days: 10)),
      );
      expect(e.trialDaysLeft, 4);
    });

    test('a few hours left still reads as one day, not zero', () {
      // «باقي 0 يوم» on a trial that still works is a lie in the alarming
      // direction, so the last partial day rounds up.
      final e = of(
        plan: 'trial',
        started: now.subtract(const Duration(days: 13, hours: 20)),
      );
      expect(e.plan, Plan.trial);
      expect(e.trialDaysLeft, 1);
    });

    test('the moment it expires, access stops', () {
      final e = of(
        plan: 'trial',
        started: now.subtract(const Duration(days: kTrialDays)),
      );
      expect(e.plan, Plan.free);
      expect(e.hasFullAccess, isFalse);
      expect(e.trialExpired, isTrue);
      expect(e.trialDaysLeft, 0);
    });

    test('long expired is still just expired', () {
      final e = of(
        plan: 'trial',
        started: now.subtract(const Duration(days: 400)),
      );
      expect(e.trialExpired, isTrue);
      expect(e.hasFullAccess, isFalse);
    });

    test('a start date in the future does not extend anything past the length', () {
      // Cannot happen through the rules — `trialStartedAt == request.time` —
      // but a clock-skewed read must not produce a hundred-day trial.
      final e = of(
        plan: 'trial',
        started: now.add(const Duration(days: 3)),
      );
      expect(e.plan, Plan.trial);
      expect(e.trialDaysLeft, kTrialDays + 3);
    });

    test('warns only near the end', () {
      expect(of(plan: 'trial', started: now).shouldWarnAboutTrial, isFalse);
      expect(
        of(
          plan: 'trial',
          started: now.subtract(const Duration(days: 12)),
        ).shouldWarnAboutTrial,
        isTrue,
      );
    });
  });

  group('pro', () {
    test('with no end date is open-ended, not expired', () {
      // The only writer of that field is an admin activating a payment.
      // Reading its absence as "lapsed" would lock out the customer who just
      // paid.
      final e = of(plan: 'pro', started: now);
      expect(e.plan, Plan.pro);
      expect(e.hasFullAccess, isTrue);
    });

    test('current until its end date', () {
      final e = of(
        plan: 'pro',
        started: now,
        until: now.add(const Duration(days: 1)),
      );
      expect(e.plan, Plan.pro);
      expect(e.hasFullAccess, isTrue);
    });

    test('lapsed drops to free', () {
      final e = of(
        plan: 'pro',
        started: now,
        until: now.subtract(const Duration(days: 1)),
      );
      expect(e.plan, Plan.free);
      expect(e.hasFullAccess, isFalse);
    });

    test('a lapsed subscriber is never told their TRIAL ended', () {
      // They were a paying customer; "انتهت تجربتك" is both wrong and rude.
      final e = of(
        plan: 'pro',
        started: now.subtract(const Duration(days: 400)),
        until: now.subtract(const Duration(days: 1)),
      );
      expect(e.trialExpired, isFalse);
      expect(e.trialDaysLeft, isNull);
    });

    test('pro outranks an expired trial on the same document', () {
      final e = of(
        plan: 'pro',
        started: now.subtract(const Duration(days: 90)),
      );
      expect(e.hasFullAccess, isTrue);
    });
  });

  group('features', () {
    test('the trial opens every paid surface — that is what a trial is', () {
      final e = of(plan: 'trial', started: now);
      for (final f in Feature.values) {
        expect(e.can(f), isTrue, reason: f.name);
      }
    });

    test('free opens none of them', () {
      for (final f in Feature.values) {
        expect(Entitlement.free.can(f), isFalse, reason: f.name);
      }
    });

    test('recording trades is not among the gated features', () {
      // A journal that stops letting you write in it is not a limited plan.
      // If this ever needs changing, the free plan's published promise
      // («تسجيل ومتابعة الصفقات الأساسية») has to change first.
      expect(Feature.values.length, 4);
      expect(
        Feature.values.map((f) => f.name).toSet(),
        {'marketFlows', 'livePrices', 'aiReader', 'analytics'},
      );
    });
  });

  test('trialEndsAt is the start plus the constant', () {
    expect(
      trialEndsAt(DateTime(2026, 8, 1)),
      DateTime(2026, 8, 1).add(const Duration(days: kTrialDays)),
    );
    expect(trialEndsAt(null), isNull);
  });
}
