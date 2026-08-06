/// Deciding, per record, whether the phone or the cloud is right.
///
/// PURE — no Firestore, no Hive, no Flutter. It takes three fingerprints and
/// returns a decision, which is what makes every branch below testable without
/// a network or a device.
library;

/// What to do with one record id.
enum SyncAction {
  /// Nothing differs. Most records, most syncs.
  none,

  /// The cloud has something this device does not, or a newer version of
  /// something this device has not touched since the last sync.
  adoptRemote,

  /// This device has something the cloud does not, or has edited a record
  /// since the last sync.
  pushLocal,
}

/// The state of one id across the three places it can exist.
///
/// A fingerprint is a stable digest of the record's synced form. Null means
/// "absent": no local record, no remote record, or no memory of ever having
/// synced this id from this device.
class RecordState {
  /// The record as it is on this device right now.
  final String? local;

  /// The record as it was the last time THIS DEVICE successfully pushed or
  /// adopted it. The common ancestor — the whole reason this is a three-way
  /// merge and not a guess.
  final String? lastSynced;

  /// The record as it is in the cloud right now.
  final String? remote;

  const RecordState({this.local, this.lastSynced, this.remote});
}

/// NO CLOCKS ANYWHERE IN HERE, and that is deliberate.
///
/// `updatedAt` cannot decide this. `pushTrades` writes the whole collection
/// with a fresh server timestamp on every sync, so every record's `updatedAt`
/// says "when this device last synced anything" rather than "when this record
/// changed" — a last-write-wins on that field would have the phone win every
/// time, which is exactly the bug it would be trying to fix. Even with that
/// repaired, a timestamp from a client with a wrong clock pins its own edits as
/// permanently newest; CLAUDE.md already records that hazard for the settings
/// document and declines to take it.
///
/// Comparing content against the common ancestor needs no agreement about time
/// between two devices, only agreement about what they last saw.
///
/// **A CONFLICT KEEPS THE LOCAL COPY.** When both sides changed since the last
/// sync there is no correct answer, and the journal on the device is the one
/// the user has been typing into. Losing a browser edit is recoverable — the
/// user is looking at the browser. Overwriting the phone silently is not.
SyncAction decideFor(RecordState state) {
  final local = state.local;
  final remote = state.remote;
  final ancestor = state.lastSynced;

  // Deleted on both sides, or never existed. Nothing to do.
  if (local == null && remote == null) return SyncAction.none;

  // Only the cloud has it. Either it was created on another surface, or this
  // device was reinstalled — both mean "bring it down".
  //
  // NOTE: this is also what makes restore additive. A record deleted on the
  // phone but still in the cloud comes back, because a delete is
  // indistinguishable here from a device that never had it. Propagating
  // deletions needs tombstones, which the schema does not carry.
  if (local == null) return SyncAction.adoptRemote;

  // Only this device has it. New here, or the cloud never received it.
  if (remote == null) return SyncAction.pushLocal;

  // Both sides agree already.
  if (local == remote) return SyncAction.none;

  // They differ. Which side moved?
  final localChanged = local != ancestor;
  final remoteChanged = remote != ancestor;

  if (localChanged && !remoteChanged) return SyncAction.pushLocal;
  if (!localChanged && remoteChanged) return SyncAction.adoptRemote;

  // Both moved, or there is no ancestor to compare against — a record that has
  // never completed a sync from this device. Keep local, and push it.
  return SyncAction.pushLocal;
}

/// The full plan for a collection, from the three fingerprint maps.
class SyncPlan {
  /// Ids whose remote version should be written into the local store.
  final Set<String> adopt;

  /// Ids whose local version should be uploaded.
  final Set<String> push;

  const SyncPlan({required this.adopt, required this.push});

  bool get isEmpty => adopt.isEmpty && push.isEmpty;
}

SyncPlan planSync({
  required Map<String, String> local,
  required Map<String, String> lastSynced,
  required Map<String, String> remote,
}) {
  final ids = <String>{...local.keys, ...remote.keys, ...lastSynced.keys};
  final adopt = <String>{};
  final push = <String>{};

  for (final id in ids) {
    final action = decideFor(
      RecordState(
        local: local[id],
        lastSynced: lastSynced[id],
        remote: remote[id],
      ),
    );
    switch (action) {
      case SyncAction.adoptRemote:
        adopt.add(id);
      case SyncAction.pushLocal:
        push.add(id);
      case SyncAction.none:
        break;
    }
  }

  return SyncPlan(adopt: adopt, push: push);
}

/// A stable digest of a record's synced form.
///
/// Both sides are fingerprinted from `SyncCodec.tradeToMap` output — the LOCAL
/// record directly, and the REMOTE record after decoding and re-encoding it.
/// Round-tripping the remote copy is what stops a difference in representation
/// (a Timestamp where an ISO string is expected, a field Firestore omitted
/// because it was null) from reading as a real edit and starting a sync loop.
///
/// Keys are sorted at every level, because a map's iteration order is not part
/// of what the record means and two encoders that disagree about it would make
/// identical records look different forever.
String fingerprint(Object? value) {
  final buffer = StringBuffer();
  _write(value, buffer);
  return buffer.toString();
}

void _write(Object? value, StringBuffer out) {
  if (value == null) {
    out.write('~');
    return;
  }
  if (value is Map) {
    final keys = value.keys.map((k) => k.toString()).toList()..sort();
    out.write('{');
    for (final key in keys) {
      // `updatedAt` is the sync's own bookkeeping, not the user's record. It
      // is written fresh on every push, so including it would make every
      // remote copy differ from its local twin the instant it was uploaded.
      if (key == 'updatedAt') continue;
      out
        ..write(key)
        ..write(':');
      _write(value[key], out);
      out.write(',');
    }
    out.write('}');
    return;
  }
  if (value is List) {
    out.write('[');
    for (final item in value) {
      _write(item, out);
      out.write(',');
    }
    out.write(']');
    return;
  }
  out.write(value);
}
