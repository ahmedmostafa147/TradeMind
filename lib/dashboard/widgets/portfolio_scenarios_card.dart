import 'package:flutter/material.dart';
import '../../core/state/app_state.dart';

import '../../core/formatters.dart';
import '../../core/theme.dart';
import '../../core/widgets/risk_warning.dart';

/// «سيناريوهات المحفظة» — what the open book returns at both extremes, and
/// whether any single winner is big enough to carry the rest.
///
/// Hidden entirely when nothing is open: a scenario card over an empty book
/// would be a row of dashes.
class PortfolioScenariosCard extends StatelessWidget {
  const PortfolioScenariosCard({super.key});

  @override
  Widget build(BuildContext context) {
    final scenarios = context.portfolioScenarios;
    if (scenarios.openCount == 0) return const SizedBox.shrink();

    final theme = Theme.of(context);
    final colors = context.resultColors;

    // The gap lives here rather than at the call site, so an empty book leaves
    // no stray spacing behind.
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Text(
                    'سيناريوهات المحفظة',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    '${quantity(scenarios.openCount)} صفقة مفتوحة',
                    style: theme.textTheme.bodySmall,
                  ),
                ],
              ),
              const SizedBox(height: 12),

              ReadoutRow(
                label: 'إذا ربحت جميع الصفقات',
                value: signedMoney(scenarios.totalExpectedProfit),
                valueColor: colors.win,
                emphasise: true,
              ),
              ReadoutRow(
                label: 'إذا خسرت جميع الصفقات',
                value: signedMoney(scenarios.totalExpectedLoss),
                valueColor: colors.loss,
                emphasise: true,
              ),

              if (scenarios.hasOneWinnerAnalysis) ...[
                const Divider(height: 24),
                Text(
                  'لو صفقة واحدة بس وصلت الهدف والباقي ضرب الاستوب',
                  style: theme.textTheme.titleSmall,
                ),
                const SizedBox(height: 4),
                Text(
                  'بيوضّح لو صفقة ناجحة واحدة تقدر تعوّض باقي الخسائر.',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 12),
                for (final outcome in scenarios.oneWinner)
                  ReadoutRow(
                    label: outcome.ticker,
                    value: signedMoney(outcome.net),
                    valueColor: outcome.coversTheRest
                        ? colors.win
                        : colors.loss,
                  ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
