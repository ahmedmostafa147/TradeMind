import 'package:hive_ce/hive.dart';

import '../core/hive_keys.dart';
import 'watchlist_item.dart';

/// Field indices are append-only. Never renumber or reuse one.
///   0 id              4 reason
///   1 ticker          5 priority (name string, not index)
///   2 targetBuyPrice  6 dateAdded (int millisecondsSinceEpoch)
///   3 stopPrice       7 source
class WatchlistItemAdapter extends TypeAdapter<WatchlistItem> {
  @override
  int get typeId => kWatchlistItemTypeId;

  @override
  WatchlistItem read(BinaryReader reader) {
    final fieldCount = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < fieldCount; i++) reader.readByte(): reader.read(),
    };
    return WatchlistItem(
      id: fields[0] as String,
      ticker: (fields[1] as String?) ?? '',
      targetBuyPrice: (fields[2] as double?) ?? 0,
      stopPrice: (fields[3] as double?) ?? 0,
      reason: (fields[4] as String?) ?? '',
      priority: WatchPriority.fromName(fields[5] as String?),
      dateAdded: DateTime.fromMillisecondsSinceEpoch((fields[6] as int?) ?? 0),
      source: fields[7] as String?,
    );
  }

  @override
  void write(BinaryWriter writer, WatchlistItem obj) {
    writer
      ..writeByte(8)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.ticker)
      ..writeByte(2)
      ..write(obj.targetBuyPrice)
      ..writeByte(3)
      ..write(obj.stopPrice)
      ..writeByte(4)
      ..write(obj.reason)
      ..writeByte(5)
      // By name, so reordering the enum cannot reinterpret stored records.
      ..write(obj.priority.name)
      ..writeByte(6)
      ..write(obj.dateAdded.millisecondsSinceEpoch)
      ..writeByte(7)
      ..write(obj.source);
  }
}
