import 'package:flutter/material.dart';

import '../../core/calc/trade_metrics.dart';
import '../../core/theme.dart';
import '../trade_status.dart';

/// The trade's state in one chip.
///
/// **STATUS COMES FIRST, AND THAT IS A FIX.** [TradeResult] only knows
/// win/loss/breakeven/open, so a PLANNED idea — which has no exit — came out
/// labelled «مفتوحة». On «قرار اليوم» that put a card captioned «مخططة» by its
/// section directly above a badge reading «مفتوحة», about the same trade, on
/// the same screen. A plan is not an open position; the chip has to say which
/// one it is before it says anything about a result.
class ResultBadge extends StatelessWidget {
  final TradeResult result;

  /// The record's own status. Optional so the closed-trade call sites that only
  /// have a result keep working unchanged.
  final TradeStatus? status;

  const ResultBadge(this.result, {super.key, this.status});

  @override
  Widget build(BuildContext context) {
    final colors = context.resultColors;

    final (label, color) = switch (status) {
      TradeStatus.planned => ('مخططة', colors.breakeven),
      TradeStatus.cancelled => ('ملغاة', colors.open),
      _ => (
        result.label,
        switch (result) {
          TradeResult.win => colors.win,
          TradeResult.loss => colors.loss,
          TradeResult.open => colors.open,
          TradeResult.breakeven => colors.breakeven,
        },
      ),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: colors.surfaceFor(color),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: colors.borderFor(color)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.bold,
          fontSize: 12,
        ),
      ),
    );
  }
}
