import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'models/egx_stock_info.dart';
import 'services/egx_market_service.dart';

/// Live quote for one ticker, keyed by symbol.
///
/// A `family` so each ticker is fetched and cached independently — the open
/// trades list can watch several at once and Riverpod dedupes by symbol, so two
/// open positions in the same stock share a single request. The service itself
/// also caches for five minutes, so a rebuild does not re-hit the network.
///
/// Returns null when the price could not be fetched (offline, unknown ticker,
/// or the unofficial endpoint being down); callers must treat null as "no live
/// price", never as a zero.
final livePriceProvider = FutureProvider.family<EgxStockInfo?, String>((
  ref,
  symbol,
) async {
  final trimmed = symbol.trim();
  if (trimmed.isEmpty) return null;
  return EgxMarketService.fetchStockInfo(trimmed);
});
