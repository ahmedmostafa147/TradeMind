import 'package:egx_trade_journal/watchlist/data/watchlist_repository.dart';
import 'package:egx_trade_journal/watchlist/watchlist_item.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

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

/// Mirrors the repository's comparator. Kept here so the ordering rule is
/// unit-tested without spinning up a cubit.
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

  /// ── THIS GROUP USED TO OPEN A HIVE BOX ────────────────────────────────────
  ///
  /// It was asserting that a hand-written adapter round-tripped every field,
  /// including the two that had bitten before: `priority` (stored by NAME, so
  /// reordering the enum could not silently reassign everyone's priorities) and
  /// `source` (added later, so older records lack it and must load as null
  /// rather than not load at all).
  ///
  /// The adapter is gone. The same two hazards are, though, exactly as live in
  /// the codec that replaced it — so the group is kept and pointed at the store
  /// that actually holds the data now.
  group('persistence', () {
    late FakeFirebaseFirestore db;
    late WatchlistRepository repo;
    const uid = 'user-1';

    setUp(() {
      db = FakeFirebaseFirestore();
      repo = WatchlistRepository(db);
    });

    Future<WatchlistItem?> roundTrip(WatchlistItem item) async {
      await repo.save(uid, item);
      final all = await repo.fetch(uid);
      for (final stored in all) {
        if (stored.id == item.id) return stored;
      }
      return null;
    }

    test('an item survives a round trip', () async {
      final item = makeItem(id: 'w1', priority: WatchPriority.high);
      final result = (await roundTrip(item))!;

      expect(result.id, item.id);
      expect(result.ticker, item.ticker);
      expect(result.targetBuyPrice, item.targetBuyPrice);
      expect(result.stopPrice, item.stopPrice);
      expect(result.reason, item.reason);
      expect(result.priority, WatchPriority.high);
      expect(result.dateAdded, item.dateAdded);
    });

    test('every priority round-trips by name', () async {
      for (final priority in WatchPriority.values) {
        final result = await roundTrip(
          makeItem(id: priority.name, priority: priority),
        );
        expect(result!.priority, priority);
      }
    });

    test('the source survives a round trip', () async {
      final item = makeItem(id: 'src').copyWith(source: 'قناة التحليل');
      expect((await roundTrip(item))!.source, 'قناة التحليل');
    });

    // Records written before the source field existed have no such key, which
    // must read back as null rather than making the whole record unloadable.
    test('an item with no source loads as null', () async {
      final result = (await roundTrip(makeItem(id: 'nosrc')))!;
      expect(result.source, isNull);
      expect(result.ticker, 'COMI', reason: 'the rest still loads');
    });

    test('deleting removes only the targeted item', () async {
      await repo.save(uid, makeItem(id: 'a'));
      await repo.save(uid, makeItem(id: 'b'));
      await repo.delete(uid, 'a');

      final remaining = await repo.fetch(uid);
      expect(remaining.map((i) => i.id), ['b']);
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
