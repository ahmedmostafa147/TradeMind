import 'package:flutter/material.dart';

import '../../core/calc/trade_metrics.dart';
import '../../core/theme.dart';

class ResultBadge extends StatelessWidget {
  final TradeResult result;

  const ResultBadge(this.result, {super.key});

  @override
  Widget build(BuildContext context) {
    final colors = context.resultColors;
    final color = switch (result) {
      TradeResult.win => colors.win,
      TradeResult.loss => colors.loss,
      TradeResult.open => colors.open,
      TradeResult.breakeven => colors.breakeven,
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: colors.surfaceFor(color),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: colors.borderFor(color)),
      ),
      child: Text(
        result.label,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.bold,
          fontSize: 12,
        ),
      ),
    );
  }
}
