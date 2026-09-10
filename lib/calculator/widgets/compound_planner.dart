import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/calc/compound.dart';
import '../../core/formatters.dart';
import '../../settings/settings_providers.dart';

/// «خطة الادخار» — what a sum becomes, or what a goal costs per month.
///
/// TWO DIRECTIONS, BECAUSE PEOPLE ASK IT BOTH WAYS
/// [_Mode.grow] answers "I have this, what does it become". [_Mode.goal]
/// answers "I need this by then, what do I put aside" — which is how a goal is
/// actually phrased, and the reason the scenario chips exist.
///
/// WHAT THIS DELIBERATELY DOES NOT DO
/// It never suggests a rate. The field opens at whatever the user last implied
/// and every scenario carries a target and a horizon but no return, because
/// naming a return is the step from arithmetic to advice — and the published
/// terms say this app gives none. The caption under the result says so in the
/// user's own words rather than burying it in a legal page.
class CompoundPlanner extends ConsumerStatefulWidget {
  const CompoundPlanner({super.key});

  @override
  ConsumerState<CompoundPlanner> createState() => _CompoundPlannerState();
}

enum _Mode { grow, goal }

class _CompoundPlannerState extends ConsumerState<CompoundPlanner> {
  _Mode _mode = _Mode.grow;

  late final TextEditingController _initial;
  final _monthly = TextEditingController(text: '1000');
  final _target = TextEditingController(text: '800000');
  final _rate = TextEditingController(text: '15');
  final _years = TextEditingController(text: '10');
  final _inflation = TextEditingController(text: '20');

  String? _scenarioId;

  @override
  void initState() {
    super.initState();
    // Seeded from the account's capital rather than a made-up number: the user
    // already told the app what they have, and asking twice is how two
    // different figures for one portfolio start.
    final capital = ref.read(settingsProvider).capital;
    _initial = TextEditingController(text: capital.round().toString());
  }

  @override
  void dispose() {
    for (final c in [_initial, _monthly, _target, _rate, _years, _inflation]) {
      c.dispose();
    }
    super.dispose();
  }

  /// Every field calls this. The figures are recomputed in build() from the
  /// controllers, so there is no derived state to keep in sync — this only has
  /// to tell Flutter the panel is dirty.
  void _recompute() => setState(() {});

  double _num(TextEditingController c, [double fallback = 0]) =>
      parseNumber(c.text) ?? fallback;

  /// Percent fields are read as percents and handed on as FRACTIONS. This is the
  /// only place that conversion happens, exactly as the Settings screen owns it
  /// for maxRiskPercent — so nothing below has to guess the unit.
  double _fraction(TextEditingController c) => _num(c) / 100;

  void _applyScenario(SavingScenario s) {
    setState(() {
      _scenarioId = s.id;
      _mode = _Mode.goal;
      _target.text = s.target.round().toString();
      _years.text = s.years.toString();
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final years = _num(_years).round();

    final result = project(
      initial: _num(_initial),
      monthly: _mode == _Mode.grow
          ? _num(_monthly)
          : (monthlyNeededFor(
                  target: _num(_target),
                  initial: _num(_initial),
                  annualRate: _fraction(_rate),
                  years: years,
                ) ??
                0),
      annualRate: _fraction(_rate),
      years: years,
      annualInflation: _fraction(_inflation),
    );

    final needed = _mode == _Mode.goal
        ? monthlyNeededFor(
            target: _num(_target),
            initial: _num(_initial),
            annualRate: _fraction(_rate),
            years: years,
          )
        : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SegmentedButton<_Mode>(
          segments: const [
            ButtonSegment(
              value: _Mode.grow,
              label: Text('هيبقوا كام؟'),
              icon: Icon(Icons.trending_up),
            ),
            ButtonSegment(
              value: _Mode.goal,
              label: Text('أحوّش كام؟'),
              icon: Icon(Icons.flag_outlined),
            ),
          ],
          selected: {_mode},
          onSelectionChanged: (s) => setState(() {
            _mode = s.first;
            _scenarioId = null;
          }),
        ),
        const SizedBox(height: 20),

        Text('ابدأ من هدف', style: theme.textTheme.titleSmall),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final s in kSavingScenarios)
              ChoiceChip(
                label: Text(s.label),
                selected: _scenarioId == s.id,
                onSelected: (_) => _applyScenario(s),
              ),
          ],
        ),
        if (_scenarioId != null) ...[
          const SizedBox(height: 10),
          Text(
            kSavingScenarios.firstWhere((s) => s.id == _scenarioId).description,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
        const SizedBox(height: 20),

        _Field(controller: _initial, label: 'المبلغ اللي معاك دلوقتي', suffix: 'ج.م', onChanged: _recompute),
        const SizedBox(height: 12),
        if (_mode == _Mode.grow)
          _Field(controller: _monthly, label: 'بتضيف كل شهر', suffix: 'ج.م', onChanged: _recompute)
        else
          _Field(controller: _target, label: 'المبلغ اللي عايز توصله', suffix: 'ج.م', onChanged: _recompute),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _Field(controller: _rate, label: 'عائد سنوي متوقّع', suffix: '%', onChanged: _recompute),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _Field(controller: _years, label: 'المدة', suffix: 'سنة', onChanged: _recompute),
            ),
          ],
        ),
        const SizedBox(height: 12),
        _Field(controller: _inflation, label: 'تضخّم سنوي متوقّع', suffix: '%', onChanged: _recompute),

        const SizedBox(height: 24),

        Card(
          margin: EdgeInsets.zero,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_mode == _Mode.goal) ...[
                  _Headline(
                    label: 'لازم تحوّش كل شهر',
                    value: needed == null ? '—' : money(needed),
                    emphasise: true,
                  ),
                  const Divider(height: 24),
                ],
                _Headline(
                  label: 'بعد $years سنة هيبقى معاك',
                  value: money(result.futureValue),
                  emphasise: _mode == _Mode.grow,
                ),
                const SizedBox(height: 14),
                _Row(label: 'اللي دفعته من جيبك', value: money(result.totalContributed)),
                _Row(label: 'اللي زاد لوحده', value: money(result.totalGrowth)),
                const Divider(height: 24),
                // The honest number, given last and given weight. A projection
                // that reports only the nominal figure tells someone they will
                // be rich when it has mostly counted the currency shrinking.
                _Headline(
                  label: 'قيمتهم بفلوس النهاردة',
                  value: money(result.realValue),
                  emphasise: false,
                ),
                Text(
                  'يعني الـ${money(result.futureValue)} دي هتشتري بقد '
                  '${money(result.realValue)} النهاردة، لو التضخّم فضل زي ما حطيته.',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 16),
        // Not boilerplate. RELEASE.md keeps this app out of Play's restricted
        // financial categories on the strength of saying this outright, and the
        // terms make the same promise.
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            'دي حسبة رياضية على عائد ثابت انت اللي بتفترضه — مش توقّع ولا وعد. '
            'السوق مبيديش عائد ثابت، وفيه سنين بتخسر. رادار مبيرشّحش استثمار '
            'ولا بيقولك تحط فلوسك فين.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ),
      ],
    );
  }
}

class _Field extends StatelessWidget {
  const _Field({
    required this.controller,
    required this.label,
    required this.suffix,
    required this.onChanged,
  });

  final TextEditingController controller;
  final String label;
  final String suffix;

  /// The parent's setState. Passed explicitly rather than reached for through
  /// the element tree: the result panel lives in the parent, so the parent is
  /// what has to rebuild, and a field that marked only itself dirty would leave
  /// every figure on screen stale until something else happened to repaint.
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      // `parseNumber` accepts Arabic-Indic digits because the Arabic keyboard
      // emits them, so the softest numeric keyboard is safe here.
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      textDirection: TextDirection.ltr,
      decoration: InputDecoration(
        labelText: label,
        suffixText: suffix,
        border: const OutlineInputBorder(),
      ),
      onChanged: (_) => onChanged(),
    );
  }
}

class _Headline extends StatelessWidget {
  const _Headline({
    required this.label,
    required this.value,
    required this.emphasise,
  });

  final String label;
  final String value;
  final bool emphasise;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: theme.textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.w800,
            color: emphasise ? theme.colorScheme.primary : null,
          ),
        ),
      ],
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: theme.textTheme.bodyMedium),
          Text(
            value,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}
