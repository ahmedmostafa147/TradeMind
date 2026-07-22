import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/calc/journal_analytics.dart';
import '../core/formatters.dart';
import '../core/theme.dart';
import '../core/widgets/risk_warning.dart';
import 'dashboard_providers.dart';
import 'widgets/stat_card.dart';

/// Section 16 — the deeper statistics, kept off the dashboard so the daily
/// view stays scannable.
class AnalyticsScreen extends ConsumerWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final a = ref.watch(journalAnalyticsProvider);
    final colors = context.resultColors;

    Color? signColor(double? value) {
      if (value == null) return null;
      if (value > 0) return colors.win;
      if (value < 0) return colors.loss;
      return null;
    }

    return Scaffold(
      appBar: AppBar(title: const Text('الإحصائيات')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _SectionTitle('جودة الأداء'),
          _Grid(
            children: [
              StatCard(
                label: 'التوقع لكل صفقة',
                value: money(a.expectancy),
                valueColor: signColor(a.expectancy),
                subtitle: 'متوسط الناتج لكل صفقة مغلقة',
              ),
              StatCard(
                label: 'معامل الربح',
                value: a.profitFactor == null
                    ? kEmptyValue
                    : _ratio(a.profitFactor!),
                valueColor: a.profitFactor == null
                    ? null
                    : (a.profitFactor! >= 1 ? colors.win : colors.loss),
                subtitle: 'إجمالي الأرباح ÷ إجمالي الخسائر',
              ),
              StatCard(
                label: 'متوسط R',
                value: rMultiple(a.averageR),
                valueColor: signColor(a.averageR),
              ),
              StatCard(
                label: 'وسيط R',
                value: rMultiple(a.medianR),
                valueColor: signColor(a.medianR),
                subtitle: 'أقل تأثرًا بالصفقات الشاذة',
              ),
            ],
          ),
          const SizedBox(height: 20),

          _SectionTitle('الأرباح والخسائر'),
          _Grid(
            children: [
              StatCard(
                label: 'متوسط الربح',
                value: money(a.averageProfit),
                valueColor: a.averageProfit == null ? null : colors.win,
              ),
              StatCard(
                label: 'متوسط الخسارة',
                value: money(a.averageLoss),
                valueColor: a.averageLoss == null ? null : colors.loss,
              ),
              StatCard(
                label: 'أكبر مكسب',
                value: money(a.largestGain),
                valueColor: a.largestGain == null ? null : colors.win,
              ),
              StatCard(
                label: 'أكبر خسارة',
                value: money(a.largestLoss),
                valueColor: a.largestLoss == null ? null : colors.loss,
              ),
            ],
          ),
          const SizedBox(height: 20),

          _SectionTitle('التوقيت'),
          _Grid(
            children: [
              StatCard(
                label: 'أفضل يوم',
                value: weekdayName(a.bestWeekday),
                subtitle: a.bestWeekdayPnl == null
                    ? null
                    : signedMoney(a.bestWeekdayPnl),
                valueColor: signColor(a.bestWeekdayPnl),
              ),
              StatCard(
                label: 'أسوأ يوم',
                value: weekdayName(a.worstWeekday),
                subtitle: a.worstWeekdayPnl == null
                    ? null
                    : signedMoney(a.worstWeekdayPnl),
                valueColor: signColor(a.worstWeekdayPnl),
              ),
              StatCard(
                label: 'أفضل شهر',
                value: monthName(a.bestMonth),
                subtitle: a.bestMonthPnl == null
                    ? null
                    : signedMoney(a.bestMonthPnl),
                valueColor: signColor(a.bestMonthPnl),
              ),
              StatCard(
                label: 'أسوأ شهر',
                value: monthName(a.worstMonth),
                subtitle: a.worstMonthPnl == null
                    ? null
                    : signedMoney(a.worstMonthPnl),
                valueColor: signColor(a.worstMonthPnl),
              ),
            ],
          ),
          const SizedBox(height: 20),

          _SectionTitle('الانضباط والسلوك'),
          _Grid(
            children: [
              StatCard(
                label: 'متوسط مدة الاحتفاظ',
                value: a.averageHoldingDays == null
                    ? kEmptyValue
                    : '${_oneDecimal(a.averageHoldingDays!)} يوم',
              ),
              StatCard(
                label: 'أطول سلسلة ربح',
                value: a.longestWinStreak == 0
                    ? kEmptyValue
                    : quantity(a.longestWinStreak),
                valueColor: a.longestWinStreak == 0 ? null : colors.win,
              ),
              StatCard(
                label: 'أطول سلسلة خسارة',
                value: a.longestLossStreak == 0
                    ? kEmptyValue
                    : quantity(a.longestLossStreak),
                valueColor: a.longestLossStreak == 0 ? null : colors.loss,
              ),
              StatCard(
                label: 'الأكثر تداولًا',
                value: a.mostTradedTicker ?? kEmptyValue,
                subtitle: a.mostTradedTicker == null
                    ? null
                    : '${quantity(a.mostTradedTickerCount)} صفقة',
              ),
              StatCard(
                label: 'متوسط قيمة المركز',
                value: money(a.averagePositionValue),
              ),
              StatCard(
                label: 'متوسط نسبة المخاطرة',
                value: percent(a.averageRiskPct),
              ),
            ],
          ),
          const SizedBox(height: 20),

          if (a.bestTrade != null || a.worstTrade != null) ...[
            _SectionTitle('أبرز الصفقات'),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    if (a.bestTrade != null)
                      _ExtremeRow(
                        label: 'أفضل صفقة',
                        extreme: a.bestTrade!,
                        color: colors.win,
                      ),
                    if (a.bestTrade != null && a.worstTrade != null)
                      const Divider(height: 20),
                    if (a.worstTrade != null)
                      _ExtremeRow(
                        label: 'أسوأ صفقة',
                        extreme: a.worstTrade!,
                        color: colors.loss,
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
          ],

          if (a.sourceStats.isNotEmpty) ...[
            _SectionTitle('مصادر الترشيحات'),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    for (final source in a.sourceStats)
                      ReadoutRow(
                        label:
                            '${source.tag}  ·  '
                            '${quantity(source.winCount)}/'
                            '${quantity(source.tradeCount)} رابحة',
                        value: signedMoney(source.totalPnl),
                        valueColor: signColor(source.totalPnl),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
          ],

          if (a.tagStats.isNotEmpty) ...[
            _SectionTitle('التصنيفات'),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    for (final tag in a.tagStats) ...[
                      ReadoutRow(
                        label: '${tag.tag}  ·  ${quantity(tag.tradeCount)} صفقة',
                        value: signedMoney(tag.totalPnl),
                        valueColor: signColor(tag.totalPnl),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
          ],

          if (a.monthlyPnl.isNotEmpty) ...[
            _SectionTitle('الأداء الشهري'),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    for (final period in a.monthlyPnl.reversed)
                      ReadoutRow(
                        label:
                            '${monthYearLabel(period.start)}  ·  '
                            '${quantity(period.tradeCount)} صفقة',
                        value: signedMoney(period.pnl),
                        valueColor: signColor(period.pnl),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  static String _ratio(double value) => value.toStringAsFixed(2);
  static String _oneDecimal(double value) => value.toStringAsFixed(1);
}

class _SectionTitle extends StatelessWidget {
  final String text;

  const _SectionTitle(this.text);

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Text(
      text,
      style: Theme.of(
        context,
      ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
    ),
  );
}

class _Grid extends StatelessWidget {
  final List<Widget> children;

  const _Grid({required this.children});

  @override
  Widget build(BuildContext context) => GridView.count(
    shrinkWrap: true,
    physics: const NeverScrollableScrollPhysics(),
    crossAxisCount: 2,
    mainAxisSpacing: 12,
    crossAxisSpacing: 12,
    childAspectRatio: 1.45,
    children: children,
  );
}

class _ExtremeRow extends StatelessWidget {
  final String label;
  final TradeExtreme extreme;
  final Color color;

  const _ExtremeRow({
    required this.label,
    required this.extreme,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: theme.textTheme.bodySmall),
              const SizedBox(height: 2),
              Text(
                extreme.ticker,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              NumericText(
                dateLabel(extreme.exitDate),
                style: theme.textTheme.bodySmall,
              ),
            ],
          ),
        ),
        NumericText(
          signedMoney(extreme.pnl),
          style: theme.textTheme.titleMedium?.copyWith(
            color: color,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }
}
