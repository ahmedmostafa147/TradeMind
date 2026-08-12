import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/calc/goal_plan.dart';
import '../core/calc/goal_projection.dart';
import '../core/formatters.dart';
import '../core/theme.dart';
import '../settings/settings_providers.dart';
import '../trades/trades_providers.dart';
import 'dashboard_providers.dart';
import 'widgets/goal_planner_card.dart';

/// «الهدف» — two questions about the same target, kept apart on purpose.
///
/// 1. «بالتداول» — how long the JOURNAL says the target takes, over
///    core/calc/goal_projection.dart. It never invents a return rate: every
///    figure comes from closed trades the user logged themselves, and when
///    those trades say the target is unreachable it says so plainly rather than
///    producing a large but survivable-looking number of months. A projection
///    tool that always returns an encouraging answer is a slot machine with a
///    spreadsheet on it.
///
/// 2. «بالادخار» — [GoalPlannerCard], the landing page's calculator, over
///    core/calc/goal_plan.dart. Its rate IS an assumption, which is why it is
///    labelled as one everywhere it appears.
///
/// THE TWO ARE NOT MERGED, AND MUST NOT BE. Feeding the journal's measured rate
/// into the planner as an unmarked default would turn a measurement into a
/// forecast — the exact move the projection was written to avoid. It is offered
/// as one tap, with its source on the label.
///
/// The counterpart of site/components/dashboard/goal-panel.tsx.
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
      // Bottom padding clears the hub's floating action button.
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
                  'اكتب المبلغ اللي عايز توصله، والحساب بيتعمل على أداءك '
                  'الحقيقي في الدفتر — مش على نسبة عائد مفترضة.',
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
          _Answer(projection: projection, capital: settings.capital),
        ],
        const SizedBox(height: 16),
        GoalPlannerCard(
          capital: settings.capital,
          // Null whenever the journal has no usable edge, and a house number is
          // NOT substituted: a default that looks measured but is not is worse
          // than an obviously arbitrary one.
          suggestedAnnualReturn: projection?.kind == ProjectionKind.reachable
              ? annualReturnFromMonthlyRate(projection!.monthlyRate)
              : null,
        ),
      ],
    );
  }
}

class _Answer extends StatelessWidget {
  final GoalProjection projection;
  final double capital;

  const _Answer({required this.projection, required this.capital});

  @override
  Widget build(BuildContext context) {
    return switch (projection.kind) {
      ProjectionKind.alreadyThere => const _Note(
        title: 'انت وصلت خلاص',
        body: 'المبلغ ده أقل من أو يساوي رأس مالك الحالي. حط رقم أكبر لو عايز '
            'تشوف المدة.',
      ),
      ProjectionKind.notEnoughHistory => _Note(
        title: 'لسه بدري على التوقّع',
        body:
            'عندك ${projection.closedCount} صفقة مقفولة، والحساب محتاج '
            '$kMinClosedTradesForProjection على الأقل. أقل من كده، صفقة واحدة '
            'محظوظة بتحرّك المتوسط كله وبيطلع رقم شكله واثق ومش وراه حاجة.',
      ),
      ProjectionKind.noEdge => _NoEdge(projection: projection),
      ProjectionKind.reachable => _Reachable(
        projection: projection,
        capital: capital,
      ),
    };
  }
}

/// The answer that matters most, and the one a friendlier tool would bury.
class _NoEdge extends StatelessWidget {
  final GoalProjection projection;
  const _NoEdge({required this.projection});

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
              'متوسط ناتج الصفقة الواحدة عندك '
              '${signedMoney(projection.expectancy)} — يعني الدفتر بيخسر في '
              'المتوسط، مش بيكسب. المدة هنا مش رقم كبير، هي مفيش: مهما استنيت، '
              'المتوسط السالب بيبعّدك عن الهدف مش بيقرّبك.',
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'السؤال المفيد مش «هوصل إمتى» — هو «إيه اللي بيخسّرني». بُص في '
              'التحليلات على الأداء حسب التصنيف والمصدر، ودرجة الانضباط.',
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

class _Reachable extends StatelessWidget {
  final GoalProjection projection;
  final double capital;

  const _Reachable({required this.projection, required this.capital});

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
                'بالمعدّل الحالي ده هياخد أكتر من 50 سنة. الرقم ده مش توقّع، هو '
                'إشارة إن الهدف والمعدّل مش على نفس المقياس — يا إما الهدف يقلّ، '
                'يا إما المعدّل يزيد.',
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
            const Divider(height: 24),
            // The working, so the number can be audited rather than believed.
            _Row(
              label: 'متوسط ناتج الصفقة',
              value: signedMoney(projection.expectancy),
            ),
            _Row(
              label: 'صفقات في الشهر',
              value: projection.tradesPerMonth!.toStringAsFixed(1),
            ),
            _Row(
              label: 'ربح شهري متوقّع',
              value: signedMoney(projection.monthlyProfit),
            ),
            const SizedBox(height: 12),
            Text(
              'الحساب بيفترض إنك بتكبّر حجم الصفقة مع نمو رأس المال — زي ما '
              'الحاسبة بتحسبها من رأس مالك ونسبة المخاطرة. ودي مش وعد ولا '
              'ضمان: هي بس امتداد لأرقامك اللي فاتت لو فضلت تتداول بنفس '
              'الطريقة، والسوق مش بيلتزم بالمتوسطات.',
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

class _Row extends StatelessWidget {
  final String label;
  final String value;
  const _Row({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          NumericText(
            value,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}

class _Note extends StatelessWidget {
  final String title;
  final String body;
  const _Note({required this.title, required this.body});

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

/// «سنة و٣ شهور» rather than «15 شهر».
///
/// Arabic duals and plurals do not follow the English pattern — ١ شهر,
/// ٢ شهرين, ٣-١٠ شهور, ١١+ شهر — so this is spelled out rather than templated.
/// Mirrors monthsLabel in site/lib/projection.ts.
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
