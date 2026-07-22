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
        if (decisions.needsReview.isNotEmpty)
          ActionSection(
            title: 'محتاجة مراجعة',
            count: decisions.needsReviewCount,
            icon: Icons.rate_review_outlined,
            accent: colors.breakeven,
            children: [
              for (final item in decisions.needsReview)
                TradeActionCard(
                  item: item,
                  message: 'راجع الصفقة وأضف ملاحظاتك.',
                  onTap: () => _openDetail(context, item.trade),
                  actions: [
                    AddNoteButton(trade: item.trade),
                    EditTradeButton(trade: item.trade),
                  ],
                ),
            ],
          ),
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
