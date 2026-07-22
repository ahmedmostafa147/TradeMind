import 'package:hive_ce/hive.dart';

import '../core/hive_keys.dart';
import 'timeline_entry.dart';
import 'trade.dart';
import 'trade_status.dart';

/// Hand-written adapter — no hive_ce_generator, no build_runner.
///
/// There is exactly one persisted type in this app. Adding a codegen toolchain
/// for ~40 lines would buy a stale-.g.dart failure mode and little else, in a
/// project that already declines codegen for Riverpod. Written out, the field
/// indices below are explicit and reviewable, which matters because they ARE
/// the migration contract.
///
/// Field indices are append-only. Never renumber or reuse one.
///   0 id            5 stopPrice     10 status (name string)
///   1 entryDate     6 quantity      11 tags
///   2 ticker        7 exitPrice     12 isFavorite
///   3 reason        8 exitDate      13 screenshotPaths
///   4 entryPrice    9 notes         14 completedChecklistItems
///                                   15 timeline
///                                   16 source
///                                   17 takeProfitPrice
///
/// Fields 10-15 were added in phase 2. Records written before then simply lack
/// those keys, which read back as null and fall through to the defaults below —
/// no migration pass and no version stamp required.
class TradeAdapter extends TypeAdapter<Trade> {
  @override
  int get typeId => kTradeTypeId;

  @override
  Trade read(BinaryReader reader) {
    // Numbered-field-map form (what the generator emits) rather than positional
    // sequential reads: a record written by an older build that lacks a field
    // simply yields null for that key instead of desynchronising the stream.
    final fieldCount = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < fieldCount; i++) reader.readByte(): reader.read(),
    };

    final exitMillis = fields[8] as int?;
    final exitPrice = fields[7] as double?;

    return Trade(
      id: fields[0] as String,
      entryDate: DateTime.fromMillisecondsSinceEpoch(fields[1] as int),
      ticker: fields[2] as String,
      reason: fields[3] as String,
      entryPrice: fields[4] as double,
      stopPrice: fields[5] as double,
      quantity: fields[6] as int,
      exitPrice: exitPrice,
      exitDate: exitMillis == null
          ? null
          : DateTime.fromMillisecondsSinceEpoch(exitMillis),
      notes: fields[9] as String?,

      // Migration rule for pre-phase-2 records: they have no status, and the
      // only thing that ever distinguished them was whether an exit existed.
      // Deriving it here reproduces phase-1 behaviour exactly.
      status: TradeStatus.fromName(
        fields[10] as String?,
        fallback: exitPrice == null ? TradeStatus.open : TradeStatus.closed,
      ),
      tags: _stringList(fields[11]),
      isFavorite: (fields[12] as bool?) ?? false,
      screenshotPaths: _stringList(fields[13]),
      completedChecklistItems: _stringList(fields[14]),
      timeline: _timeline(fields[15]),
      source: fields[16] as String?,
      takeProfitPrice: fields[17] as double?,
    );
  }

  /// Hive hands back `List<dynamic>`; cast defensively so one bad element
  /// cannot make the whole record unreadable.
  static List<String> _stringList(dynamic raw) {
    if (raw is! List) return const [];
    return [
      for (final item in raw)
        if (item is String) item,
    ];
  }

  static List<TimelineEntry> _timeline(dynamic raw) {
    if (raw is! List) return const [];
    return [
      for (final item in raw)
        if (item is TimelineEntry) item,
    ];
  }

  @override
  void write(BinaryWriter writer, Trade obj) {
    // DateTimes are stored as int millisecondsSinceEpoch rather than through
    // Hive's native DateTime support, which round-trips via local time. Storing
    // the epoch value keeps ordering stable across timezone and DST changes,
    // which the equity curve's sort depends on.
    writer
      ..writeByte(18)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.entryDate.millisecondsSinceEpoch)
      ..writeByte(2)
      ..write(obj.ticker)
      ..writeByte(3)
      ..write(obj.reason)
      ..writeByte(4)
      ..write(obj.entryPrice)
      ..writeByte(5)
      ..write(obj.stopPrice)
      ..writeByte(6)
      ..write(obj.quantity)
      ..writeByte(7)
      ..write(obj.exitPrice)
      ..writeByte(8)
      ..write(obj.exitDate?.millisecondsSinceEpoch)
      ..writeByte(9)
      ..write(obj.notes)
      ..writeByte(10)
      // Persisted by name, not index: reordering the enum later must not
      // silently reinterpret every stored record.
      ..write(obj.status.name)
      ..writeByte(11)
      ..write(obj.tags)
      ..writeByte(12)
      ..write(obj.isFavorite)
      ..writeByte(13)
      ..write(obj.screenshotPaths)
      ..writeByte(14)
      ..write(obj.completedChecklistItems)
      ..writeByte(15)
      ..write(obj.timeline)
      ..writeByte(16)
      ..write(obj.source)
      ..writeByte(17)
      ..write(obj.takeProfitPrice);
  }
}
