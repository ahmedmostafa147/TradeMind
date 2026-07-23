import 'package:egx_trade_journal/features/sync/services/sync_codec.dart';
import 'package:egx_trade_journal/trades/timeline_entry.dart';
import 'package:egx_trade_journal/trades/trade.dart';
import 'package:egx_trade_journal/trades/trade_status.dart';
import 'package:egx_trade_journal/watchlist/watchlist_item.dart';
import 'package:flutter_test/flutter_test.dart';

/// The backup is only worth having if what comes back equals what went up.
/// The version this replaced wrote a hand-rolled map that silently dropped
/// `timeline`, `completedChecklistItems` and `screenshotPaths` — a restore
/// would have returned a quietly damaged journal.
void main() {
  final fullTrade = Trade(
    id: 't1',
    entryDate: DateTime(2026, 3, 14),
    ticker: 'COMI',
    reason: 'بريك أوت من مقاومة',
    entryPrice: 84.5,
    stopPrice: 80.0,
    quantity: 100,
    exitPrice: 92.25,
    exitDate: DateTime(2026, 4, 2),
    notes: 'خرجت بدري شوية',
    status: TradeStatus.closed,
    tags: const ['بريك أوت', 'سوينج'],
    isFavorite: true,
    screenshotPaths: const ['/data/user/0/app/files/a.png'],
    completedChecklistItems: const ['c1', 'c3'],
    timeline: [
      TimelineEntry(date: DateTime(2026, 3, 20), text: 'حركت الاستوب'),
      TimelineEntry(date: DateTime(2026, 3, 28), text: 'قرب الهدف'),
    ],
    source: 'قناة تحليل',
    takeProfitPrice: 95.0,
  );

  group('trade round-trip', () {
    test('keeps every field', () {
      final back = SyncCodec.tradeFromMap(
        SyncCodec.tradeToMap(fullTrade),
        keepScreenshots: true,
      );

      expect(back.id, fullTrade.id);
      expect(back.entryDate, fullTrade.entryDate);
      expect(back.ticker, fullTrade.ticker);
      expect(back.reason, fullTrade.reason);
      expect(back.entryPrice, fullTrade.entryPrice);
      expect(back.stopPrice, fullTrade.stopPrice);
      expect(back.quantity, fullTrade.quantity);
      expect(back.exitPrice, fullTrade.exitPrice);
      expect(back.exitDate, fullTrade.exitDate);
      expect(back.notes, fullTrade.notes);
      expect(back.status, fullTrade.status);
      expect(back.tags, fullTrade.tags);
      expect(back.isFavorite, fullTrade.isFavorite);
      expect(back.source, fullTrade.source);
      expect(back.takeProfitPrice, fullTrade.takeProfitPrice);
    });

    test('keeps the timeline — dropped entirely by the old encoder', () {
      final back = SyncCodec.tradeFromMap(SyncCodec.tradeToMap(fullTrade));
      expect(back.timeline.length, 2);
      expect(back.timeline.first.text, 'حركت الاستوب');
      expect(back.timeline.first.date, DateTime(2026, 3, 20));
    });

    test('keeps the ticked checklist items', () {
      final back = SyncCodec.tradeFromMap(SyncCodec.tradeToMap(fullTrade));
      expect(back.completedChecklistItems, ['c1', 'c3']);
    });

    test('drops screenshot paths when restoring onto another device', () {
      // The image files themselves are never uploaded, so carrying the paths
      // over would produce thumbnails pointing at nothing.
      final back = SyncCodec.tradeFromMap(SyncCodec.tradeToMap(fullTrade));
      expect(back.screenshotPaths, isEmpty);
    });

    test('an open trade stays open', () {
      final open = Trade(
        id: 't2',
        entryDate: DateTime(2026, 5, 1),
        ticker: 'SWDY',
        reason: 'ارتداد',
        entryPrice: 12.0,
        stopPrice: 11.0,
        quantity: 500,
      );
      final back = SyncCodec.tradeFromMap(SyncCodec.tradeToMap(open));
      expect(back.isOpen, isTrue);
      expect(back.exitPrice, isNull);
      expect(back.exitDate, isNull);
      expect(back.status, TradeStatus.open);
    });

    test('a planned idea keeps its status rather than becoming open', () {
      final planned = Trade(
        id: 't3',
        entryDate: DateTime(2026, 5, 2),
        ticker: 'ETEL',
        reason: 'فكرة',
        entryPrice: 20.0,
        stopPrice: 18.0,
        quantity: 0,
        status: TradeStatus.planned,
      );
      final back = SyncCodec.tradeFromMap(SyncCodec.tradeToMap(planned));
      expect(back.status, TradeStatus.planned);
    });

    test('a half-written exit pair is normalised, not thrown on', () {
      // Trade asserts exitPrice and exitDate are set together. A truncated
      // remote write must not take the whole restore down with it.
      final map = SyncCodec.tradeToMap(fullTrade)..remove('exitDate');
      final back = SyncCodec.tradeFromMap(map);
      expect(back.exitPrice, isNull);
      expect(back.exitDate, isNull);
    });

    test('reads a whole number Firestore returned as int', () {
      // Firestore hands back `int` for 84.0 even though a double was written.
      final map = SyncCodec.tradeToMap(fullTrade);
      map['entryPrice'] = 84;
      map['takeProfitPrice'] = 95;
      final back = SyncCodec.tradeFromMap(map);
      expect(back.entryPrice, 84.0);
      expect(back.takeProfitPrice, 95.0);
    });
  });

  group('watchlist round-trip', () {
    test('keeps every field', () {
      final item = WatchlistItem(
        id: 'w1',
        ticker: 'ABUK',
        targetBuyPrice: 55.5,
        stopPrice: 51.0,
        reason: 'نتائج قوية',
        priority: WatchPriority.high,
        dateAdded: DateTime(2026, 6, 10),
        source: 'تحليلي',
      );
      final back = SyncCodec.watchlistFromMap(SyncCodec.watchlistToMap(item));

      expect(back.id, item.id);
      expect(back.ticker, item.ticker);
      expect(back.targetBuyPrice, item.targetBuyPrice);
      expect(back.stopPrice, item.stopPrice);
      expect(back.reason, item.reason);
      expect(back.priority, item.priority);
      expect(back.dateAdded, item.dateAdded);
      expect(back.source, item.source);
    });

    test('an unknown priority falls back instead of throwing', () {
      final map = SyncCodec.watchlistToMap(
        WatchlistItem(
          id: 'w2',
          ticker: 'X',
          targetBuyPrice: 1,
          stopPrice: 0.5,
          reason: 'r',
          priority: WatchPriority.low,
          dateAdded: DateTime(2026, 1, 1),
        ),
      )..['priority'] = 'not-a-priority';
      expect(SyncCodec.watchlistFromMap(map).priority, WatchPriority.medium);
    });
  });
}
