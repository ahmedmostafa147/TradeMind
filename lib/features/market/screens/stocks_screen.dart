import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shell/home_shell.dart';
import '../../../core/formatters.dart';
import '../../../core/theme.dart';
import '../../../trades/trade_draft.dart';
import '../../../trades/trade_form_screen.dart';
import '../market_providers.dart';
import '../models/egx_stock_info.dart';
import '../services/egx_market_service.dart';

/// «الأسهم» — the thirty EGX codes Radar knows, with each one's last close.
///
/// MIRROR OF site/components/dashboard/stocks-panel.tsx. Same list, same search
/// (code or Arabic name), same sort toggle, and the same thing happens on tap:
/// the full trade form opens with the ticker already filled in.
///
/// ── ONE REQUEST PER SYMBOL, AND THAT IS THE COST OF THE APP'S SHAPE ────────
///
/// The website asks `/api/quote` for all thirty at once and the route fans out
/// server-side. Here each row watches `livePriceProvider(code)`, which is thirty
/// calls — but they are cached for five minutes inside [EgxMarketService], the
/// list is lazy so only visible rows subscribe, and the alternative is a second
/// batch endpoint in the service purely for this screen.
///
/// A ROW WITH NO PRICE STILL SHOWS. ESRS returns no candles at all from the
/// upstream — a real property, documented on the route — and a stock Radar
/// supports belongs on this list whether or not there is a print for it today.
/// It renders «—», never a zero: a price that did not arrive must not look like
/// a stock that did not move.
class StocksScreen extends ConsumerStatefulWidget {
  const StocksScreen({super.key});

  @override
  ConsumerState<StocksScreen> createState() => _StocksScreenState();
}

enum _Sort { name, change }

class _StocksScreenState extends ConsumerState<StocksScreen> {
  final _search = TextEditingController();
  _Sort _sort = _Sort.name;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  /// Codes matching the query, by code OR by Arabic name — most people know
  /// «البنك التجاري الدولي», not COMI. Same rule the ticker field uses.
  List<String> get _codes {
    final query = _search.text.trim();
    final entries = EgxMarketService.search(query);
    final codes = [for (final e in entries) e.key];

    if (_sort == _Sort.name) return codes;

    // Biggest mover first. A code with no quote yet sorts last rather than as
    // 0% — an unknown is not a flat day. Reading the provider's current value
    // without watching it is fine here: every row watches its own, so the list
    // rebuilds as they land.
    codes.sort((a, b) {
      final av = _percentOf(a);
      final bv = _percentOf(b);
      if (av == null && bv == null) return a.compareTo(b);
      if (av == null) return 1;
      if (bv == null) return -1;
      return bv.compareTo(av);
    });
    return codes;
  }

  double? _percentOf(String code) =>
      ref.read(livePriceProvider(code)).asData?.value?.changePercent;

  /// Straight into the full form with the ticker filled in.
  ///
  /// Through [TradeDraft], which is the hand-off the quick-add sheet already
  /// uses — not a new `seedTicker` parameter. A second way to pre-fill the same
  /// form is a second thing to keep in step with it.
  void _open(String code) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => TradeFormScreen(draft: TradeDraft(ticker: code)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final codes = _codes;

    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 44,
        title: const Text('الأسهم'),
        actions: [
          TextButton(
            onPressed: () => setState(
              () => _sort = _sort == _Sort.name ? _Sort.change : _Sort.name,
            ),
            child: Text(_sort == _Sort.name ? 'رتّب بالتغيّر' : 'رتّب بالاسم'),
          ),
          const SettingsAction(),
        ],
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
          Expanded(
            child: codes.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Text(
                        'مفيش سهم بالاسم ده في قائمة رادار.',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  )
                : ListView.separated(
                    key: const ValueKey('stocks-list'),
                    padding: const EdgeInsets.only(bottom: 24),
                    itemCount: codes.length,
                    separatorBuilder: (_, _) => const Divider(height: 1),
                    itemBuilder: (_, i) =>
                        _StockRow(code: codes[i], onTap: () => _open(codes[i])),
                  ),
          ),
          // The same sentence the website's panel ends with, and it is not
          // decoration: these are daily closes from an unofficial source, and
          // the product may not be read as recommending anything.
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Text(
              'الأسعار آخر إغلاق يومي من مصدر غير رسمي، مش أسعار لحظية. '
              'رادار بيعرضها كما هي ومش بيقدّم أي توصية بيع أو شراء.',
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

class _StockRow extends ConsumerWidget {
  final String code;
  final VoidCallback onTap;

  const _StockRow({required this.code, required this.onTap});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colors = context.resultColors;
    final quote = ref.watch(livePriceProvider(code));

    final EgxStockInfo? info = quote.asData?.value;
    final pct = info?.changePercent;
    final color = pct == null || pct == 0
        ? theme.colorScheme.onSurfaceVariant
        : (pct > 0 ? colors.win : colors.loss);

    return ListTile(
      onTap: onTap,
      title: NumericText(code, style: theme.textTheme.titleSmall),
      subtitle: Text(
        EgxMarketService.nameFor(code) ?? code,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: theme.textTheme.bodySmall?.copyWith(
          color: theme.colorScheme.onSurfaceVariant,
        ),
      ),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          NumericText(
            info == null ? kEmptyValue : money(info.price),
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          if (pct != null) ...[
            const SizedBox(height: 2),
            NumericText(
              '${pct > 0 ? '+' : ''}${pct.toStringAsFixed(2)}%',
              style: theme.textTheme.bodySmall?.copyWith(
                color: color,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
