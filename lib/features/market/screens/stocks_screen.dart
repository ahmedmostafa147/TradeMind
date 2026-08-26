import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shell/home_shell.dart';
import '../../../trades/trade_draft.dart';
import '../../../trades/trade_form_screen.dart';
import '../market_providers.dart';
import '../models/egx_stock_info.dart';
import '../services/egx_market_service.dart';
import '../widgets/stock_row.dart';

/// «الأسهم» — every EGX listing on the board, searchable.
///
/// ── IT LISTS THE BOARD, NOT THE THIRTY-NAME DIRECTORY ──────────────────────
///
/// It used to render `EgxMarketService.egxDirectory` — thirty codes hardcoded in
/// Dart — while the site's stocks tab had already moved to `/api/stocks` and was
/// showing all ~292 listings. Same tab, same name, an order of magnitude apart:
/// a trader who found a stock in the browser and then went looking for it on the
/// phone simply would not find it.
///
/// The directory has not gone anywhere. It still supplies the curated ARABIC
/// NAMES (TradingView's `description` is English for most listings), and it is
/// still what the screen falls back to when the board cannot be reached, so the
/// search box works offline instead of facing an empty list.
class StocksScreen extends ConsumerStatefulWidget {
  const StocksScreen({super.key});

  @override
  ConsumerState<StocksScreen> createState() => _StocksScreenState();
}

/// The same four the site's stocks panel offers, in the same order.
enum _Filter {
  all('الجميع'),
  gainers('الأكثر صعودًا'),
  losers('الأكثر هبوطًا'),
  alphabetical('أبجدي');

  const _Filter(this.label);
  final String label;
}

class _StocksScreenState extends ConsumerState<StocksScreen> {
  final _search = TextEditingController();
  _Filter _filter = _Filter.all;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  void _open(String code) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => TradeFormScreen(draft: TradeDraft(ticker: code)),
      ),
    );
  }

  /// The board when it arrived, the curated directory when it did not.
  List<EgxStockInfo> _rowsFrom(List<EgxStockInfo> board) {
    if (board.isNotEmpty) return board;
    return [
      for (final entry in EgxMarketService.egxDirectory.entries)
        EgxStockInfo(
          symbol: entry.key,
          name: entry.value,
          // A row with no board behind it carries no price. `StockRowWidget`
          // reads a null `info` as «—»; these exist so the list and its search
          // still work, not to imply a quote.
          price: 0,
          change: 0,
          changePercent: 0,
          high52: 0,
          low52: 0,
          lastUpdated: DateTime.fromMillisecondsSinceEpoch(0),
        ),
    ];
  }

  List<EgxStockInfo> _visible(List<EgxStockInfo> board) {
    final rows = _rowsFrom(board);
    final query = _search.text.trim();
    final upper = query.toUpperCase();

    final matched = query.isEmpty
        ? [...rows]
        : [
            for (final row in rows)
              if (row.symbol.contains(upper) ||
                  row.name.toUpperCase().contains(upper) ||
                  (EgxMarketService.nameFor(row.symbol) ?? '').contains(query))
                row,
          ];

    switch (_filter) {
      case _Filter.all:
        break;
      case _Filter.gainers:
        matched.removeWhere((r) => r.changePercent <= 0);
        matched.sort((a, b) => b.changePercent.compareTo(a.changePercent));
      case _Filter.losers:
        matched.removeWhere((r) => r.changePercent >= 0);
        matched.sort((a, b) => a.changePercent.compareTo(b.changePercent));
      case _Filter.alphabetical:
        matched.sort((a, b) => a.symbol.compareTo(b.symbol));
    }
    return matched;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final boardAsync = ref.watch(tradingViewBoardProvider);
    final board = boardAsync.asData?.value ?? const <EgxStockInfo>[];
    final rows = _visible(board);

    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 44,
        title: const Text('الأسهم'),
        actions: const [SettingsAction()],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: TextField(
              controller: _search,
              onChanged: (_) => setState(() {}),
              textInputAction: TextInputAction.search,
              decoration: InputDecoration(
                hintText: 'دوّر بالرمز أو بالاسم…',
                prefixIcon: const Icon(Icons.search),
                isDense: true,
                suffixIcon: _search.text.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.clear),
                        tooltip: 'امسح البحث',
                        onPressed: () {
                          _search.clear();
                          setState(() {});
                        },
                      ),
              ),
            ),
          ),
          SizedBox(
            height: 40,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                for (final option in _Filter.values) ...[
                  ChoiceChip(
                    label: Text(option.label),
                    selected: _filter == option,
                    onSelected: (_) => setState(() => _filter = option),
                  ),
                  const SizedBox(width: 8),
                ],
              ],
            ),
          ),
          const SizedBox(height: 4),
          Expanded(
            child: rows.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Text(
                        'مفيش سهم بالاسم ده.',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  )
                // Lazily built, so 292 rows cost the dozen that are on screen.
                : ListView.separated(
                    key: const ValueKey('stocks-list'),
                    padding: const EdgeInsets.only(bottom: 24),
                    itemCount: rows.length,
                    separatorBuilder: (_, _) => const Divider(height: 1),
                    itemBuilder: (_, i) => StockRowWidget(
                      code: rows[i].symbol,
                      info: board.isEmpty ? null : rows[i],
                      onTap: () => _open(rows[i].symbol),
                    ),
                  ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Text(
              'المصدر: TradingView Egypt Scanner — الأسعار متأخرة ١٥ دقيقة، '
              'ورادار بيعرضها كما هي. الترتيب وصف للي حصل في الجلسة، '
              'وليس توصية بالبيع أو الشراء.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.outline,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
