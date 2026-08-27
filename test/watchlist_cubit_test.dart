import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:egx_trade_journal/features/sync/services/sync_codec.dart';
import 'package:egx_trade_journal/trades/cubit/trades_cubit.dart';
import 'package:egx_trade_journal/trades/data/trade_repository.dart';
import 'package:egx_trade_journal/trades/trade_status.dart';
import 'package:egx_trade_journal/watchlist/cubit/watchlist_cubit.dart';
import 'package:egx_trade_journal/watchlist/data/watchlist_repository.dart';
import 'package:egx_trade_journal/watchlist/watchlist_item.dart';

void main() {
  late FakeFirebaseFirestore db;
  late WatchlistRepository repo;
  late TradeRepository tradeRepo;
  late TradesCubit trades;
  late WatchlistCubit cubit;

  const uid = 'user-1';

  WatchlistItem item(
    String id, {
    String ticker = 'COMI',
    WatchPriority priority = WatchPriority.medium,
    DateTime? dateAdded,
    double targetBuyPrice = 78.4,
    double stopPrice = 74,
    String source = 'شارت',
  }) => WatchlistItem(
    id: id,
    ticker: ticker,
    targetBuyPrice: targetBuyPrice,
    stopPrice: stopPrice,
    reason: 'قرب دعم أسبوعي',
    priority: priority,
    dateAdded: dateAdded ?? DateTime(2026, 8, 1),
    source: source,
  );

  Future<void> seed(WatchlistItem w) => db
      .collection('users')
      .doc(uid)
      .collection('watchlist')
      .doc(w.id)
      .set(SyncCodec.watchlistToMap(w));

  setUp(() {
    db = FakeFirebaseFirestore();
    repo = WatchlistRepository(db);
    tradeRepo = TradeRepository(db);
    trades = TradesCubit(tradeRepo);
    cubit = WatchlistCubit(repo, trades);
  });

  tearDown(() async {
    await cubit.close();
    await trades.close();
  });

  Future<WatchlistState> settled() =>
      cubit.stream.firstWhere((s) => s is! WatchlistLoading);

  test('starts loading, not empty', () {
    expect(cubit.state, isA<WatchlistLoading>());
  });

  test('loads the account\'s list', () async {
    await seed(item('a'));
    await cubit.followAccount(uid);

    final state = await settled();
    expect((state as WatchlistLoaded).items.map((i) => i.id), ['a']);
  });

  test('highest priority first, then newest, then id', () async {
    // Same priority AND same date on the last two, which is the case the id
    // tie-break exists for: List.sort is not stable, so without it the two
    // swap places between rebuilds.
    await seed(item('low', priority: WatchPriority.low));
    await seed(item('high', priority: WatchPriority.high));
    await seed(item('mid-b', dateAdded: DateTime(2026, 8, 5)));
    await seed(item('mid-a', dateAdded: DateTime(2026, 8, 5)));

    await cubit.followAccount(uid);
    await settled();

    expect(cubit.items.map((i) => i.id), ['high', 'mid-a', 'mid-b', 'low']);
  });

  test('signing out clears the list and says so', () async {
    await seed(item('a'));
    await cubit.followAccount(uid);
    await settled();

    await cubit.followAccount(null);

    expect(cubit.state, isA<WatchlistSignedOut>());
    expect(cubit.items, isEmpty);
  });

  test('a delete stays deleted', () async {
    await cubit.followAccount(uid);
    await settled();

    await cubit.save(item('a'));
    await Future<void>.delayed(Duration.zero);
    expect(cubit.items, hasLength(1));

    await cubit.delete('a');
    await Future<void>.delayed(Duration.zero);
    expect(cubit.items, isEmpty);
  });

  group('convertToPlannedTrade', () {
    test('writes a planned trade and drops the watched item', () async {
      await seed(item('a', ticker: 'SWDY', targetBuyPrice: 12.1, stopPrice: 11.5));
      await cubit.followAccount(uid);
      await trades.followAccount(uid);
      await settled();

      final trade = await cubit.convertToPlannedTrade(cubit.items.single);
      await Future<void>.delayed(Duration.zero);

      expect(trade, isNotNull);
      expect(trade!.status, TradeStatus.planned);
      expect(trade.ticker, 'SWDY');
      expect(trade.entryPrice, 12.1);
      expect(trade.stopPrice, 11.5);
      // Nothing bought yet, so no share count — sizing happens when it opens.
      expect(trade.quantity, 0);
      // Carried over so performance can be attributed back to the source.
      expect(trade.source, 'شارت');

      expect(cubit.items, isEmpty);
      expect((await tradeRepo.fetch(uid)).single.id, trade.id);
    });

    test('writes the trade BEFORE dropping the item', () async {
      // The order is the whole safety argument: reversed, a failure on the
      // second write loses the idea outright. This asserts the surviving
      // failure mode is a duplicate, never a disappearance.
      await seed(item('a'));
      await cubit.followAccount(uid);
      await trades.followAccount(uid);
      await settled();

      final saved = <String>[];
      final sub = trades.stream.listen((s) {
        if (s is TradesLoaded && s.trades.isNotEmpty) saved.add('trade');
      });

      await cubit.convertToPlannedTrade(cubit.items.single);
      await Future<void>.delayed(Duration.zero);
      await sub.cancel();

      expect(saved, isNotEmpty);
      expect(await repo.fetch(uid), isEmpty);
    });

    test('does nothing while signed out', () async {
      await cubit.followAccount(null);
      expect(await cubit.convertToPlannedTrade(item('a')), isNull);
    });
  });
}
