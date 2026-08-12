import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shell/home_shell.dart';
import '../../../trades/trade_draft.dart';
import '../../../trades/trade_form_screen.dart';
import '../market_providers.dart';
import '../services/egx_market_service.dart';
import '../widgets/stock_row.dart';

/// «الأسهم» — EGX stocks directory with live quotes.
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

  List<String> get _codes {
    final query = _search.text.trim();
    final entries = EgxMarketService.search(query);
    final codes = [for (final e in entries) e.key];

    if (_sort == _Sort.name) return codes;

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
                    itemBuilder: (_, i) => StockRowWidget(
                      code: codes[i],
                      onTap: () => _open(codes[i]),
                    ),
                  ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Text(
              'الأسعار محدّثة من TradingView والمصادر المتاحة. رادار بيعرضها كما هي.',
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
