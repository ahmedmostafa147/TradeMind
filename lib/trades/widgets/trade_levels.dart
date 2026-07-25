import 'package:flutter/material.dart';

import '../../core/formatters.dart';
import '../trade.dart';

/// The numbers that define a position: entry, stop, target, share count and
/// what the position costs.
///
/// One widget rather than a hand-rolled row per screen, because the screens had
/// drifted apart — the trades list showed none of these, the daily card showed
/// entry and stop but never the target, and only the detail page showed the
/// position value. A trade that lists its stop but not its target cannot be
/// judged without opening it, which defeats the point of a list.
///
/// Missing values render as [kEmptyValue] instead of vanishing, so the five
/// slots stay in the same order and place on every card.
class TradeLevels extends StatelessWidget {
  final Trade trade;

  /// Position value, when the caller already computed it. Falls back to
  /// entry × quantity — the same rule [TradeMetrics] uses.
  final double? positionValue;

  /// Drops the position value, for cards too narrow to carry five figures.
  final bool compact;

  const TradeLevels({
    super.key,
    required this.trade,
    this.positionValue,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    // A planned idea has no share count yet; 0 would read as a real position
    // of zero shares rather than "not decided".
    final qty = trade.quantity > 0 ? trade.quantity : null;
    final value = positionValue ??
        (qty == null ? null : trade.entryPrice * qty);

    return Wrap(
      spacing: 16,
      runSpacing: 8,
      children: [
        _Level(label: 'الدخول', value: money(trade.entryPrice)),
        _Level(label: 'الاستوب', value: money(trade.stopPrice)),
        _Level(label: 'الهدف', value: money(trade.takeProfitPrice)),
        _Level(label: 'عدد الأسهم', value: quantity(qty)),
        if (!compact)
          _Level(
            label: 'قيمة المركز',
            value: money(value != null && value.isFinite ? value : null),
          ),
      ],
    );
  }
}

class _Level extends StatelessWidget {
  final String label;
  final String value;

  const _Level({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isUnset = value == kEmptyValue;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(label, style: theme.textTheme.bodySmall?.copyWith(fontSize: 11)),
        const SizedBox(height: 2),
        NumericText(
          value,
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.bold,
            // Greyed rather than hidden: the slot still holds its place.
            color: isUnset ? theme.colorScheme.outline : null,
          ),
        ),
      ],
    );
  }
}
