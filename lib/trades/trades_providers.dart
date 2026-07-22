import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_ce/hive.dart';

import '../core/calc/trade_metrics.dart';
import '../settings/settings_providers.dart';
import 'trade.dart';

/// Overridden in main() with the box opened before runApp.
final tradesBoxProvider = Provider<Box<Trade>>(
  (ref) => throw UnimplementedError('tradesBoxProvider must be overridden'),
);

/// Plain [Notifier], not AsyncNotifier.
///
/// The boxes are opened before runApp, so the data is synchronously in memory
/// by the time any widget builds. An AsyncNotifier would force an AsyncValue
/// unwrap — with loading and error branches — into the list, the dashboard, the
/// form and the calculator, for a loading state that can never be observed. The
/// tradeoff is that a Hive open failure is handled in main() instead of
/// surfacing as AsyncValue.error.
final tradesProvider = NotifierProvider<TradesNotifier, List<Trade>>(
  TradesNotifier.new,
);

class TradesNotifier extends Notifier<List<Trade>> {
  Box<Trade> get _box => ref.read(tradesBoxProvider);

  @override
  List<Trade> build() => ref.watch(tradesBoxProvider).values.toList();

  // Each mutator writes to Hive AND reassigns state to a NEW list. Riverpod
  // compares lists by identity, so mutating in place would persist the change
  // but never rebuild the UI.
  Future<void> add(Trade trade) async {
    await _box.put(trade.id, trade);
    state = [...state, trade];
  }

  Future<void> update(Trade trade) async {
    await _box.put(trade.id, trade);
    state = [
      for (final existing in state) existing.id == trade.id ? trade : existing,
    ];
  }

  Future<void> remove(String id) async {
    await _box.delete(id);
    state = state.where((trade) => trade.id != id).toList();
  }
}

/// Newest first. The id tie-break matters because entry dates are date-only,
/// so ties are common, and List.sort is not stable — without it the list would
/// reshuffle between rebuilds.
final sortedTradesProvider = Provider<List<Trade>>((ref) {
  final trades = [...ref.watch(tradesProvider)];
  trades.sort((a, b) {
    final byDate = b.entryDate.compareTo(a.entryDate);
    return byDate != 0 ? byDate : b.id.compareTo(a.id);
  });
  return trades;
});

/// Watches settings, so editing capital recomputes every trade's risk % and
/// return % with no extra wiring.
final tradeMetricsProvider = Provider.family<TradeMetrics?, String>((
  ref,
  tradeId,
) {
  final settings = ref.watch(settingsProvider);
  final trades = ref.watch(tradesProvider);
  for (final trade in trades) {
    if (trade.id == tradeId) {
      return TradeMetrics.of(
        trade,
        capital: settings.capital,
        maxRiskPercent: settings.maxRiskPercent,
      );
    }
  }
  // Null rather than throwing: a row can outlive its trade by one frame during
  // a swipe-to-delete animation.
  return null;
});
