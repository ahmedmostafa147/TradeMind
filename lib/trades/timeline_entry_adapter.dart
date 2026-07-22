import 'package:hive_ce/hive.dart';

import '../core/hive_keys.dart';
import 'timeline_entry.dart';

/// Field indices are append-only.
///   0 date (int millisecondsSinceEpoch)
///   1 text
class TimelineEntryAdapter extends TypeAdapter<TimelineEntry> {
  @override
  int get typeId => kTimelineEntryTypeId;

  @override
  TimelineEntry read(BinaryReader reader) {
    final fieldCount = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < fieldCount; i++) reader.readByte(): reader.read(),
    };
    return TimelineEntry(
      date: DateTime.fromMillisecondsSinceEpoch((fields[0] as int?) ?? 0),
      text: (fields[1] as String?) ?? '',
    );
  }

  @override
  void write(BinaryWriter writer, TimelineEntry obj) {
    writer
      ..writeByte(2)
      ..writeByte(0)
      ..write(obj.date.millisecondsSinceEpoch)
      ..writeByte(1)
      ..write(obj.text);
  }
}
