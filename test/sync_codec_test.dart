import 'package:egx_trade_journal/features/sync/services/sync_codec.dart';
import 'package:egx_trade_journal/settings/settings.dart';
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

  /// The risk rule is the one thing both surfaces divide by. A value that
  /// decodes wrong here does not throw — it silently rescores every trade in
  /// the journal, which is why the fallback behaviour is pinned this hard.
  group('risk settings', () {
    const configured = Settings(
      capital: 250000,
      maxRiskPercent: 0.015,
      waitingThresholdDays: 45,
      // Device preferences. They must survive a remote read untouched, because
      // the remote document does not carry them at all.
      enableChecklist: false,
      enableConfirmations: false,
      defaultTakeProfitPercent: 0.08,
      defaultStopLossPercent: 0.03,
    );

    test('round-trips the five synced values', () {
      final back = SyncCodec.riskSettingsFromMap(
        SyncCodec.riskSettingsToMap(configured),
        onto: const Settings(),
      );

      expect(back.capital, 250000);
      expect(back.maxRiskPercent, 0.015);
      expect(back.waitingThresholdDays, 45);
      // The two the builder starts from. They were device-only until the
      // journal moved to a single store, and that is exactly why the website
      // hard-coded 5% and 2%: there was nothing synced to read, so the same
      // trade got two verdicts for anyone who changed a default.
      expect(back.defaultTakeProfitPercent, 0.08);
      expect(back.defaultStopLossPercent, 0.03);
    });

    test('omits an unset capital instead of writing a zero', () {
      // firestore.rules requires `capital > 0`. Sending the default 0 would
      // fail the whole write — silently, since nothing surfaces a rejected
      // settings save — and take the other four fields with it.
      expect(
        SyncCodec.riskSettingsToMap(const Settings()).containsKey('capital'),
        isFalse,
      );
      expect(
        SyncCodec.riskSettingsToMap(const Settings(capital: 1))['capital'],
        1,
      );
    });

    test('leaves the two habit toggles alone', () {
      // These stay on the device and the codec never carries them: they are
      // habits — whether to be shown a checklist, whether to be asked before a
      // delete — and syncing a habit pushes one device's preference onto
      // another.
      //
      // The two default percentages used to be in this list and no longer are.
      // The line below proves the difference: the remote value now wins for
      // them, which is the whole point of moving them.
      final back = SyncCodec.riskSettingsFromMap(
        SyncCodec.riskSettingsToMap(const Settings()),
        onto: configured,
      );

      expect(back.enableChecklist, isFalse);
      expect(back.enableConfirmations, isFalse);
      // And the same is now true of an UNSET capital, for a different reason:
      // the map leaves the key out entirely rather than sending a 0, so a
      // device with no capital cannot wipe the one the account already has.
      // firestore.rules would reject the 0 anyway and take the other four
      // fields down with it.
      expect(back.capital, 250000);
      expect(back.defaultTakeProfitPercent, Settings.fallbackTakeProfitPercent);
      expect(back.defaultStopLossPercent, Settings.fallbackStopLossPercent);
    });

    test('an empty document changes nothing', () {
      final back = SyncCodec.riskSettingsFromMap(const {}, onto: configured);

      expect(back.capital, configured.capital);
      expect(back.maxRiskPercent, configured.maxRiskPercent);
      expect(back.waitingThresholdDays, configured.waitingThresholdDays);
    });

    test('a bad value keeps the current one instead of the class default', () {
      // The distinction that matters: falling back to Settings.defaultCapital
      // here would reset a configured 250,000 to 17,000 because one field of a
      // half-written document was garbage.
      final back = SyncCodec.riskSettingsFromMap(const {
        'capital': 0,
        'maxRiskPercent': 4,
        'waitingThresholdDays': -3,
      }, onto: configured);

      expect(back.capital, 250000);
      expect(back.maxRiskPercent, 0.015);
      expect(back.waitingThresholdDays, 45);
    });

    test('accepts a whole number written as either int or double', () {
      // firestore.rules deliberately says `is number`, not `is int`, because
      // the two SDKs disagree about how a whole number serialises. The reader
      // has to cope with both or that tolerance buys nothing.
      for (final raw in <Object>[30, 30.0]) {
        final back = SyncCodec.riskSettingsFromMap({
          'waitingThresholdDays': raw,
        }, onto: configured);
        expect(back.waitingThresholdDays, 30, reason: 'from ${raw.runtimeType}');
      }
    });
  });
}
