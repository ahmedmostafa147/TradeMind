import 'package:egx_trade_journal/billing/cubit/billing_cubit.dart';
import 'package:egx_trade_journal/billing/entitlements.dart';
import 'package:egx_trade_journal/core/theme.dart';
import 'package:egx_trade_journal/features/market/cubit/market_cubit.dart';
import 'package:egx_trade_journal/features/market/models/egx_stock_info.dart';
import 'package:egx_trade_journal/features/market/widgets/live_pnl_view.dart';
import 'package:egx_trade_journal/features/market/widgets/ticker_avatar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';

EgxStockInfo _quote(double price) => EgxStockInfo(
  symbol: 'COMI',
  name: 'CIB',
  price: price,
  change: 0,
  changePercent: 0,
  high52: 0,
  low52: 0,
  lastUpdated: DateTime(2026, 7, 1),
);

Future<void> _pump(
  WidgetTester tester, {
  EgxStockInfo? quote,
  bool fails = false,
}) async {
  await tester.pumpWidget(
    MultiBlocProvider(
      providers: [
        // Pinned so the widget never touches the network in a test.
        BlocProvider(
          create: (_) => MarketCubit(
            fetchQuote: (_) async =>
                fails ? throw Exception('boom') : quote,
            fetchBoard: () async => const [],
          ),
        ),
        // Live prices are a paid surface, so the view renders nothing at all
        // without an entitlement that allows them.
        BlocProvider(
          create: (_) => BillingCubit(
            initial: const BillingLoaded(Entitlement(plan: Plan.trial), true),
          ),
        ),
      ],
      child: MaterialApp(
        theme: buildLightTheme(),
        locale: const Locale('ar'),
        supportedLocales: const [Locale('ar')],
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        home: const Scaffold(
          body: LivePnlView(ticker: 'COMI', entryPrice: 10.0, quantity: 680),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('shows an unrealised profit above entry', (tester) async {
    await _pump(tester, quote: _quote(11.0));

    // (11 - 10) * 680 = +680, and +10%.
    expect(find.textContaining('+680.00 ج.م'), findsOneWidget);
    expect(find.textContaining('+10.00%'), findsOneWidget);
    expect(find.text('11.00 ج.م'), findsOneWidget, reason: 'السعر الحالي');
  });

  testWidgets('shows an unrealised loss below entry', (tester) async {
    await _pump(tester, quote: _quote(9.50));

    // (9.5 - 10) * 680 = -340.
    expect(find.textContaining('-340.00 ج.م'), findsOneWidget);
    expect(find.textContaining('-5.00%'), findsOneWidget);
  });

  testWidgets('a zero-price sentinel reads as unavailable, not a loss', (
    tester,
  ) async {
    await _pump(tester, quote: _quote(0));

    // «إغلاق», not «لحظي»: the route serves a daily close, and the card's own
    // label already said so while these two lines claimed a live tick.
    expect(find.text('سعر الإغلاق غير متاح'), findsOneWidget);
    expect(find.textContaining('ج.م'), findsNothing);
  });

  testWidgets('a fetch error degrades to a quiet line', (tester) async {
    await _pump(tester, fails: true);

    expect(find.text('تعذّر تحديث سعر الإغلاق'), findsOneWidget);
  });

  testWidgets('the avatar shows the first two letters of the ticker', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(home: Scaffold(body: TickerAvatar(ticker: 'COMI'))),
    );

    expect(find.text('CO'), findsOneWidget);
  });
}
