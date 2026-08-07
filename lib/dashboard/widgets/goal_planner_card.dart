import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/calc/goal_plan.dart';
import '../../core/formatters.dart';

/// «بالادخار: تحطّ كام كل شهر» — the landing page's calculator, in the app.
///
/// The counterpart of site/components/goal-planner-body.tsx, over the same
/// arithmetic in core/calc/goal_plan.dart.
///
/// IT IS DELIBERATELY NOT THE PROJECTION ABOVE IT. `GoalView`'s first card asks
/// «بأداء دفترك، توصل إمتى» and refuses to invent a return rate. This one asks
/// the savings question, and its rate is AN ASSUMPTION THE USER TYPES — said in
/// the label, in the hint, and again under the result, because a calculator
/// that prints a future number is the one place a reader is most likely to take
/// an assumption for a forecast.
class GoalPlannerCard extends StatefulWidget {
  /// The annual rate the journal is actually running at, when there is one.
  ///
  /// Offered as one tap, never applied silently — see the class comment on
  /// site/components/dashboard/goal-panel.tsx.
  final double? suggestedAnnualReturn;

  /// Pre-fills «معاك كام دلوقتي» from settings, since the app already knows it.
  final double capital;

  const GoalPlannerCard({
    super.key,
    required this.capital,
    this.suggestedAnnualReturn,
  });

  @override
  State<GoalPlannerCard> createState() => _GoalPlannerCardState();
}

class _GoalPlannerCardState extends State<GoalPlannerCard> {
  GoalPlanMode _mode = GoalPlanMode.targetToMonthly;

  late final TextEditingController _targetController;
  late final TextEditingController _monthlyController;
  late final TextEditingController _yearsController;
  late final TextEditingController _returnController;
  late final TextEditingController _initialController;

  String? _activePreset = 'kids';

  @override
  void initState() {
    super.initState();
    _targetController = TextEditingController(text: '2000000');
    _monthlyController = TextEditingController(text: '3000');
    _yearsController = TextEditingController(text: '18');
    // Starts EMPTY, not at a house number: a pre-filled rate is a return figure
    // presented by us, which is the claim the disclaimer keeps the product
    // clear of.
    _returnController = TextEditingController();
    _initialController = TextEditingController(
      text: widget.capital > 0 ? widget.capital.round().toString() : '',
    );
  }

  @override
  void dispose() {
    _targetController.dispose();
    _monthlyController.dispose();
    _yearsController.dispose();
    _returnController.dispose();
    _initialController.dispose();
    super.dispose();
  }

  void _applyPreset(_GoalPreset preset) {
    setState(() {
      _activePreset = preset.id;
      _targetController.text = preset.target.toString();
      _yearsController.text = preset.years.toString();
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final suggested = widget.suggestedAnnualReturn;

    final plan = computeGoalPlan(
      mode: _mode,
      targetAmount: parseNumber(_targetController.text),
      monthlyDeposit: parseNumber(_monthlyController.text),
      years: parseNumber(_yearsController.text),
      annualReturnPercent: parseNumber(_returnController.text),
      initialAmount: parseNumber(_initialController.text),
    );

    final years = _yearsController.text.trim();

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('بالادخار: تحطّ كام كل شهر',
                style: theme.textTheme.titleMedium),
            const SizedBox(height: 4),
            Text(
              'سؤال تاني خالص: مش «دفترك بيقول إيه» — ده «لو العائد طلع كذا، '
              'المطلوب مني كام». نسبة العائد هنا فرضية بتكتبها انت.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 16),

            // A Wrap of chips, not a SegmentedButton: a segmented control
            // cannot wrap, and two Arabic labels with icons overflowed by
            // 155px at 320. This is also the same control `StatusSelector`
            // uses, so the two screens read as one app.
            Text(
              'الحساب في الاتجاه ده:',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final entry in const {
                  GoalPlanMode.targetToMonthly: (
                    'عايز أوصل لمبلغ',
                    Icons.adjust_rounded,
                  ),
                  GoalPlanMode.monthlyToTarget: (
                    'هحطّ شهريًا',
                    Icons.savings_outlined,
                  ),
                }.entries)
                  ChoiceChip(
                    avatar: Icon(entry.value.$2, size: 18),
                    label: Text(entry.value.$1),
                    selected: _mode == entry.key,
                    onSelected: (_) => setState(() => _mode = entry.key),
                  ),
              ],
            ),
            const SizedBox(height: 16),

            Text(
              'ابدأ من هدف جاهز:',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final preset in _presets)
                  ChoiceChip(
                    avatar: Icon(preset.icon, size: 18),
                    label: Text(preset.title),
                    selected: _activePreset == preset.id,
                    onSelected: (_) => _applyPreset(preset),
                  ),
              ],
            ),
            const SizedBox(height: 16),

            if (_mode == GoalPlanMode.targetToMonthly)
              _Field(
                controller: _targetController,
                label: 'المبلغ اللي عايز توصله',
                suffix: kCurrencySuffix,
                onChanged: () => setState(() {}),
              )
            else
              _Field(
                controller: _monthlyController,
                label: 'هتحطّ كام كل شهر',
                suffix: kCurrencySuffix,
                onChanged: () => setState(() {}),
              ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _Field(
                    controller: _yearsController,
                    label: 'المدة',
                    suffix: 'سنة',
                    onChanged: () => setState(() {}),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _Field(
                    controller: _returnController,
                    label: 'العائد السنوي اللي بتفترضه',
                    suffix: '%',
                    helperText: suggested == null
                        ? 'رقم بتفترضه انت — مش توقّع مننا.'
                        : null,
                    onChanged: () => setState(() {}),
                  ),
                ),
              ],
            ),
            if (suggested != null) ...[
              const SizedBox(height: 8),
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: ActionChip(
                  avatar: const Icon(Icons.insights_rounded, size: 18),
                  label: Text('من دفترك: ${percent(suggested / 100)}'),
                  onPressed: () => setState(
                    () => _returnController.text = suggested.toStringAsFixed(1),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 12),
            _Field(
              controller: _initialController,
              label: 'معاك كام دلوقتي (اختياري)',
              suffix: kCurrencySuffix,
              onChanged: () => setState(() {}),
            ),

            const Divider(height: 32),

            _Headline(plan: plan, mode: _mode, years: years),
            const SizedBox(height: 16),
            _Row(label: 'اللي هتوصله في الآخر', value: money(plan.futureValue)),
            _Row(label: 'اللي دفعته من جيبك', value: money(plan.totalDeposited)),
            _Row(
              label: 'اللي جه من العائد',
              value: '+${money(plan.growth)}',
              emphasise: true,
            ),
            const SizedBox(height: 12),
            Text(
              plan.monthlyRate == 0
                  ? 'من غير عائد، اللي بتوصله هو بالظبط اللي دفعته. اكتب نسبة '
                      'عائد فوق عشان تشوف فرق التراكم.'
                  : 'لو العائد فضل زي ما افترضته، '
                      '${percent(plan.growthShare ?? 0)} من اللي هتوصله ده جاي '
                      'من العائد نفسه مش من جيبك. ودي فرضية مش وعد — السوق مش '
                      'بيلتزم بمتوسط.',
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

class _Headline extends StatelessWidget {
  final GoalPlan plan;
  final GoalPlanMode mode;
  final String years;

  const _Headline({
    required this.plan,
    required this.mode,
    required this.years,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final showsMonthly =
        mode == GoalPlanMode.targetToMonthly && !plan.coveredByInitial;

    final caption = plan.coveredByInitial
        ? 'اللي معاك دلوقتي بيوصلك لوحده'
        : showsMonthly
            ? 'المبلغ المطلوب كل شهر'
            : 'اللي هتوصله بعد المدة';

    final footnote = plan.coveredByInitial
        ? 'من غير ما تحطّ ولا جنيه زيادة'
        : showsMonthly
            ? 'على مدى $years سنة'
            : 'بعد $years سنة';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          caption,
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 4),
        NumericText(
          showsMonthly ? money(plan.monthlyDeposit) : money(plan.futureValue),
          style: theme.textTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          footnote,
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}

class _Field extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String suffix;
  final String? helperText;
  final VoidCallback onChanged;

  const _Field({
    required this.controller,
    required this.label,
    required this.suffix,
    required this.onChanged,
    this.helperText,
  });

  @override
  Widget build(BuildContext context) => TextField(
        controller: controller,
        onChanged: (_) => onChanged(),
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        inputFormatters: [
          FilteringTextInputFormatter.allow(RegExp(r'[0-9.٠-٩]')),
        ],
        textDirection: TextDirection.ltr,
        textAlign: TextAlign.right,
        decoration: InputDecoration(
          labelText: label,
          suffixText: suffix,
          helperText: helperText,
          helperMaxLines: 2,
        ),
      );
}

class _Row extends StatelessWidget {
  final String label;
  final String value;
  final bool emphasise;

  const _Row({
    required this.label,
    required this.value,
    this.emphasise = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      // The label takes the slack and wraps; the figure never does. A fixed
      // pair of Texts here overflowed by 179px at 320 — «اللي هتوصله في الآخر»
      // plus a seven-figure sum does not fit a phone on one line.
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(
              label,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          const SizedBox(width: 12),
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

class _GoalPreset {
  final String id;
  final String title;
  final IconData icon;
  final int target;
  final int years;

  const _GoalPreset({
    required this.id,
    required this.title,
    required this.icon,
    required this.target,
    required this.years,
  });
}

/// Starting points, not recommendations.
///
/// THE PRESETS DELIBERATELY CARRY NO RETURN RATE — mirrors GOAL_PRESETS in
/// site/components/goal-planner-state.ts. Setting one alongside the amount
/// would make picking «مستقبل الأبناء» quietly assert what the EGX pays.
const _presets = <_GoalPreset>[
  _GoalPreset(
    id: 'kids',
    title: 'مستقبل الأبناء',
    icon: Icons.school_outlined,
    target: 2000000,
    years: 18,
  ),
  _GoalPreset(
    id: 'car',
    title: 'شراء سيارة',
    icon: Icons.directions_car_outlined,
    target: 1200000,
    years: 5,
  ),
  _GoalPreset(
    id: 'retirement',
    title: 'التقاعد الحر',
    icon: Icons.beach_access_outlined,
    target: 5000000,
    years: 20,
  ),
  _GoalPreset(
    id: 'home',
    title: 'شراء عقار',
    icon: Icons.home_outlined,
    target: 3000000,
    years: 10,
  ),
];
