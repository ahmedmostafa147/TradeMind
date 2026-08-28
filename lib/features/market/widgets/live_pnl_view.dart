import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../billing/cubit/billing_cubit.dart';
import '../cubit/market_cubit.dart';

import '../../../core/formatters.dart';
import '../../../core/theme.dart';
import '../../../billing/entitlements.dart';

/// Unrealised profit/loss for an OPEN position, measured against the last
/// session's CLOSE. Realised trades already show their final P&L, so this is
/// only for positions still running.
///
/// The price comes through `/api/quote` behind [MarketCubit] — the same
/// route the website uses, so the two surfaces cannot quote one position
/// differently. Every non-success path degrades to a quiet muted line rather
/// than an error: a price that did not arrive must never look like a loss.
class LivePnlView extends StatefulWidget {
  final String ticker;
  final double entryPrice;
  final int quantity;

  const LivePnlView({
    super.key,
    required this.ticker,
    required this.entryPrice,
    required this.quantity,
  });

  @override
  State<LivePnlView> createState() => _LivePnlViewState();
}

class _LivePnlViewState extends State<LivePnlView> {
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Only asked for when the plan allows it — see the gate in build. Fetching
    // a price nobody may see is the kind of waste that only shows up on a bill.
    if (context.read<BillingCubit>().state.entitlement.can(Feature.livePrices)) {
      context.read<MarketCubit>().ensureQuote(widget.ticker);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ticker = widget.ticker;
    final entryPrice = widget.entryPrice;
    final quantity = widget.quantity;
    final theme = Theme.of(context);
    final colors = context.resultColors;
    // GATED HERE RATHER THAN AT THE TWO CALL SITES, so a third one cannot
    // forget. Rendering nothing is deliberate: a lock icon on every open trade
    // row would turn the journal into an advert, and the paywall the user needs
    // to see is the one on «السوق», not six of them in a list.
    //
    // No request is made at all on the free plan — see didChangeDependencies.
    if (!context.watch<BillingCubit>().state.entitlement.can(Feature.livePrices)) {
      return const SizedBox.shrink();
    }

    final quote = context.select((MarketCubit c) => c.quoteOf(ticker));

    Widget muted(String text) => Text(
      text,
      style: theme.textTheme.bodySmall?.copyWith(
        color: theme.colorScheme.outline,
      ),
    );

    if (quote.loading) {
      return Row(
        children: [
          SizedBox(
            width: 12,
            height: 12,
            child: CircularProgressIndicator(
              strokeWidth: 1.6,
              color: theme.colorScheme.outline,
            ),
          ),
          const SizedBox(width: 8),
          muted('جاري تحديث السعر...'),
        ],
      );
    }

    // «إغلاق», NEVER «لحظي», IN EITHER OF THESE TWO LINES.
    //
    // /api/quote returns the LAST DAILY CLOSE from an unofficial endpoint.
    // Calling it a live price is a claim the product decided it may not make —
    // it was scrubbed from five places for that reason, and these two survived
    // the sweep while the card's own label three rows down already said «آخر
    // إغلاق». Two names for one number on one card.
    if (quote.failed) return muted('تعذّر تحديث سعر الإغلاق');

    {
      final info = quote.info;
        // The service returns null for every failure and never a zero — a price
        // that did not arrive must not be arithmetic-ed into a 100% loss. The
        // `<= 0` is belt-and-braces against a future caller that forgets.
        if (info == null || info.price <= 0) {
          return muted('سعر الإغلاق غير متاح');
        }

        final current = info.price;
        final pnl = (current - entryPrice) * quantity;
        final pct = entryPrice > 0
            ? (current - entryPrice) / entryPrice * 100
            : null;

        final color = pnl > 0
            ? colors.win
            : (pnl < 0 ? colors.loss : colors.open);
        final pctText = pct == null ? '' : ' (${_signedPct(pct)})';

        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: colors.surfaceFor(color),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Icon(
                pnl >= 0
                    ? Icons.trending_up_rounded
                    : Icons.trending_down_rounded,
                size: 18,
                color: color,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'ربح/خسارة غير محققة',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 2),
                    NumericText(
                      '${signedMoney(pnl)}$pctText',
                      style: theme.textTheme.titleSmall?.copyWith(
                        color: color,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    // EGX gives a daily close, not a live tick. Labelling it
                    // "السعر الحالي" overstated what the number is.
                    'آخر إغلاق',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 2),
                  NumericText(
                    money(current),
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (info.priceDate case final date?) ...[
                    const SizedBox(height: 2),
                    NumericText(
                      dateLabel(date),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.outline,
                        fontSize: 10,
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
      );
    }
  }

  static String _signedPct(double pct) {
    final sign = pct > 0 ? '+' : '';
    return '$sign${pct.toStringAsFixed(2)}%';
  }
}
