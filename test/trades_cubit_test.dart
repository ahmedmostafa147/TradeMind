import 'dart:async';

import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:egx_trade_journal/trades/data/trade_repository.dart';
import 'package:egx_trade_journal/features/sync/services/sync_codec.dart';
import 'package:egx_trade_journal/trades/cubit/trades_cubit.dart';
import 'package:egx_trade_journal/trades/trade.dart';
import 'package:egx_trade_journal/trades/trade_status.dart';

void main() {
  late FakeFirebaseFirestore db;
  late TradeRepository repo;
  late TradesCubit cubit;

  const uid = 'user-1';

  Trade trade(String id, {String ticker = 'COMI'}) => Trade(
    id: id,
    entryDate: DateTime(2026, 5, 4),
    ticker: ticker,
    reason: 'كسر المقاومة بحجم مؤكد',
    entryPrice: 78.4,
    stopPrice: 74,
    quantity: 227,
    status: TradeStatus.open,
  );

  Future<void> seed(Trade t) => db
      .collection('users')
      .doc(uid)
      .collection('trades')
      .doc(t.id)
      .set(SyncCodec.tradeToMap(t));

  setUp(() {
    db = FakeFirebaseFirestore();
    repo = TradeRepository(db);
    cubit = TradesCubit(repo);
  });

  tearDown(() => cubit.close());

  /// Waits for the cubit to leave the loading state, rather than sleeping for a
  /// guessed number of milliseconds.
  Future<TradesState> settled() =>
      cubit.stream.firstWhere((s) => s is! TradesLoading);

  test('starts loading — which is NOT the same as an empty journal', () {
    // The whole reason this state exists. The Riverpod version could not have
    // one, because the Hive box was already open before the first widget built.
    // A stream has a real first frame with nothing in it, and rendering «مفيش
    // صفقات» to somebody who has plenty is the worst thing a journal can say.
    expect(cubit.state, isA<TradesLoading>());
  });

  test('signing in loads the account\'s journal', () async {
    await seed(trade('a'));
    await seed(trade('b'));

    await cubit.signIn(uid);
    final state = await settled();

    expect(state, isA<TradesLoaded>());
    expect((state as TradesLoaded).trades.map((t) => t.id), containsAll(['a', 'b']));
  });

  test('an account with no trades loads as empty, not as loading forever', () async {
    await cubit.signIn(uid);
    final state = await settled();

    expect(state, isA<TradesLoaded>());
    expect((state as TradesLoaded).trades, isEmpty);
  });

  test('signing out clears the journal and says so', () async {
    await seed(trade('a'));
    await cubit.signIn(uid);
    await settled();

    await cubit.signIn(null);

    expect(cubit.state, isA<TradesSignedOut>());
    expect(cubit.trades, isEmpty);
  });

  test('re-pointing at the SAME account is ignored', () async {
    // Firebase Auth re-emits the current user on token refresh. Tearing the
    // subscription down and rebuilding it for that would blank the screen and
    // buy a fresh read every hour for no reason.
    await seed(trade('a'));
    await cubit.signIn(uid);
    await settled();

    final states = <TradesState>[];
    final sub = cubit.stream.listen(states.add);

    await cubit.signIn(uid);
    await Future<void>.delayed(Duration.zero);
    await sub.cancel();

    expect(states, isEmpty);
  });

  test('switching accounts does not leak the previous journal', () async {
    await seed(trade('a'));
    await cubit.signIn(uid);
    await settled();
    expect(cubit.trades, hasLength(1));

    await cubit.signIn('someone-else');
    final state = await settled();

    expect((state as TradesLoaded).trades, isEmpty);
  });

  test('a save reaches the store and comes back through the stream', () async {
    await cubit.signIn(uid);
    await settled();

    await cubit.save(trade('a', ticker: 'SWDY'));
    await Future<void>.delayed(Duration.zero);

    expect(cubit.trades.single.ticker, 'SWDY');
    // And it is really in the store, not just in memory.
    expect((await repo.fetch(uid)).single.ticker, 'SWDY');
  });

  test('a delete reaches the store', () async {
    await seed(trade('a'));
    await cubit.signIn(uid);
    await settled();

    await cubit.delete('a');
    await Future<void>.delayed(Duration.zero);

    expect(cubit.trades, isEmpty);
    expect(await repo.fetch(uid), isEmpty);
  });

  test('writing while signed out is a no-op, not a crash', () async {
    await cubit.signIn(null);

    await cubit.save(trade('a'));
    await cubit.delete('a');

    expect(cubit.state, isA<TradesSignedOut>());
  });

  test('a failed read surfaces as failure — never as an empty journal', () async {
    // The §19 failure, in miniature: a denied read and an empty collection are
    // indistinguishable to a `catch` that returns []. This is the one state the
    // old provider could not represent at all, so the app would have shown a
    // confident, wrong "you have no trades".
    final failing = _FailingRepository(repo);
    final c = TradesCubit(failing);
    addTearDown(c.close);

    await c.signIn(uid);
    final state = await c.stream.firstWhere((s) => s is! TradesLoading);

    expect(state, isA<TradesFailure>());
    expect((state as TradesFailure).error, isA<StateError>());
    expect(c.trades, isEmpty);
  });
}

/// A repository whose stream fails, standing in for a rules denial or an
/// expired session.
class _FailingRepository implements TradeRepository {
  final TradeRepository _inner;

  _FailingRepository(this._inner);

  @override
  Stream<List<Trade>> watch(String userId) =>
      Stream.error(StateError('permission-denied'));

  @override
  Future<List<Trade>> fetch(String userId) => _inner.fetch(userId);

  @override
  Future<void> save(String userId, Trade trade) => _inner.save(userId, trade);

  @override
  Future<void> delete(String userId, String tradeId) =>
      _inner.delete(userId, tradeId);

  @override
  noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
