import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../features/sync/services/firestore_sync_service.dart';
import '../entitlements.dart';

/// The account's subscription, and the trial it grants on first sight.
///
/// THE TRIAL STARTS ITSELF, ONCE. There is no server to do it at sign-up — this
/// project has no service account by design — so the client asks and the RULES
/// decide whether the ask is honest: the create is accepted only when the
/// document does not exist, the plan is exactly `trial`, and `trialStartedAt`
/// equals the server's own clock. A tampered build asking again gets nothing it
/// did not already have.
sealed class BillingState {
  const BillingState();

  /// The entitlement to render against.
  ///
  /// **LOADING RESOLVES TO FULL ACCESS, NOT TO FREE.** Showing a paywall over a
  /// paying customer's screen for the second it takes to read their
  /// subscription is the one failure mode worth designing out; the reverse — a
  /// free user seeing a paid panel for a moment before it locks — costs
  /// nothing, because the data behind those panels is fetched under rules this
  /// flag does not control.
  Entitlement get entitlement => const Entitlement(plan: Plan.pro);

  /// True when the subscription document exists but cannot be READ; null when
  /// the question does not apply — signed out, or no Firebase app, as under
  /// `flutter test`.
  bool? get readable => null;
}

class BillingLoading extends BillingState {
  const BillingLoading();
}

class BillingLoaded extends BillingState {
  @override
  final Entitlement entitlement;

  @override
  final bool? readable;

  const BillingLoaded(this.entitlement, this.readable);
}

class BillingCubit extends Cubit<BillingState> {
  /// [initial] exists for widget tests, which have no Firebase app and would
  /// otherwise resolve every account to free — turning «الأداء» and
  /// «التحليلات» into paywalls in tests that are about neither. Left null in
  /// the app, where [followAccount] is the only thing that sets state.
  BillingCubit({BillingState? initial}) : super(initial ?? const BillingLoading());

  String? _userId;

  /// Points at an account and reads its subscription.
  ///
  /// A plain one-shot read, not a stream like the journal's: this document
  /// changes when the operator activates a payment — minutes to months apart —
  /// and holding a listener open on every install for that would be a standing
  /// cost for an event the user is told to expect by email anyway.
  Future<void> followAccount(String? userId) async {
    if (userId == _userId) return;
    _userId = userId;
    await _load(startTrialIfMissing: true);
  }

  /// Re-reads after a payment is activated, so the user does not have to
  /// restart the app to see what they just bought.
  Future<void> refresh() => _load(startTrialIfMissing: false);

  Future<void> _load({required bool startTrialIfMissing}) async {
    final userId = _userId;

    // The same guard the rest of the app carries: without a Firebase app there
    // is no document to read, and every call below would return its own
    // "nothing" after a pointless round trip.
    if (userId == null || userId.isEmpty || userId == 'guest' ||
        Firebase.apps.isEmpty) {
      emit(const BillingLoaded(Entitlement.free, null));
      return;
    }

    emit(const BillingLoading());

    var stored = await FirestoreSyncService.pullSubscription(userId);
    if (stored == null && startTrialIfMissing) {
      await FirestoreSyncService.startTrial(userId);
      // Read back rather than assuming the write landed: a denial means the
      // document already exists, and the truth is whatever is actually there.
      stored = await FirestoreSyncService.pullSubscription(userId);
    }

    // Asked separately because a denial and a fresh account both look like
    // «مفيش مستند» from pullSubscription, and the difference matters more than
    // anything else in this file: if `firestore.rules` was never deployed, the
    // `billing` block does not exist, the read falls to the default deny, and
    // EVERY account — new or old — resolves to free. No trial ever starts and
    // all four paid surfaces lock themselves on day one, without a single error
    // anywhere, because the denial is caught by design.
    final readable = await FirestoreSyncService.canReadSubscription(userId);

    if (isClosed) return;
    emit(BillingLoaded(_read(stored), readable));
  }

  Entitlement _read(Map<String, dynamic>? stored) {
    if (stored == null) return Entitlement.free;
    return entitlementOf(
      storedPlan: stored['plan'] as String?,
      trialStartedAt: _toDate(stored['trialStartedAt']),
      proUntil: _toDate(stored['proUntil']),
      now: DateTime.now(),
    );
  }

  /// Firestore hands back a Timestamp, which has `toDate()` but is not a type
  /// this file can name without importing cloud_firestore — and importing it
  /// here would drag the SDK into a layer that is otherwise pure.
  static DateTime? _toDate(Object? value) {
    if (value == null) return null;
    if (value is DateTime) return value;
    try {
      return (value as dynamic).toDate() as DateTime?;
    } catch (_) {
      return null;
    }
  }
}
