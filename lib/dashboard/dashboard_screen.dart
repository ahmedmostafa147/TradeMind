import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/formatters.dart';
import '../core/theme.dart';
import '../core/widgets/app_logo_title.dart';
import '../settings/settings_providers.dart';
import 'analytics_screen.dart';
import 'dashboard_providers.dart';
import 'widgets/equity_chart.dart';
import 'widgets/portfolio_scenarios_card.dart';
import 'widgets/stat_card.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stats = ref.watch(journalStatsProvider);
    final settings = ref.watch(settingsProvider);
    final theme = Theme.of(context);
    final colors = context.resultColors;

    Color? signColor(double? value) {
      if (value == null) return null;
      if (value > 0) return colors.win;
      if (value < 0) return colors.loss;
      return null;
    }

    return Scaffold(
      appBar: AppBar(
        title: const AppLogoTitle(title: 'لوحة التحكم'),
        actions: [
          IconButton(
            icon: const Icon(Icons.insights_outlined),
            tooltip: 'الإحصائيات',
            onPressed: () => Navigator.of(
              context,
            ).push(MaterialPageRoute(builder: (_) => const AnalyticsScreen())),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          StatCard(
            label: 'رأس المال الحالي',
            value: money(stats.currentCapital),
            valueColor: signColor(stats.totalPnl),
            subtitle: 'يحتسب الصفقات المغلقة فقط',
          ),
          const SizedBox(height: 12),

          // Renders nothing when no position is open.
          const PortfolioScenariosCard(),

          _StatGrid(
            children: [
              StatCard(
                label: 'إجمالي الربح/الخسارة',
                value: stats.closedCount == 0
                    ? kEmptyValue
                    : signedMoney(stats.totalPnl),
                valueColor: signColor(stats.totalPnl),
              ),
              StatCard(
                label: 'العائد الكلي',
                value: stats.closedCount == 0
                    ? kEmptyValue
                    : percent(stats.totalReturnPct),
                valueColor: signColor(stats.totalReturnPct),
              ),
              StatCard(label: 'نسبة النجاح', value: percent(stats.winRate)),
              StatCard(
                label: 'متوسط R لكل صفقة',
                value: rMultiple(stats.averageR),
                valueColor: signColor(stats.averageR),
              ),
              StatCard(
                label: 'متوسط الصفقة الرابحة',
                value: money(stats.avgWinEgp),
                valueColor: stats.avgWinEgp == null ? null : colors.win,
              ),
              StatCard(
                label: 'متوسط الصفقة الخاسرة',
                value: money(stats.avgLossEgp),
                valueColor: stats.avgLossEgp == null ? null : colors.loss,
              ),
            ],
          ),
          const SizedBox(height: 12),

          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('عدد الصفقات', style: theme.textTheme.titleMedium),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _Count(label: 'مغلقة', value: stats.closedCount),
                      _Count(
                        label: 'رابحة',
                        value: stats.winCount,
                        color: colors.win,
                      ),
                      _Count(
                        label: 'خاسرة',
                        value: stats.lossCount,
                        color: colors.loss,
                      ),
                      if (stats.breakevenCount > 0)
                        _Count(
                          label: 'تعادل',
                          value: stats.breakevenCount,
                          color: colors.breakeven,
                        ),
                      _Count(
                        label: 'مفتوحة',
                        value: stats.openCount,
                        color: colors.open,
                      ),
                    ],
                  ),
                  // Only shown once these states are actually in use, so a
                  // journal that never plans or cancels keeps the phase-1 view.
                  if (stats.plannedCount > 0 || stats.cancelledCount > 0) ...[
                    const Divider(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _Count(
                          label: 'مخططة',
                          value: stats.plannedCount,
                          color: theme.colorScheme.primary,
                        ),
                        _Count(
                          label: 'ملغاة',
                          value: stats.cancelledCount,
                          color: colors.open,
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),

          if (stats.favoriteCount > 0 ||
              stats.averageChecklistCompletion != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _StatGrid(
                children: [
                  StatCard(
                    label: 'الصفقات المفضلة',
                    value: stats.favoriteCount == 0
                        ? kEmptyValue
                        : quantity(stats.favoriteCount),
                  ),
                  StatCard(
                    label: 'متوسط اكتمال القائمة',
                    value: percent(stats.averageChecklistCompletion),
                  ),
                ],
              ),
            ),

          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('منحنى رأس المال', style: theme.textTheme.titleMedium),
                  const SizedBox(height: 16),
                  EquityChart(
                    points: stats.equityCurve,
                    startingCapital: settings.capital,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatGrid extends StatelessWidget {
  final List<Widget> children;

  const _StatGrid({required this.children});

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.6,
      children: children,
    );
  }
}

class _Count extends StatelessWidget {
  final String label;
  final int value;
  final Color? color;

  const _Count({required this.label, required this.value, this.color});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: [
        NumericText(
          quantity(value),
          style: theme.textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        const SizedBox(height: 2),
        Text(label, style: theme.textTheme.bodySmall),
      ],
    );
  }
}
