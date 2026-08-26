import 'package:egx_trade_journal/features/market/market_providers.dart';
import 'package:egx_trade_journal/features/market/models/egx_stock_info.dart';
import 'package:egx_trade_journal/features/market/screens/stocks_screen.dart';
import 'package:egx_trade_journal/features/market/services/egx_market_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

/// «الأسهم» lists THE BOARD.
///
/// It listed `EgxMarketService.egxDirectory` — thirty codes written into Dart —
/// for as long as the site's stocks tab had already been showing all ~292
/// listings from `/api/stocks`. Nothing failed, nothing logged, and the two
/// surfaces just quietly disagreed about how many stocks the Egyptian exchange
/// has. These pin the three things that made that possible: where the rows come
/// from, what happens when they do not arrive, and that a row never invents a
/// price.
void main() {
  EgxStockInfo row(String symbol, {required double price, required double pct}) =>
      EgxStockInfo(
        symbol: symbol,
        name: 'شركة $symbol',
        price: price,
        change: price * pct / 100,
        changePercent: pct,
        high52: price,
        low52: price,
        lastUpdated: DateTime(2026, 8, 18),
      );

  Future<void> pump(WidgetTester tester, List<EgxStockInfo> board) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          tradingViewBoardProvider.overrideWith((ref) async => board),
        ],
        child: const MaterialApp(
          home: Directionality(
            textDirection: TextDirection.rtl,
            child: StocksScreen(),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('it shows codes the thirty-name directory has never heard of', (
    tester,
  ) async {
    const outsider = 'ZZZZ';
    expect(
      EgxMarketService.egxDirectory.containsKey(outsider),
      isFalse,
      reason: 'the fixture must not be one of the curated thirty',
    );

    await pump(tester, [
      row('COMI', price: 139.99, pct: 1.20),
      row(outsider, price: 4.50, pct: 3.00),
    ]);

    expect(find.text(outsider), findsOneWidget);
  });

  testWidgets('the curated Arabic name wins over the board\'s own', (
    tester,
  ) async {
    await pump(tester, [row('COMI', price: 139.99, pct: 1.20)]);

    // The fixture calls it «شركة COMI»; the directory knows better.
    expect(find.text(EgxMarketService.egxDirectory['COMI']!), findsOneWidget);
    expect(find.text('شركة COMI'), findsNothing);
  });

  testWidgets('an unreachable board falls back to the directory, priceless', (
    tester,
  ) async {
    await pump(tester, const []);

    // The search box still has something to search.
    expect(find.text('COMI'), findsOneWidget);

    // And NOT a zero. A price that did not arrive must never render as a stock
    // that did not move — it would be arithmetic-ed into a 100% loss elsewhere.
    expect(find.textContaining('0.00%'), findsNothing);
    expect(find.textContaining('0.00 ج.م'), findsNothing);
  });

  testWidgets('«الأكثر هبوطًا» keeps only fallers, worst first', (tester) async {
    await pump(tester, [
      row('AAAA', price: 10, pct: 5.00),
      row('BBBB', price: 10, pct: -2.00),
      row('CCCC', price: 10, pct: -7.00),
    ]);

    await tester.tap(find.text('الأكثر هبوطًا'));
    await tester.pumpAndSettle();

    expect(find.text('AAAA'), findsNothing, reason: 'a riser is not a faller');

    // Read the order off the screen rather than out of the widget tree: the
    // title is a NumericText, and reaching into its internals would make this
    // test fail for a reason that has nothing to do with sorting.
    expect(
      tester.getTopLeft(find.text('CCCC')).dy,
      lessThan(tester.getTopLeft(find.text('BBBB')).dy),
      reason: 'worst first',
    );
  });

  testWidgets('search matches the code and the Arabic name', (tester) async {
    await pump(tester, [
      row('COMI', price: 139.99, pct: 1.20),
      row('ZZZZ', price: 4.50, pct: 3.00),
    ]);

    await tester.enterText(find.byType(TextField), 'COMI');
    await tester.pumpAndSettle();
    expect(find.text('ZZZZ'), findsNothing);

    await tester.enterText(find.byType(TextField), 'التجاري');
    await tester.pumpAndSettle();
    expect(find.text('COMI'), findsOneWidget);
    expect(find.text('ZZZZ'), findsNothing);
  });
}
