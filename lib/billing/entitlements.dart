/// Who is allowed to use what.
///
/// PURE — no Firebase, no Hive, no Flutter. It takes the stored subscription
/// fields and a clock and returns an answer, which is what lets every branch be
/// unit-tested and what lets `site/lib/subscription.ts` be a faithful mirror.
///
/// **THIS DECIDES THE SHAPE OF THE UI AND NOTHING ELSE.** The gate that matters
/// is in firestore.rules: a user cannot write their own plan, and the trial's
/// start is stamped by the server. Anything here could be patched out of a
/// downloaded APK in an afternoon; that would reveal a locked panel and grant
/// nothing, because the data behind the paid surfaces is either fetched from
/// our own routes or read under rules the client does not control.
library;

/// What the account is on.
enum Plan {
  /// The fourteen days everybody gets at sign-up. Full access.
  trial,

  /// Paid and current.
  pro,

  /// Never paid, or paid and lapsed. The journal still works.
  free,
}

/// The trial's length, in days.
///
/// NOT STORED WITH THE SUBSCRIPTION — deliberately. The document holds only the
/// server-stamped start, because there is no Firestore sentinel for "server
/// time plus fourteen days", so an end date would have to come from the
/// device's clock and could be edited. Both clients derive the end from this
/// constant, so it must stay identical to TRIAL_DAYS in subscription.ts.
const int kTrialDays = 14;

/// ── EVERY PAID SURFACE IS OPEN. ONE SWITCH, AND IT IS THIS ONE. ─────────────
///
/// Set false to bring the paid tier back. NOTHING WAS DELETED to do this: the
/// plans, the trial arithmetic, [Feature], the admin activation flow and every
/// test over them are intact and still correct, because this is a PAUSE and not
/// a reversal. The owner said outright that the paid tier is coming back.
///
/// WHY IT IS PAUSED (owner's call, 12 أغسطس):
///   - Three of the four paid surfaces cannot be enforced on a server at all.
///     [Feature.analytics] is computed on this device from the user's own
///     trades; [Feature.aiReader] runs on the user's own Gemini key and bills
///     them, not us; and `/api/quote` takes no credential today. Only
///     [Feature.marketFlows] has a rule behind it. A paywall over three things a
///     determined user simply switches off inconveniences honest customers and
///     stops nobody.
///   - There is no payment mechanism — activation is an admin typing into a
///     dialog after a bank transfer.
///   - ~~There are zero users. The scarce thing is people, not revenue.~~
///     NO LONGER TRUE — Radar launched 30 أغسطس 2026 and has real users
///     (`publicStats/counts` publishes how many; /admin computes it). This
///     reason is spent, and it is struck through rather than deleted because a
///     decision's reasons are also its expiry conditions: seeing which ones
///     lapsed is how you know whether the decision still holds.
///
///     THE OTHER THREE STAND UNCHANGED, and they are the ones that were ever
///     load-bearing. A paywall over three surfaces that cannot be enforced
///     still stops nobody, and there is still no way to take money.
///   - And on Android, no paid tier means no Play Billing question at all.
///
/// `EVERYTHING_FREE` in site/lib/subscription.ts is the mirror of this and MUST
/// flip at the same time. `firestore.rules` is the THIRD copy — `marketFlows`
/// read is gated on `hasActivePlan()` there, and flipping only the clients would
/// open the panel on screen while the server refuses the read, which shows up as
/// an empty market with no error at all. All three move together.
const bool kEverythingFree = true;

/// The paid surfaces, one entry per thing the pricing page sells.
enum Feature {
  /// «تتبّع سيولة المستثمرين» — the EGX investor-flow tables.
  marketFlows,

  /// Last-close prices, and the unrealised profit computed from them.
  livePrices,

  /// «قراءة التوصيات بالذكاء الاصطناعي».
  aiReader,

  /// «الأداء» and «التحليلات» — the computed performance screens.
  ///
  /// Recording and reviewing trades is NOT here and never will be: the free
  /// plan promises «تسجيل ومتابعة الصفقات الأساسية», and a journal that stops
  /// letting you write in it is not a limited plan, it is a hostage note.
  analytics,
}

/// What an account may currently do.
class Entitlement {
  final Plan plan;

  /// Whole days remaining in the trial, floored at zero. Null off the trial.
  final int? trialDaysLeft;

  /// True when the trial has run out and nothing was bought.
  final bool trialExpired;

  const Entitlement({
    required this.plan,
    this.trialDaysLeft,
    this.trialExpired = false,
  });

  /// Everything the paid plan opens. The trial IS full access — that is what a
  /// trial is, and gating it would make the fourteen days worthless as an
  /// evaluation.
  bool get hasFullAccess => plan == Plan.trial || plan == Plan.pro;

  /// ── EVERYTHING IS FREE RIGHT NOW. See [kEverythingFree]. ──────────────────
  bool can(Feature feature) => kEverythingFree || hasFullAccess;

  /// Worth showing a countdown for. A trial with a fortnight left is not news;
  /// one with three days is.
  bool get shouldWarnAboutTrial =>
      plan == Plan.trial && (trialDaysLeft ?? 99) <= 5;

  static const Entitlement free = Entitlement(plan: Plan.free);
}

/// Reads the stored subscription into an answer.
///
/// [trialStartedAt] is the server-stamped creation time. [proUntil] is null for
/// a subscription with no end recorded, which is treated as OPEN-ENDED rather
/// than expired: the only way that field is written is by an admin activating a
/// payment, and reading their omission as "already lapsed" would lock out the
/// customer who just paid.
Entitlement entitlementOf({
  required String? storedPlan,
  required DateTime? trialStartedAt,
  required DateTime? proUntil,
  required DateTime now,
}) {
  if (storedPlan == 'pro') {
    if (proUntil == null || proUntil.isAfter(now)) {
      return const Entitlement(plan: Plan.pro);
    }
    // Paid once, lapsed since. Not a trial — that was spent long ago — so no
    // countdown and no "your trial ended" message for somebody who was a
    // paying customer.
    return const Entitlement(plan: Plan.free);
  }

  if (storedPlan == 'trial' && trialStartedAt != null) {
    final endsAt = trialStartedAt.add(const Duration(days: kTrialDays));
    if (endsAt.isAfter(now)) {
      // Ceil, so the last partial day still reads as «باقي يوم» rather than
      // «باقي 0 يوم» while the trial is genuinely still live.
      final remaining = endsAt.difference(now);
      final days = (remaining.inSeconds / Duration.secondsPerDay).ceil();
      return Entitlement(
        plan: Plan.trial,
        trialDaysLeft: days < 0 ? 0 : days,
      );
    }
    return const Entitlement(
      plan: Plan.free,
      trialDaysLeft: 0,
      trialExpired: true,
    );
  }

  // No document yet, an unknown plan string, or a trial row with no start date
  // — all of which mean "nothing has been granted", which is free.
  return Entitlement.free;
}

/// When the trial ends, for display. Null when the account is not on one.
DateTime? trialEndsAt(DateTime? trialStartedAt) =>
    trialStartedAt?.add(const Duration(days: kTrialDays));
