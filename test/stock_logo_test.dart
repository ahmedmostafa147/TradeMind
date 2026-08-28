import 'package:egx_trade_journal/features/market/services/egx_market_service.dart';
import 'package:egx_trade_journal/features/market/services/trading_view_service.dart';
import 'package:flutter_test/flutter_test.dart';

/// The logo slug, and the URL built from it.
///
/// The slug is TradingView's, it arrives over the network, and it ends up in a
/// URL PATH — which is the same shape of hole `/api/quote` had to close with a
/// directory check. A directory is not available here (slugs are minted
/// upstream and change with the board), so the guard is the shape, and this
/// file is what keeps that guard honest on the app side.
///
/// The pattern mirrors `LOGO_ID` in site/lib/tradingview.ts. Both were measured
/// against the live board: all 284 slugs it returns are `[a-z0-9-]`, and the
/// longest is 64 characters
/// (`paints-and-chemical-industries-company-sae-gdr-repr-1-3-shr-144a`).
void main() {
  group('TradingViewService.slug', () {
    test('accepts the shapes the board actually returns', () {
      for (final id in [
        'telecom-egypt',
        'commercial-international-bank-egypt',
        't-m-g',
        'gb-auto',
        'paints-and-chemical-industries-company-sae-gdr-repr-1-3-shr-144a',
      ]) {
        expect(TradingViewService.slug(id), id, reason: id);
      }
    });

    test('normalises case, because the route lowercases too', () {
      expect(TradingViewService.slug('TELECOM-EGYPT'), 'telecom-egypt');
      expect(TradingViewService.slug('  telecom-egypt  '), 'telecom-egypt');
    });

    test('rejects anything that could steer the fetch off the CDN', () {
      for (final hostile in [
        '../../etc/passwd',
        'https://evil.example.com/x',
        'telecom-egypt/../../x',
        'telecom egypt',
        'telecom-egypt?x=1',
        'telecom-egypt#x',
        '-leading-hyphen',
        '',
        '   ',
      ]) {
        expect(TradingViewService.slug(hostile), isNull, reason: hostile);
      }
    });

    test('rejects a non-string, and anything past the length cap', () {
      expect(TradingViewService.slug(null), isNull);
      expect(TradingViewService.slug(42), isNull);
      expect(TradingViewService.slug(List.filled(81, 'a').join()), isNull);
    });
  });

  group('EgxMarketService.logoUrl', () {
    test('points at OUR OWN FILE, never at the CDN', () {
      final url = EgxMarketService.logoUrl('telecom-egypt');
      // Three reasons in one assertion: the browser half of this product
      // cannot reach s3-symbol-logo.tradingview.com without a CSP entry and a
      // privacy-policy clause naming a third party; relaying somebody else's
      // assets is not ours to do indefinitely; and a source that stops
      // answering would take every logo with it.
      expect(url, isNotNull);
      expect(url, endsWith('/logos/telecom-egypt.svg'));
      expect(url, isNot(contains('tradingview.com')));
    });

    test('is null when there is nothing to ask for', () {
      // ~3% of listings have no logo, and every Yahoo-sourced quote has none.
      // Null is the normal state the chip fallback exists for, not an error.
      expect(EgxMarketService.logoUrl(null), isNull);
      expect(EgxMarketService.logoUrl(''), isNull);
      expect(EgxMarketService.logoUrl('../../etc/passwd'), isNull);
    });
  });
}
