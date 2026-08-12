import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/calc/goal_plan.dart';
import '../core/calc/goal_projection.dart';
import '../core/formatters.dart';
import '../settings/settings_providers.dart';
import '../trades/trades_providers.dart';
import 'dashboard_providers.dart';
import 'widgets/goal_planner_card.dart';
import 'widgets/goal_projection_widgets.dart';

/// «الهدف» — two questions about the same target, kept apart on purpose.
class GoalView extends ConsumerStatefulWidget {
  const GoalView({super.key});

  @override
  ConsumerState<GoalView> createState() => _GoalViewState();
}

class _GoalViewState extends ConsumerState<GoalView> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final settings = ref.watch(settingsProvider);
    final analytics = ref.watch(journalAnalyticsProvider);
    final trades = ref.watch(tradesProvider);

    final target = parseNumber(_controller.text);
    final projection = (target == null || target <= 0)
        ? null
        : projectGoal(
            trades: trades,
            capital: settings.capital,
            target: target,
            expectancy: analytics.expectancy,
          );

    return ListView(
      key: const ValueKey('goal-list'),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
      children: [
        Card(
          margin: EdgeInsets.zero,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'بالتداول: هتوصل إمتى',
                  style: theme.textTheme.titleMedium,
                ),
                const SizedBox(height: 4),
                Text(
                  'اكتب المبلغ اللي عايز توصله، والحساب بيتعمل على أداءك الحقيقي في الدفتر.',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'رأس مالك دلوقتي',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                NumericText(
                  money(settings.capital),
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _controller,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  textDirection: TextDirection.ltr,
                  decoration: const InputDecoration(
                    labelText: 'عايز توصل لكام',
                    suffixText: kCurrencySuffix,
                    hintText: '1000000',
                  ),
                  onChanged: (_) => setState(() {}),
                ),
              ],
            ),
          ),
        ),
        if (projection != null) ...[
          const SizedBox(height: 16),
          GoalAnswerWidget(
            projection: projection,
            capital: settings.capital,
          ),
        ],
        const SizedBox(height: 16),
        GoalPlannerCard(
          capital: settings.capital,
          suggestedAnnualReturn: projection?.kind == ProjectionKind.reachable
              ? annualReturnFromMonthlyRate(projection!.monthlyRate)
              : null,
        ),
      ],
    );
  }
}
