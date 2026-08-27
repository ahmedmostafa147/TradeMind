import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:egx_trade_journal/data/trade_repository.dart';
import 'package:egx_trade_journal/features/sync/services/sync_codec.dart';
import 'package:egx_trade_journal/trades/trade.dart';
import 'package:egx_trade_journal/trades/trade_status.dart';

/// The journal's only store, tested against a real Firestore implementation
/// rather than a hand-rolled stub — `fake_cloud_firestore` runs the actual
/// query, snapshot and merge semantics in memory.
void main() {
  late FakeFirebaseFirestore db;
  late TradeRepository repo;

  const uid = 'user-1';

  Trade trade(
    String id, {
    DateTime? entryDate,
    String ticker = 'COMI',
    double entryPrice = 78.4,
    List<String> screenshots = const [],
    TradeStatus status = TradeStatus.open,
  }) => Trade(
    id: id,
    entryDate: entryDate ?? DateTime(2026, 5, 4),
    ticker: ticker,
    reason: 'كسر المقاومة بحجم مؤكد',
    entryPrice: entryPrice,
    stopPrice: 74,
    quantity: 227,
    status: status,
    screenshotPaths: screenshots,
  );

  setUp(() {
    db = FakeFirebaseFirestore();
    repo = TradeRepository(db);
  });

  Future<void> seed(Trade t) => db
      .collection('users')
      .doc(uid)
      .collection('trades')
      .doc(t.id)
      .set(SyncCodec.tradeToMap(t));

  group('reading', () {
    test('an account with no trades reads as an empty journal, not an error', () async {
      expect(await repo.fetch(uid), isEmpty);
    });

    test('newest first, with the id breaking date ties', () async {
      // Same date on purpose: entry dates are date-only, so ties are the common
      // case, and List.sort is not stable. Without the tie-break the order
      // reshuffles between rebuilds.
      await seed(trade('a', entryDate: DateTime(2026, 5, 4)));
      await seed(trade('c', entryDate: DateTime(2026, 5, 4)));
      await seed(trade('b', entryDate: DateTime(2026, 6, 1)));

      expect(
        (await repo.fetch(uid)).map((t) => t.id),
        ['b', 'c', 'a'],
      );
    });

    test('one unreadable document does not take the journal down with it', () async {
      await seed(trade('good'));
      // `id` is required and non-null in the codec, so a document without one
      // throws on decode. That is the shape a half-finished write leaves.
      await db
          .collection('users')
          .doc(uid)
          .collection('trades')
          .doc('broken')
          .set({'ticker': 'ETEL'});

      final trades = await repo.fetch(uid);
      expect(trades.map((t) => t.id), ['good']);
    });

    test('screenshot paths survive the round trip', () async {
      // The codec DROPS these by default, because a path from one phone means
      // nothing on another. With no Hive box left holding the real copy,
      // dropping them here would delete every attachment on the next read and
      // silently cost 20 points of discipline score.
      await seed(trade('a', screenshots: const ['/data/app/shot-1.png']));

      final restored = (await repo.fetch(uid)).single;
      expect(restored.screenshotPaths, ['/data/app/shot-1.png']);
    });

    test('one account cannot see another account\'s journal', () async {
      await seed(trade('mine'));
      expect(await repo.fetch('someone-else'), isEmpty);
    });
  });

  group('writing', () {
    test('save then read returns the same trade', () async {
      await repo.save(uid, trade('a', ticker: 'SWDY', entryPrice: 12.1));

      final stored = (await repo.fetch(uid)).single;
      expect(stored.id, 'a');
      expect(stored.ticker, 'SWDY');
      expect(stored.entryPrice, 12.1);
    });

    test('saving the same id twice replaces it instead of forking', () async {
      await repo.save(uid, trade('a', ticker: 'COMI'));
      await repo.save(uid, trade('a', ticker: 'HRHO'));

      final trades = await repo.fetch(uid);
      expect(trades, hasLength(1));
      expect(trades.single.ticker, 'HRHO');
    });

    test('a delete stays deleted', () async {
      // This is the documented hole the old three-way merge could not close: a
      // record deleted on the phone came back on the next sync, because
      // "deleted" and "never seen" are indistinguishable without tombstones.
      // With one store there is nothing to resurrect it.
      await repo.save(uid, trade('a'));
      await repo.delete(uid, 'a');

      expect(await repo.fetch(uid), isEmpty);
    });
  });

  group('watching', () {
    test('emits the journal, then emits again on every change', () async {
      await seed(trade('a'));

      final seen = <List<String>>[];
      final sub = repo.watch(uid).listen((t) => seen.add([for (final x in t) x.id]));

      await Future<void>.delayed(Duration.zero);
      await repo.save(uid, trade('b', entryDate: DateTime(2026, 7, 1)));
      await Future<void>.delayed(Duration.zero);
      await repo.delete(uid, 'a');
      await Future<void>.delayed(Duration.zero);

      await sub.cancel();

      expect(seen.first, ['a']);
      expect(seen.last, ['b']);
    });
  });
}
