import 'package:egx_trade_journal/features/market/models/egx_stock_info.dart';
import 'package:egx_trade_journal/features/market/services/egx_market_service.dart';
import 'package:flutter_test/flutter_test.dart';

/// Pins the price down to the candle series.
///
/// The bug these cover, taken from the live endpoint: for COMI, Yahoo's `meta`
/// block reported `regularMarketPrice: 81.2` dated **July 2024** and typed
/// `MUTUALFUND`, while the actual daily closes ended at **140.0** for July
/// 2026. The app read `meta`, so every price was wrong — ETEL showed 32.77
/// against a real 103.28. `meta.fiftyTwoWeekLow` (91.5) even sat above its own
/// price, which is impossible and proves the block is not the stock.
Map<String, dynamic> _chart({
  required List<num?> closes,
  required List<int> timestamps,
  num? metaPrice = 81.2,
}) => {
  'meta': {
    'symbol': 'COMI.CA',
    'currency': 'EGP',
    'instrumentType': 'MUTUALFUND',
    'regularMarketPrice': metaPrice,
    'fiftyTwoWeekHigh': 145.01,
    'fiftyTwoWeekLow': 91.5,
  },
  'timestamp': timestamps,
  'indicators': {
    'quote': [
      {'close': closes},
    ],
  },
};

void main() {
  group('price comes from the candles, not meta', () {
    test('uses the last close and ignores the stale meta price', () {
      final info = EgxStockInfo.fromYahooJson(
        'COMI',
        _chart(
          closes: [134.0, 136.6, 139.97, 140.0],
          timestamps: [1784444400, 1784530800, 1784617200, 1784790000],
        ),
      );

      expect(info, isNotNull);
      expect(info!.price, 140.0, reason: 'the real close, not 81.2');
      expect(info.price, isNot(81.2));
    });

    test('a trailing null (today, not yet traded) is skipped', () {
      final info = EgxStockInfo.fromYahooJson(
        'COMI',
        _chart(
          closes: [134.0, 136.6, 139.97, 140.0, null],
          timestamps: [
            1784444400,
            1784530800,
            1784617200,
            1784790000,
            1784876400,
          ],
        ),
      );

      expect(info!.price, 140.0);
    });

    test('change is measured against the previous close', () {
      final info = EgxStockInfo.fromYahooJson(
        'COMI',
        _chart(closes: [100.0, 110.0], timestamps: [1784444400, 1784530800]),
      );

      expect(info!.change, 10.0);
      expect(info.changePercent, closeTo(10.0, 0.001));
    });

    test('the price date is exposed so the UI can show its age', () {
      final info = EgxStockInfo.fromYahooJson(
        'COMI',
        _chart(closes: [140.0], timestamps: [1784790000]),
      );

      expect(info!.priceDate, isNotNull);
      expect(info.priceDate!.year, 2026);
    });

    test('no usable candle returns null rather than inventing a price', () {
      // ESRS behaves exactly like this on the live endpoint.
      expect(
        EgxStockInfo.fromYahooJson('ESRS', _chart(closes: [], timestamps: [])),
        isNull,
      );
      expect(
        EgxStockInfo.fromYahooJson(
          'ESRS',
          _chart(closes: [null, null], timestamps: [1, 2]),
        ),
        isNull,
        reason: 'must not fall back to the stale meta price',
      );
    });

    test('zero and negative closes are not treated as prices', () {
      final info = EgxStockInfo.fromYahooJson(
        'COMI',
        _chart(closes: [0, -5, 140.0], timestamps: [1, 2, 1784790000]),
      );
      expect(info!.price, 140.0);
    });

    test('highs and lows come from the same series', () {
      final info = EgxStockInfo.fromYahooJson(
        'COMI',
        _chart(closes: [100.0, 150.0, 120.0], timestamps: [1, 2, 3]),
      );

      expect(info!.high52, 150.0);
      expect(info.low52, 100.0);
      // Sanity: the impossible meta pairing can no longer occur.
      expect(info.low52, lessThanOrEqualTo(info.price));
      expect(info.high52, greaterThanOrEqualTo(info.price));
    });

    test('the Arabic directory name wins over Yahoo', () {
      final info = EgxStockInfo.fromYahooJson(
        'COMI',
        _chart(closes: [140.0], timestamps: [1784790000]),
        preferredName: 'البنك التجاري الدولي (CIB)',
      );

      expect(info!.name, 'البنك التجاري الدولي (CIB)');
    });
  });

  group('ticker directory', () {
    test('every entry has a code and an Arabic name', () {
      for (final entry in EgxMarketService.egxDirectory.entries) {
        expect(entry.key, matches(RegExp(r'^[A-Z]{3,5}$')));
        expect(entry.value.trim(), isNotEmpty);
      }
    });

    test('HELW is gone and Ezz Steel is ESRS', () {
      // HELW returned no data at all on the live endpoint yet was labelled
      // حديد عز; the real Ezz Steel code is ESRS.
      expect(EgxMarketService.egxDirectory.containsKey('HELW'), isFalse);
      expect(EgxMarketService.egxDirectory['ESRS'], 'حديد عز');
    });

    test('search matches on code and on Arabic name', () {
      expect(EgxMarketService.search('COM').map((e) => e.key), contains('COMI'));
      expect(
        EgxMarketService.search('بنك').map((e) => e.key),
        contains('HDBK'),
      );
    });

    test('nameFor normalises case and the .CA suffix', () {
      expect(EgxMarketService.nameFor('comi.ca'), isNotNull);
      expect(EgxMarketService.nameFor('COMI'), isNotNull);
      expect(EgxMarketService.nameFor('NOPE'), isNull);
    });
  });
}
