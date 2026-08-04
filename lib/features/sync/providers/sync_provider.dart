import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../settings/settings_providers.dart';
import '../../../trades/trade.dart';
import '../../../trades/trades_providers.dart';
import '../../../watchlist/watchlist_item.dart';
import '../../../watchlist/watchlist_providers.dart';
import '../../auth/providers/auth_providers.dart';
import '../services/firestore_sync_service.dart';

/// What the UI shows about the backup.
enum SyncState { idle, restoring, uploading, done, failed }

class SyncStatus {
  final SyncState state;

  /// How many records the last restore brought back. Shown once, so the user
  /// gets confirmation their data actually returned.
  final int restoredCount;

  final DateTime? lastSyncedAt;

  const SyncStatus({
    this.state = SyncState.idle,
    this.restoredCount = 0,
    this.lastSyncedAt,
  });

  SyncStatus copyWith({
    SyncState? state,
    int? restoredCount,
    DateTime? lastSyncedAt,
  }) => SyncStatus(
    state: state ?? this.state,
    restoredCount: restoredCount ?? this.restoredCount,
    lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
  );
}

/// Keeps the local journal and the cloud copy in step.
///
/// Two jobs, in this order:
///
/// 1. **Restore.** On sign-in, pull everything the account owns and add back
///    whatever is missing locally. This is the half that survives a reinstall.
/// 2. **Backup.** Push local changes up, debounced.
///
/// Restore is additive only — a remote record whose id already exists locally
/// is left alone, and nothing is ever deleted from the device. The cloud copy
/// is a safety net for the local journal, not an authority over it: letting the
/// server win would mean a failed or partial read could wipe real work.
class SyncController extends Notifier<SyncStatus> {
  Timer? _debounce;
  Timer? _settingsDebounce;

  /// Long enough to coalesce a burst of edits, short enough that closing the
  /// app right after a change still catches it.
  static const _debounceDelay = Duration(seconds: 3);

  @override
  SyncStatus build() {
    final user = ref.watch(authProvider);

    ref.onDispose(() {
      _debounce?.cancel();
      _settingsDebounce?.cancel();
    });

    if (!user.isLoggedIn || user.id == 'guest') {
      return const SyncStatus();
    }

    // Watching the lists here would rebuild this notifier — and restart the
    // restore — on every keystroke-driven change. `listen` reacts without
    // re-running build().
    ref.listen(tradesProvider, (_, _) => _scheduleUpload());
    ref.listen(watchlistProvider, (_, _) => _scheduleUpload());
    // A SEPARATE debounce, not _scheduleUpload. Routing settings through the
    // journal upload would make dragging the capital slider rewrite every trade
    // document the user owns — `uploadNow` pushes whole collections, so that is
    // one batched write per trade for a change to a three-field document that
    // no trade contains. Its own timer keeps the cost proportional.
    ref.listen(settingsProvider, (_, _) => _scheduleSettingsUpload());

    // Kicked off after build() returns: mutating state during build throws.
    Future.microtask(() => restore());

    return const SyncStatus();
  }

  String get _userId => ref.read(authProvider).id;

  /// Pulls the account's records and adds back anything absent locally.
  Future<void> restore() async {
    final userId = _userId;
    if (userId.isEmpty || userId == 'guest') return;

    state = state.copyWith(state: SyncState.restoring);

    try {
      final remoteTrades = await FirestoreSyncService.pullTrades(userId);
      final remoteWatchlist = await FirestoreSyncService.pullWatchlist(userId);

      // Settings first: every figure the restored trades produce is computed
      // against capital, so adopting it after the trades would render one
      // screenful of numbers under the old rule before they resettled.
      final remoteSettings = await FirestoreSyncService.pullRiskSettings(
        userId,
        current: ref.read(settingsProvider),
      );
      await ref.read(settingsProvider.notifier).adoptRemote(remoteSettings);

      final tradesNotifier = ref.read(tradesProvider.notifier);
      final localTradeIds = {
        for (final t in ref.read(tradesProvider)) t.id,
      };
      final missingTrades = <Trade>[
        for (final t in remoteTrades)
          if (!localTradeIds.contains(t.id)) t,
      ];
      for (final trade in missingTrades) {
        await tradesNotifier.add(trade);
      }

      final watchlistNotifier = ref.read(watchlistProvider.notifier);
      final localItemIds = {
        for (final w in ref.read(watchlistProvider)) w.id,
      };
      final missingItems = <WatchlistItem>[
        for (final w in remoteWatchlist)
          if (!localItemIds.contains(w.id)) w,
      ];
      for (final item in missingItems) {
        await watchlistNotifier.add(item);
      }

      state = SyncStatus(
        state: SyncState.done,
        restoredCount: missingTrades.length + missingItems.length,
        lastSyncedAt: DateTime.now(),
      );

      // Anything held locally but not yet in the cloud goes up now, so a
      // guest-then-sign-up journey backs up its existing journal.
      await uploadNow();
    } catch (_) {
      state = state.copyWith(state: SyncState.failed);
    }
  }

  void _scheduleUpload() {
    _debounce?.cancel();
    _debounce = Timer(_debounceDelay, uploadNow);
  }

  void _scheduleSettingsUpload() {
    _settingsDebounce?.cancel();
    _settingsDebounce = Timer(_debounceDelay, () async {
      final userId = _userId;
      if (userId.isEmpty || userId == 'guest') return;
      await FirestoreSyncService.pushRiskSettings(
        userId,
        ref.read(settingsProvider),
      );
    });
  }

  /// Pushes the whole journal. Whole-collection rather than per-record because
  /// the notifiers publish a new list on every change without saying which
  /// record moved; the batched write keeps that to one request.
  Future<void> uploadNow() async {
    final userId = _userId;
    if (userId.isEmpty || userId == 'guest') return;

    state = state.copyWith(state: SyncState.uploading);
    try {
      await FirestoreSyncService.pushTrades(userId, ref.read(tradesProvider));
      await FirestoreSyncService.pushWatchlist(
        userId,
        ref.read(watchlistProvider),
      );
      await FirestoreSyncService.pushRiskSettings(
        userId,
        ref.read(settingsProvider),
      );
      state = state.copyWith(
        state: SyncState.done,
        lastSyncedAt: DateTime.now(),
      );
    } catch (_) {
      state = state.copyWith(state: SyncState.failed);
    }
  }
}

final syncControllerProvider = NotifierProvider<SyncController, SyncStatus>(
  SyncController.new,
);
