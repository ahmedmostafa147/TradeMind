import 'package:flutter/material.dart';

import '../../core/calc/daily_decisions.dart';
import '../../core/formatters.dart';
import '../../core/theme.dart';
import '../../settings/settings.dart';
import '../../trades/trade.dart';
import '../../trades/trade_detail_screen.dart';
import '../../trades/trade_status.dart';
import 'action_section.dart';
import 'trade_action_buttons.dart';
import 'trade_action_card.dart';

class ActiveDecisionSections extends StatelessWidget {
  final DailyDecisions decisions;
  final Settings settings;

  const ActiveDecisionSections({
    super.key,
    required this.decisions,
    required this.settings,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.resultColors;

    return Column(
      children: [
        if (decisions.overRisk.isNotEmpty)
          ActionSection(
            title: 'تجاوز حد المخاطرة',
            count: decisions.overRiskCount,
            icon: Icons.warning_amber_rounded,
            accent: colors.loss,
            children: [
              for (final item in decisions.overRisk)
                TradeActionCard(
                  item: item,
                  showRiskWarning: true,
                  borderColor: colors.loss,
                  onTap: () => _openDetail(context, item.trade),
                  actions: [
                    EditTradeButton(trade: item.trade),
                    if (item.trade.status == TradeStatus.open)
                      CloseTradeButton(trade: item.trade),
                  ],
                ),
            ],
          ),
        // «محتاجة مراجعة» is gone. It fired on any open position untouched for
        // a week, which is not a decision — it is a reminder to journal, and it
        // filled the daily screen with cards asking for nothing in particular.
        // The sections left are the ones that name an actual action.
        if (decisions.waitingTooLong.isNotEmpty)
          ActionSection(
            title: 'منتظرة من زمان',
            count: decisions.waitingTooLongCount,
            icon: Icons.hourglass_bottom_rounded,
            accent: colors.breakeven,
            children: [
              for (final item in decisions.waitingTooLong)
                TradeActionCard(
                  item: item,
                  message:
                      'مفتوحة من ${quantity(item.daysSinceEntry)} يوم '
                      '(الحد ${quantity(settings.waitingThresholdDays)} يوم).',
                  onTap: () => _openDetail(context, item.trade),
                  actions: [
                    CloseTradeButton(trade: item.trade),
                    AddNoteButton(trade: item.trade),
                  ],
                ),
            ],
          ),
      ],
    );
  }

  static void _openDetail(BuildContext context, Trade trade) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => TradeDetailScreen(tradeId: trade.id)),
    );
  }
}
