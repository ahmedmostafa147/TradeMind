import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/auth/providers/auth_providers.dart';
import '../features/sync/services/firestore_sync_service.dart';
import 'entitlements.dart';

/// The account's subscription, and the trial it grants on first sight.
///
/// THE TRIAL STARTS ITSELF, ONCE. There is no server to do it at sign-up — this
/// project has no service account by design — so the client asks and the RULES
/// decide whether the ask is honest: the create is accepted only when the
/// document does not exist, the plan is exactly `trial`, and `trialStartedAt`
/// equals the server's own clock. A tampered build asking again gets nothing it
/// did not already have.
class BillingController extends AsyncNotifier<Entitlement> {
  @override
  Future<Entitlement> build() async {
    final user = ref.watch(authProvider);

    // Same guard the sync controller carries, and for the same reason: without
    // a Firebase app there is no document to read, and every call below would
    // return its own "nothing" after a pointless round trip. Under
    // `flutter test` this is always the case.
    if (!user.isLoggedIn || user.id == 'guest' || Firebase.apps.isEmpty) {
      return Entitlement.free;
    }

    var stored = await FirestoreSyncService.pullSubscription(user.id);

    if (stored == null) {
      await FirestoreSyncService.startTrial(user.id);
      // Read back rather than assuming the write landed: a denial means the
      // document already exists, and the truth is whatever is actually there.
      stored = await FirestoreSyncService.pullSubscription(user.id);
    }

    return _read(stored);
  }

  /// Re-reads after a payment is activated, so the user does not have to
  /// restart the app to see what they just bought.
  Future<void> refresh() async {
    final user = ref.read(authProvider);
    if (!user.isLoggedIn || user.id == 'guest' || Firebase.apps.isEmpty) return;
    state = const AsyncValue.loading();
    final stored = await FirestoreSyncService.pullSubscription(user.id);
    state = AsyncValue.data(_read(stored));
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

final billingProvider =
    AsyncNotifierProvider<BillingController, Entitlement>(
      BillingController.new,
    );

/// The entitlement, with a safe answer while the read is in flight.
///
/// **LOADING RESOLVES TO FULL ACCESS, NOT TO FREE.** Showing a paywall over a
/// paying customer's screen for the second it takes to read their subscription
/// is the one failure mode worth designing out; the reverse — a free user
/// seeing a paid panel for a moment before it locks — costs nothing, because
/// the data behind those panels is fetched under rules this flag does not
/// control.
final entitlementProvider = Provider<Entitlement>((ref) {
  return ref
      .watch(billingProvider)
      .maybeWhen(
        data: (entitlement) => entitlement,
        orElse: () => const Entitlement(plan: Plan.pro),
      );
});
