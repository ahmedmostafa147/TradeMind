import 'package:flutter/material.dart';
import '../../core/state/app_state.dart';

import '../../core/calc/daily_decisions.dart';
import '../../core/formatters.dart';
import '../../core/theme.dart';
import '../../trades/trade.dart';
import '../../trades/trade_detail_screen.dart';
import '../../watchlist/watchlist_item.dart';
import 'active_decision_sections.dart';
import 'action_section.dart';
import 'trade_action_buttons.dart';
import 'trade_action_card.dart';
import 'watchlist_card.dart';

class TodaySectionsList extends StatelessWidget {
  final DailyDecisions decisions;
  final List<WatchlistItem> watchlist;

  const TodaySectionsList({
    super.key,
    required this.decisions,
    required this.watchlist,
  });

  @override
  Widget build(BuildContext context) {
    final settings = context.settings;
    final colors = context.resultColors;

    return Column(
      children: [
        ActiveDecisionSections(decisions: decisions, settings: settings),
        if (decisions.open.isNotEmpty)
          ActionSection(
            title: 'الصفقات المفتوحة',
            count: decisions.openCount,
            icon: Icons.trending_up_rounded,
            children: [
              for (final item in decisions.open)
                TradeActionCard(
                  item: item,
                  onTap: () => _openDetail(context, item.trade),
                  actions: [
                    AddNoteButton(trade: item.trade),
                    CloseTradeButton(trade: item.trade),
                    EditTradeButton(trade: item.trade),
                  ],
                ),
            ],
          ),
        if (decisions.planned.isNotEmpty)
          ActionSection(
            title: 'الصفقات المخططة',
            count: decisions.plannedCount,
            icon: Icons.lightbulb_outline_rounded,
            children: [
              for (final item in decisions.planned)
                TradeActionCard(
                  item: item,
                  onTap: () => _openDetail(context, item.trade),
                  actions: [
                    MarkOpenButton(trade: item.trade),
                    EditTradeButton(trade: item.trade),
                    CancelTradeButton(trade: item.trade),
                  ],
                ),
            ],
          ),
        if (watchlist.isNotEmpty)
          ActionSection(
            title: 'قائمة المتابعة',
            count: watchlist.length,
            icon: Icons.visibility_outlined,
            children: [
              for (final item in watchlist) WatchlistCard(item: item),
            ],
          ),
        if (decisions.recentlyClosed.isNotEmpty)
          ActionSection(
            title: 'أُقفلت مؤخرًا',
            count: decisions.closedThisWeekCount,
            icon: Icons.check_circle_outline_rounded,
            accent: colors.win,
            children: [
              for (final item in decisions.recentlyClosed)
                TradeActionCard(
                  item: item,
                  message: item.metrics.pnl == null
                      ? null
                      : '${signedMoney(item.metrics.pnl)}  ·  '
                          '${rMultiple(item.metrics.rMultiple)}',
                  onTap: () => _openDetail(context, item.trade),
                  actions: [
                    AddNoteButton(trade: item.trade, asLesson: true),
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
