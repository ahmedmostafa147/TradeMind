import 'dart:io';

import 'package:egx_trade_journal/core/hive_keys.dart';
import 'package:egx_trade_journal/watchlist/watchlist_item.dart';
import 'package:egx_trade_journal/watchlist/watchlist_item_adapter.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_ce/hive.dart';

WatchlistItem makeItem({
  required String id,
  String ticker = 'COMI',
  WatchPriority priority = WatchPriority.medium,
  DateTime? dateAdded,
}) => WatchlistItem(
  id: id,
  ticker: ticker,
  targetBuyPrice: 10.50,
  stopPrice: 9.80,
  reason: 'قرب من الدعم',
  priority: priority,
  dateAdded: dateAdded ?? DateTime(2026, 3, 1),
);

/// Mirrors sortedWatchlistProvider's comparator. Kept here so the ordering
/// rule is unit-tested without spinning up a ProviderContainer.
List<WatchlistItem> sorted(List<WatchlistItem> items) {
  final copy = [...items];
  copy.sort((a, b) {
    final byPriority = a.priority.rank.compareTo(b.priority.rank);
    if (byPriority != 0) return byPriority;
    final byDate = b.dateAdded.compareTo(a.dateAdded);
    return byDate != 0 ? byDate : a.id.compareTo(b.id);
  });
  return copy;
}

void main() {
  group('priority', () {
    test('ranks high before medium before low', () {
      expect(WatchPriority.high.rank, lessThan(WatchPriority.medium.rank));
      expect(WatchPriority.medium.rank, lessThan(WatchPriority.low.rank));
    });

    test('has Arabic labels', () {
      expect(WatchPriority.high.label, 'عالية');
      expect(WatchPriority.medium.label, 'متوسطة');
      expect(WatchPriority.low.label, 'منخفضة');
    });

    test('unknown names fall back rather than throwing', () {
      expect(WatchPriority.fromName('high'), WatchPriority.high);
      expect(WatchPriority.fromName(null), WatchPriority.medium);
      expect(WatchPriority.fromName('from_the_future'), WatchPriority.medium);
    });
  });

  group('ordering', () {
    test('sorts by priority first', () {
      final result = sorted([
        makeItem(id: 'c', priority: WatchPriority.low),
        makeItem(id: 'a', priority: WatchPriority.high),
        makeItem(id: 'b', priority: WatchPriority.medium),
      ]);
      expect(result.map((i) => i.id), ['a', 'b', 'c']);
    });

    test('newest first within a priority', () {
      final result = sorted([
        makeItem(id: 'old', dateAdded: DateTime(2026, 1, 1)),
        makeItem(id: 'new', dateAdded: DateTime(2026, 5, 1)),
      ]);
      expect(result.first.id, 'new');
    });

    test('same-day additions keep a stable order', () {
      final items = [
        makeItem(id: 'b', dateAdded: DateTime(2026, 3, 1)),
        makeItem(id: 'a', dateAdded: DateTime(2026, 3, 1)),
      ];
      expect(sorted(items).map((i) => i.id), ['a', 'b']);
      expect(
        sorted(items.reversed.toList()).map((i) => i.id),
        ['a', 'b'],
        reason: 'input order must not change the result',
      );
    });
  });

  group('persistence', () {
    late Directory tempDir;

    setUp(() async {
      tempDir = await Directory.systemTemp.createTemp('egx_watchlist_test');
      Hive.init(tempDir.path);
      if (!Hive.isAdapterRegistered(kWatchlistItemTypeId)) {
        Hive.registerAdapter(WatchlistItemAdapter());
      }
    });

    tearDown(() async {
      await Hive.close();
      if (tempDir.existsSync()) tempDir.deleteSync(recursive: true);
    });

    test('an item survives a round trip', () async {
      final item = makeItem(id: 'w1', priority: WatchPriority.high);
      final box = await Hive.openBox<WatchlistItem>(kWatchlistBox);
      await box.put(item.id, item);
      await box.close();

      final reopened = await Hive.openBox<WatchlistItem>(kWatchlistBox);
      final result = reopened.get('w1')!;
      await reopened.close();

      expect(result.id, item.id);
      expect(result.ticker, item.ticker);
      expect(result.targetBuyPrice, item.targetBuyPrice);
      expect(result.stopPrice, item.stopPrice);
      expect(result.reason, item.reason);
      expect(result.priority, WatchPriority.high);
      expect(result.dateAdded, item.dateAdded);
    });

    test('every priority round-trips by name', () async {
      final box = await Hive.openBox<WatchlistItem>(kWatchlistBox);
      for (final priority in WatchPriority.values) {
        final item = makeItem(id: priority.name, priority: priority);
        await box.put(item.id, item);
      }
      await box.close();

      final reopened = await Hive.openBox<WatchlistItem>(kWatchlistBox);
      for (final priority in WatchPriority.values) {
        expect(reopened.get(priority.name)!.priority, priority);
      }
      await reopened.close();
    });

    test('the source survives a round trip', () async {
      final item = makeItem(id: 'src').copyWith(source: 'قناة التحليل');
      final box = await Hive.openBox<WatchlistItem>(kWatchlistBox);
      await box.put(item.id, item);
      await box.close();

      final reopened = await Hive.openBox<WatchlistItem>(kWatchlistBox);
      expect(reopened.get('src')!.source, 'قناة التحليل');
      await reopened.close();
    });

    // Records written before the source field existed lack key 7, which reads
    // back as null rather than making the whole record unloadable.
    test('an item with no source loads as null', () async {
      final box = await Hive.openBox<WatchlistItem>(kWatchlistBox);
      await box.put('nosrc', makeItem(id: 'nosrc'));
      await box.close();

      final reopened = await Hive.openBox<WatchlistItem>(kWatchlistBox);
      final result = reopened.get('nosrc')!;
      expect(result.source, isNull);
      expect(result.ticker, 'COMI', reason: 'the rest still loads');
      await reopened.close();
    });

    test('deleting removes only the targeted item', () async {
      final box = await Hive.openBox<WatchlistItem>(kWatchlistBox);
      await box.put('a', makeItem(id: 'a'));
      await box.put('b', makeItem(id: 'b'));
      await box.delete('a');

      expect(box.length, 1);
      expect(box.get('a'), isNull);
      expect(box.get('b'), isNotNull);
      await box.close();
    });
  });

  test('copyWith preserves the id and untouched fields', () {
    final item = makeItem(id: 'w1');
    final edited = item.copyWith(ticker: 'HRHO');
    expect(edited.id, 'w1');
    expect(edited.ticker, 'HRHO');
    expect(edited.stopPrice, item.stopPrice);
    expect(edited.dateAdded, item.dateAdded);
  });
}
