import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../models/egx_stock_info.dart';
import '../services/egx_market_service.dart';

/// One symbol's last close, and whether we are still asking.
///
/// `info == null` on a settled quote is a real answer — the service returns
/// null for every failure and NEVER a zero, because a price that did not arrive
/// must not be arithmetic-ed into a 100% loss.
@immutable
class Quote {
  final EgxStockInfo? info;
  final bool loading;
  final bool failed;

  const Quote._({this.info, this.loading = false, this.failed = false});

  static const pending = Quote._(loading: true);
  static const unavailable = Quote._(failed: true);

  const Quote.of(EgxStockInfo? info) : this._(info: info);
}

@immutable
class MarketState {
  final Map<String, Quote> quotes;

  /// Null while the board is still loading. Empty is a settled answer, and the
  /// screens treat it as a failure to reach TradingView rather than as a market
  /// with no listings in it.
  final List<EgxStockInfo>? board;
  final bool boardFailed;

  const MarketState({
    this.quotes = const {},
    this.board,
    this.boardFailed = false,
  });

  MarketState copyWith({
    Map<String, Quote>? quotes,
    List<EgxStockInfo>? board,
    bool? boardFailed,
  }) => MarketState(
    quotes: quotes ?? this.quotes,
    board: board ?? this.board,
    boardFailed: boardFailed ?? this.boardFailed,
  );
}

/// Prices, for the whole app.
///
/// ── WHY ONE CUBIT AND NOT ONE PER WIDGET ───────────────────────────────────
///
/// `livePriceProvider` was a `FutureProvider.family`, and the family was doing
/// real work: two widgets asking for COMI in the same session shared one
/// request. A cubit created per widget would lose that and quietly multiply the
/// calls to `/api/quote`. The cache below is the family, kept.
///
/// The two fetchers are injectable for the same reason the provider was
/// overridable in tests: a widget test must not reach the network, and stubbing
/// at this seam beats stubbing the HTTP client.
class MarketCubit extends Cubit<MarketState> {
  final Future<EgxStockInfo?> Function(String symbol) _fetchQuote;
  final Future<List<EgxStockInfo>> Function() _fetchBoard;

  MarketCubit({
    Future<EgxStockInfo?> Function(String symbol)? fetchQuote,
    Future<List<EgxStockInfo>> Function()? fetchBoard,
  }) : _fetchQuote = fetchQuote ?? EgxMarketService.fetchStockInfo,
       _fetchBoard = fetchBoard ?? EgxMarketService.fetchTradingViewBoard,
       super(const MarketState());

  Quote quoteOf(String symbol) =>
      state.quotes[symbol.trim()] ?? Quote.pending;

  /// Asks for a symbol once. Repeat calls for a symbol already asked about are
  /// ignored, which is what makes this safe to call from `initState` on every
  /// row that shows a price.
  void ensureQuote(String symbol) {
    final trimmed = symbol.trim();
    if (trimmed.isEmpty || state.quotes.containsKey(trimmed)) return;

    emit(state.copyWith(quotes: {...state.quotes, trimmed: Quote.pending}));

    _fetchQuote(trimmed)
        .then((info) => _settleQuote(trimmed, Quote.of(info)))
        .catchError((Object _) => _settleQuote(trimmed, Quote.unavailable));
  }

  void _settleQuote(String symbol, Quote quote) {
    if (isClosed) return;
    emit(state.copyWith(quotes: {...state.quotes, symbol: quote}));
  }

  /// Loads the board once. [refreshBoard] is the pull-to-refresh path.
  void ensureBoard() {
    if (state.board != null || state.boardFailed) return;
    unawaited(refreshBoard());
  }

  Future<void> refreshBoard() async {
    try {
      final board = await _fetchBoard();
      if (isClosed) return;
      emit(MarketState(quotes: state.quotes, board: board));
    } catch (_) {
      if (isClosed) return;
      emit(MarketState(quotes: state.quotes, boardFailed: true));
    }
  }
}
