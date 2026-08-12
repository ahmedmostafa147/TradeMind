import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'models/egx_stock_info.dart';
import 'services/egx_market_service.dart';

/// Live quote for one ticker, keyed by symbol.
final livePriceProvider = FutureProvider.family<EgxStockInfo?, String>((
  ref,
  symbol,
) async {
  final trimmed = symbol.trim();
  if (trimmed.isEmpty) return null;
  return EgxMarketService.fetchStockInfo(trimmed);
});

/// Full EGX market board from TradingView.
final tradingViewBoardProvider = FutureProvider<List<EgxStockInfo>>((ref) async {
  return EgxMarketService.fetchTradingViewBoard();
});
