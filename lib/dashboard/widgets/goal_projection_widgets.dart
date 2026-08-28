import 'package:flutter/material.dart';

import '../../core/calc/goal_projection.dart';
import '../../core/formatters.dart';
import '../../core/theme.dart';

class GoalAnswerWidget extends StatelessWidget {
  final GoalProjection projection;
  final double capital;

  const GoalAnswerWidget({
    super.key,
    required this.projection,
    required this.capital,
  });

  @override
  Widget build(BuildContext context) {
    return switch (projection.kind) {
      // Listed first for the same reason the web panel puts it first: without a
      // capital none of the other answers can be computed, and the fix is one
      // field away, so the note names it.
      ProjectionKind.noCapital => const GoalNoteWidget(
          title: 'حدّد رأس مالك الأول',
          body:
              'التوقّع بيتحسب من ربح الشهر ÷ رأس المال، ورأس مالك لسه مش متسجّل. اكتبه في الإعدادات وارجع.',
        ),
      ProjectionKind.alreadyThere => const GoalNoteWidget(
          title: 'انت وصلت خلاص',
          body: 'المبلغ ده أقل من أو يساوي رأس مالك الحالي. حط رقم أكبر لو عايز تشوف المدة.',
        ),
      ProjectionKind.notEnoughHistory => GoalNoteWidget(
          title: 'لسه بدري على التوقّع',
          body: 'عندك ${projection.closedCount} صفقة مقفولة، والحساب محتاج $kMinClosedTradesForProjection على الأقل.',
        ),
      ProjectionKind.noEdge => GoalNoEdgeWidget(projection: projection),
      ProjectionKind.reachable => GoalReachableWidget(
          projection: projection,
          capital: capital,
        ),
    };
  }
}

class GoalNoEdgeWidget extends StatelessWidget {
  final GoalProjection projection;
  const GoalNoEdgeWidget({super.key, required this.projection});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.resultColors;

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'بالأداء الحالي، مش هتوصل للهدف ده',
              style: theme.textTheme.titleMedium?.copyWith(color: colors.loss),
            ),
            const SizedBox(height: 8),
            Text(
              'متوسط ناتج الصفقة الواحدة عندك ${signedMoney(projection.expectancy)} — يعني الدفتر بيخسر في المتوسط، مش بيكسب.',
              style: theme.textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }
}

class GoalReachableWidget extends StatelessWidget {
  final GoalProjection projection;
  final double capital;

  const GoalReachableWidget({
    super.key,
    required this.projection,
    required this.capital,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              projection.beyondHorizon ? 'الهدف بعيد جدًا' : 'التوقّع',
              style: theme.textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            if (projection.beyondHorizon)
              Text(
                'بالمعدّل الحالي ده هياخد أكتر من 50 سنة.',
                style: theme.textTheme.bodyMedium,
              )
            else ...[
              Text(
                monthsLabel(projection.months),
                style: theme.textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              NumericText(
                '${projection.months} شهر بالمعدّل الحالي',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class GoalNoteWidget extends StatelessWidget {
  final String title;
  final String body;
  const GoalNoteWidget({super.key, required this.title, required this.body});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(
              body,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

String monthsLabel(int months) {
  final years = months ~/ 12;
  final rest = months % 12;

  final monthPart = switch (rest) {
    0 => '',
    1 => 'شهر',
    2 => 'شهرين',
    <= 10 => '$rest شهور',
    _ => '$rest شهر',
  };

  if (years == 0) return monthPart;

  final yearPart = switch (years) {
    1 => 'سنة',
    2 => 'سنتين',
    <= 10 => '$years سنين',
    _ => '$years سنة',
  };

  return monthPart.isEmpty ? yearPart : '$yearPart و$monthPart';
}
