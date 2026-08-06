import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_ce/hive.dart';

import '../../../core/hive_keys.dart';

import '../../../settings/settings_providers.dart';
import '../../../trades/trades_providers.dart';
import '../../../watchlist/watchlist_providers.dart';
import '../../auth/providers/auth_providers.dart';
import '../services/firestore_sync_service.dart';
import '../services/sync_codec.dart';
import '../services/sync_merge.dart';

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
/// Restore is a THREE-WAY MERGE, not an additive pull.
///
/// It used to be additive: a remote record whose id already existed locally was
/// left alone. That kept the phone safe and made the two surfaces disagree
/// forever — a trade edited in the browser reached Firestore and then never
/// reached the phone at all, because the phone already had that id. Only brand
/// new records ever crossed, and only after a restart.
///
/// Now every id is decided against a recorded ancestor — what this device last
/// agreed with the cloud about — so an edit made on one surface can be told
/// apart from an edit made on the other. See sync_merge.dart for the rules and
/// for why no timestamp is involved. The safety property survives: when both
/// sides changed, the local copy wins and is pushed. Nothing is ever deleted
/// from the device.
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

    // NOTHING TO SYNC WITH, SO NOTHING IS STARTED.
    //
    // FirestoreSyncService already refuses every individual call without a
    // Firebase app, but refusing at the call was too late: build() still
    // attached three listeners, still ran restore(), and restore() still wrote
    // to `state`. Anything watching this notifier — HomeShell does — then
    // rebuilt, which scheduled a frame, and the listeners re-armed a
    // three-second debounce Timer. Under flutter_test's fake clock
    // pumpAndSettle advances time, fires that timer, gets another state write,
    // gets another frame, and never settles: every widget test that pumped the
    // shell hung until the harness gave up. auth_gate_test and acceptance_test
    // both did, which is why `flutter test` never finished.
    //
    // Guarding here is also the honest production behaviour. With no Firebase
    // there is no cloud to restore from or push to, so arming a repeating
    // upload timer was work that could never succeed.
    if (Firebase.apps.isEmpty) {
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

  /// The recorded ancestor for a collection: what this device last agreed with
  /// the cloud about, per record id.
  ///
  /// Missing box, missing key, or a value Hive cannot read back as a string map
  /// all mean the same thing — no memory — and the merge treats that as "keep
  /// local", which is the safe direction.
  Map<String, String> _ancestors(String key) {
    if (!Hive.isBoxOpen(kSyncStateBox)) return const {};
    final stored = Hive.box(kSyncStateBox).get(key);
    if (stored is! Map) return const {};
    return {
      for (final entry in stored.entries)
        if (entry.key is String && entry.value is String)
          entry.key as String: entry.value as String,
    };
  }

  Future<void> _rememberAncestors(String key, Map<String, String> value) async {
    if (!Hive.isBoxOpen(kSyncStateBox)) return;
    await Hive.box(kSyncStateBox).put(key, value);
  }

  /// Reconciles the account's records with this device's.
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

      // Both sides are fingerprinted through the SAME encoder — the remote
      // records after a decode/re-encode round trip — so only a real difference
      // in the record can register as one.
      final localTrades = ref.read(tradesProvider);
      final tradePlan = planSync(
        local: {
          for (final t in localTrades)
            t.id: fingerprint(SyncCodec.tradeToMap(t)),
        },
        lastSynced: _ancestors(kTradeFingerprintsKey),
        remote: {
          for (final t in remoteTrades)
            t.id: fingerprint(SyncCodec.tradeToMap(t)),
        },
      );

      final tradesNotifier = ref.read(tradesProvider.notifier);
      final remoteTradeById = {for (final t in remoteTrades) t.id: t};
      final localTradeIds = {for (final t in localTrades) t.id};
      var adoptedCount = 0;
      for (final id in tradePlan.adopt) {
        final trade = remoteTradeById[id];
        if (trade == null) continue;
        // `add` for something this device has never seen, `update` for a record
        // the browser changed — the notifier keys on id either way, but only
        // one of the two is a new row in the journal.
        if (localTradeIds.contains(id)) {
          await tradesNotifier.update(trade);
        } else {
          await tradesNotifier.add(trade);
          adoptedCount++;
        }
      }

      final localItems = ref.read(watchlistProvider);
      final watchPlan = planSync(
        local: {
          for (final w in localItems)
            w.id: fingerprint(SyncCodec.watchlistToMap(w)),
        },
        lastSynced: _ancestors(kWatchlistFingerprintsKey),
        remote: {
          for (final w in remoteWatchlist)
            w.id: fingerprint(SyncCodec.watchlistToMap(w)),
        },
      );

      final watchlistNotifier = ref.read(watchlistProvider.notifier);
      final remoteItemById = {for (final w in remoteWatchlist) w.id: w};
      final localItemIds = {for (final w in localItems) w.id};
      for (final id in watchPlan.adopt) {
        final item = remoteItemById[id];
        if (item == null) continue;
        if (localItemIds.contains(id)) {
          await watchlistNotifier.update(item);
        } else {
          await watchlistNotifier.add(item);
          adoptedCount++;
        }
      }

      state = SyncStatus(
        state: SyncState.done,
        restoredCount: adoptedCount,
        lastSyncedAt: DateTime.now(),
      );

      // Anything held locally but not yet in the cloud goes up now, so a
      // guest-then-sign-up journey backs up its existing journal — and so does
      // whichever side of a conflict the merge decided to keep.
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

  /// Pushes only what this device has actually changed.
  ///
  /// It used to push the WHOLE journal on every debounce — one batched write
  /// per trade, every three seconds after any keystroke that touched any trade,
  /// for records that had not moved. That was a straight multiplier on the
  /// Firestore bill, and worse, it stamped a fresh `updatedAt` on every
  /// document, which is what made the timestamp useless as a signal for who
  /// changed what.
  ///
  /// A successful write is also what ADVANCES THE ANCESTOR: the fingerprints
  /// are recorded only after the batch commits, so a failed upload leaves the
  /// merge believing the cloud still holds the older version — which is true.
  Future<void> uploadNow() async {
    final userId = _userId;
    if (userId.isEmpty || userId == 'guest') return;

    state = state.copyWith(state: SyncState.uploading);
    try {
      final trades = ref.read(tradesProvider);
      final tradeFingerprints = {
        for (final t in trades) t.id: fingerprint(SyncCodec.tradeToMap(t)),
      };
      final knownTrades = _ancestors(kTradeFingerprintsKey);
      final changedTrades = [
        for (final t in trades)
          if (knownTrades[t.id] != tradeFingerprints[t.id]) t,
      ];

      final items = ref.read(watchlistProvider);
      final watchFingerprints = {
        for (final w in items) w.id: fingerprint(SyncCodec.watchlistToMap(w)),
      };
      final knownItems = _ancestors(kWatchlistFingerprintsKey);
      final changedItems = [
        for (final w in items)
          if (knownItems[w.id] != watchFingerprints[w.id]) w,
      ];

      final tradesOk = await FirestoreSyncService.pushTrades(
        userId,
        changedTrades,
      );
      final watchOk = await FirestoreSyncService.pushWatchlist(
        userId,
        changedItems,
      );
      await FirestoreSyncService.pushRiskSettings(
        userId,
        ref.read(settingsProvider),
      );

      // Recorded per collection, and only for the one that succeeded. A record
      // dropped from the local journal drops out of the map here too, so a
      // deletion stops being remembered as agreed — the merge then treats the
      // remote copy as something this device has never seen, which is the
      // additive behaviour documented in sync_merge.dart.
      if (tradesOk) {
        await _rememberAncestors(kTradeFingerprintsKey, tradeFingerprints);
      }
      if (watchOk) {
        await _rememberAncestors(kWatchlistFingerprintsKey, watchFingerprints);
      }

      state = state.copyWith(
        state: tradesOk && watchOk ? SyncState.done : SyncState.failed,
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
