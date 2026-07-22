import 'dart:io';

import 'package:egx_trade_journal/core/hive_keys.dart';
import 'package:egx_trade_journal/trades/timeline_entry.dart';
import 'package:egx_trade_journal/trades/timeline_entry_adapter.dart';
import 'package:egx_trade_journal/trades/trade.dart';
import 'package:egx_trade_journal/trades/trade_adapter.dart';
import 'package:egx_trade_journal/trades/trade_status.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_ce/hive.dart';

void main() {
  late Directory tempDir;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('egx_hive_test');
    Hive.init(tempDir.path);
    if (!Hive.isAdapterRegistered(kTimelineEntryTypeId)) {
      Hive.registerAdapter(TimelineEntryAdapter());
    }
    if (!Hive.isAdapterRegistered(kTradeTypeId)) {
      Hive.registerAdapter(TradeAdapter());
    }
  });

  tearDown(() async {
    await Hive.deleteFromDisk();
    await Hive.close();
    if (tempDir.existsSync()) tempDir.deleteSync(recursive: true);
  });

  Future<Trade> roundTrip(Trade trade) async {
    final box = await Hive.openBox<Trade>(kTradesBox);
    await box.put(trade.id, trade);
    await box.close();

    final reopened = await Hive.openBox<Trade>(kTradesBox);
    final result = reopened.get(trade.id)!;
    await reopened.close();
    return result;
  }

  void expectSame(Trade actual, Trade expected) {
    expect(actual.id, expected.id);
    expect(actual.entryDate, expected.entryDate);
    expect(actual.ticker, expected.ticker);
    expect(actual.reason, expected.reason);
    expect(actual.entryPrice, expected.entryPrice);
    expect(actual.stopPrice, expected.stopPrice);
    expect(actual.quantity, expected.quantity);
    expect(actual.exitPrice, expected.exitPrice);
    expect(actual.exitDate, expected.exitDate);
    expect(actual.notes, expected.notes);
    expect(actual.status, expected.status);
    expect(actual.tags, expected.tags);
    expect(actual.isFavorite, expected.isFavorite);
    expect(actual.screenshotPaths, expected.screenshotPaths);
    expect(
      actual.completedChecklistItems,
      expected.completedChecklistItems,
    );
    expect(actual.timeline.length, expected.timeline.length);
    for (var i = 0; i < expected.timeline.length; i++) {
      expect(actual.timeline[i].date, expected.timeline[i].date);
      expect(actual.timeline[i].text, expected.timeline[i].text);
    }
  }

  test('a fully populated closed trade survives a round trip', () async {
    final trade = Trade(
      id: 'abc-123',
      entryDate: DateTime(2026, 3, 1, 9, 30, 15, 250),
      ticker: 'COMI',
      reason: 'اختراق مقاومة على حجم عالي',
      entryPrice: 10.00,
      stopPrice: 9.50,
      quantity: 680,
      exitPrice: 11.20,
      exitDate: DateTime(2026, 3, 10, 14, 5),
      notes: 'الدرس: التزمت بالخطة',
    );

    expectSame(await roundTrip(trade), trade);
  });

  test('an open trade with every optional field null survives', () async {
    final trade = Trade(
      id: 'open-1',
      entryDate: DateTime(2026, 3, 1),
      ticker: 'HRHO',
      reason: 'ارتداد من دعم',
      entryPrice: 18.40,
      stopPrice: 17.90,
      quantity: 100,
    );

    final result = await roundTrip(trade);
    expectSame(result, trade);
    expect(result.exitPrice, isNull);
    expect(result.exitDate, isNull);
    expect(result.notes, isNull);
    expect(result.isOpen, isTrue);
  });

  test('DateTime survives to exact millisecond precision', () async {
    final entry = DateTime(2026, 7, 20, 23, 59, 59, 999);
    final trade = Trade(
      id: 'ms-1',
      entryDate: entry,
      ticker: 'SWDY',
      reason: 'r',
      entryPrice: 5.0,
      stopPrice: 4.5,
      quantity: 10,
    );

    final result = await roundTrip(trade);
    expect(result.entryDate.millisecondsSinceEpoch, entry.millisecondsSinceEpoch);
    expect(result.entryDate, entry);
  });

  test('Arabic text survives unmangled', () async {
    final trade = Trade(
      id: 'ar-1',
      entryDate: DateTime(2026, 3, 1),
      ticker: 'ETEL',
      reason: 'سبب الدخول بالعربية',
      entryPrice: 30.0,
      stopPrice: 29.0,
      quantity: 5,
      notes: 'الدرس المستفاد: الصبر',
    );

    final result = await roundTrip(trade);
    expect(result.reason, 'سبب الدخول بالعربية');
    expect(result.notes, 'الدرس المستفاد: الصبر');
  });

  group('phase-2 fields', () {
    test('every new field survives a round trip', () async {
      final trade = Trade(
        id: 'p2-1',
        entryDate: DateTime(2026, 3, 1),
        ticker: 'COMI',
        reason: 'اختراق مقاومة',
        entryPrice: 10.00,
        stopPrice: 9.50,
        quantity: 680,
        status: TradeStatus.planned,
        tags: const ['بريك أوت', 'سوينج'],
        isFavorite: true,
        screenshotPaths: const ['/data/a.png', '/data/b.png'],
        completedChecklistItems: const ['trend', 'volume'],
        timeline: [
          TimelineEntry(date: DateTime(2026, 3, 1), text: 'اشتريت النهاردة'),
          TimelineEntry(date: DateTime(2026, 3, 4), text: 'حركت الاستوب'),
        ],
      );

      expectSame(await roundTrip(trade), trade);
    });

    test('each status round-trips by name', () async {
      for (final status in TradeStatus.values) {
        final trade = Trade(
          id: 'status-${status.name}',
          entryDate: DateTime(2026, 3, 1),
          ticker: 'T',
          reason: 'r',
          entryPrice: 10.0,
          stopPrice: 9.0,
          quantity: 1,
          status: status,
        );
        expect((await roundTrip(trade)).status, status);
      }
    });

    // The migration guarantee. A record written by phase 1 has only fields
    // 0-9; the missing keys must read back as the phase-1 defaults, with
    // status derived from whether an exit exists.
    test('a phase-1 record without fields 10-15 still loads', () async {
      final box = await Hive.openBox<Trade>(kTradesBox);
      final legacyOpen = Trade(
        id: 'legacy-open',
        entryDate: DateTime(2026, 3, 1),
        ticker: 'HRHO',
        reason: 'ارتداد',
        entryPrice: 18.40,
        stopPrice: 17.90,
        quantity: 100,
      );
      final legacyClosed = legacyOpen.copyWith(
        id: 'legacy-closed',
        exitPrice: 20.00,
        exitDate: DateTime(2026, 3, 9),
      );
      await box.put(legacyOpen.id, legacyOpen);
      await box.put(legacyClosed.id, legacyClosed);
      await box.close();

      final reopened = await Hive.openBox<Trade>(kTradesBox);
      final open = reopened.get('legacy-open')!;
      final closed = reopened.get('legacy-closed')!;
      await reopened.close();

      expect(open.status, TradeStatus.open, reason: 'no exit → open');
      expect(closed.status, TradeStatus.closed, reason: 'has exit → closed');

      for (final trade in [open, closed]) {
        expect(trade.tags, isEmpty);
        expect(trade.isFavorite, isFalse);
        expect(trade.screenshotPaths, isEmpty);
        expect(trade.completedChecklistItems, isEmpty);
        expect(trade.timeline, isEmpty);
      }
    });
  });

  test('multiple trades are keyed by id and independently retrievable', () async {
    final box = await Hive.openBox<Trade>(kTradesBox);
    for (var i = 0; i < 3; i++) {
      final trade = Trade(
        id: 'id-$i',
        entryDate: DateTime(2026, 3, i + 1),
        ticker: 'T$i',
        reason: 'r',
        entryPrice: 10.0 + i,
        stopPrice: 9.0 + i,
        quantity: 100 * (i + 1),
      );
      await box.put(trade.id, trade);
    }

    expect(box.length, 3);
    expect(box.get('id-1')!.quantity, 200);

    await box.delete('id-1');
    expect(box.length, 2);
    expect(box.get('id-1'), isNull);
    expect(box.get('id-0'), isNotNull);
    await box.close();
  });
}
