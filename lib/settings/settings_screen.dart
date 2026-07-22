import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/calc/risk_math.dart';
import '../core/formatters.dart';
import 'settings_providers.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  late final TextEditingController _capitalController;
  late final TextEditingController _riskController;

  /// Live preview values, so the max-loss figure updates while typing rather
  /// than only after a successful save.
  double? _draftCapital;
  double? _draftRiskPercent;

  @override
  void initState() {
    super.initState();
    final settings = ref.read(settingsProvider);
    _capitalController = TextEditingController(
      text: settings.capital.toStringAsFixed(2),
    );
    // Displayed as a PERCENT (2.0) while stored as a fraction (0.02). This
    // screen owns the conversion in both directions; nothing downstream has to
    // guess the unit.
    _riskController = TextEditingController(
      text: (settings.maxRiskPercent * 100).toStringAsFixed(1),
    );
    _draftCapital = settings.capital;
    _draftRiskPercent = settings.maxRiskPercent * 100;
  }

  @override
  void dispose() {
    _capitalController.dispose();
    _riskController.dispose();
    super.dispose();
  }

  void _onCapitalChanged(String value) {
    final parsed = parseNumber(value);
    setState(() => _draftCapital = parsed);
    if (parsed != null && parsed > 0) {
      ref.read(settingsProvider.notifier).setCapital(parsed);
    }
  }

  void _onRiskChanged(String value) {
    final parsed = parseNumber(value);
    setState(() => _draftRiskPercent = parsed);
    if (parsed != null && parsed > 0 && parsed <= 100) {
      ref.read(settingsProvider.notifier).setMaxRiskPercent(parsed / 100);
    }
  }

  @override
  Widget build(BuildContext context) {
    final capital = _draftCapital;
    final riskPercent = _draftRiskPercent;

    final capitalError = capital == null || capital <= 0
        ? 'أدخل رأس مال أكبر من صفر'
        : null;
    final riskError = riskPercent == null || riskPercent <= 0
        ? 'أدخل نسبة أكبر من صفر'
        : (riskPercent > 100 ? 'النسبة لا يمكن أن تتجاوز 100%' : null);

    final maxLoss = (capitalError == null && riskError == null)
        ? maxLossPerTrade(capital: capital!, maxRiskPercent: riskPercent! / 100)
        : null;

    return Scaffold(
      appBar: AppBar(title: const Text('الإعدادات')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            controller: _capitalController,
            onChanged: _onCapitalChanged,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            inputFormatters: [
              FilteringTextInputFormatter.allow(RegExp(r'[0-9.٠-٩]')),
            ],
            // Numeric fields force LTR: in an RTL run the caret and the decimal
            // point behave erratically as the user types.
            textDirection: TextDirection.ltr,
            textAlign: TextAlign.right,
            decoration: InputDecoration(
              labelText: 'رأس المال',
              suffixText: kCurrencySuffix,
              errorText: capitalError,
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _riskController,
            onChanged: _onRiskChanged,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            inputFormatters: [
              FilteringTextInputFormatter.allow(RegExp(r'[0-9.٠-٩]')),
            ],
            textDirection: TextDirection.ltr,
            textAlign: TextAlign.right,
            decoration: InputDecoration(
              labelText: 'نسبة المخاطرة القصوى للصفقة',
              suffixText: '%',
              helperText: 'مثال: 2 تعني 2% من رأس المال',
              errorText: riskError,
            ),
          ),
          const SizedBox(height: 24),
          _MaxLossCard(maxLoss: maxLoss),
          const SizedBox(height: 24),
          const Divider(),
          const _DefaultPercentTiles(),
          const Divider(),
          const _ThemeModeTile(),
          const Divider(),
          const _BehaviourTiles(),
        ],
      ),
    );
  }
}

/// The live max-loss readout. Prominent on purpose: it is the fastest way for a
/// user to notice they typed 20 instead of 2 in the risk field.
class _MaxLossCard extends StatelessWidget {
  final double? maxLoss;

  const _MaxLossCard({required this.maxLoss});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'أقصى خسارة مسموحة للصفقة',
              style: theme.textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            NumericText(
              money(maxLoss),
              style: theme.textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.bold,
                color: theme.colorScheme.primary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'رأس المال × نسبة المخاطرة',
              style: theme.textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}

/// Starting percentages for the smart trade builder. Stored as fractions;
/// this screen owns the conversion, exactly as it does for the risk limit.
class _DefaultPercentTiles extends ConsumerStatefulWidget {
  const _DefaultPercentTiles();

  @override
  ConsumerState<_DefaultPercentTiles> createState() =>
      _DefaultPercentTilesState();
}

class _DefaultPercentTilesState extends ConsumerState<_DefaultPercentTiles> {
  late final TextEditingController _takeProfitController;
  late final TextEditingController _stopLossController;

  @override
  void initState() {
    super.initState();
    final settings = ref.read(settingsProvider);
    _takeProfitController = TextEditingController(
      text: (settings.defaultTakeProfitPercent * 100).toStringAsFixed(1),
    );
    _stopLossController = TextEditingController(
      text: (settings.defaultStopLossPercent * 100).toStringAsFixed(1),
    );
  }

  @override
  void dispose() {
    _takeProfitController.dispose();
    _stopLossController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final notifier = ref.read(settingsProvider.notifier);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 12),
        Text(
          'نسب منشئ الصفقة الذكي',
          style: Theme.of(context).textTheme.titleSmall,
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _PercentField(
                controller: _takeProfitController,
                label: 'نسبة الهدف الافتراضية',
                onChanged: (fraction) =>
                    notifier.setDefaultTakeProfitPercent(fraction),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _PercentField(
                controller: _stopLossController,
                label: 'نسبة الوقف الافتراضية',
                onChanged: (fraction) =>
                    notifier.setDefaultStopLossPercent(fraction),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
      ],
    );
  }
}

class _PercentField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final ValueChanged<double> onChanged;

  const _PercentField({
    required this.controller,
    required this.label,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      onChanged: (value) {
        final percent = parseNumber(value);
        // The notifier itself rejects out-of-range values, so a half-typed
        // entry simply leaves the stored setting untouched.
        if (percent != null && percent > 0) onChanged(percent / 100);
      },
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      inputFormatters: [
        FilteringTextInputFormatter.allow(RegExp(r'[0-9.٠-٩]')),
      ],
      textDirection: TextDirection.ltr,
      textAlign: TextAlign.center,
      decoration: InputDecoration(labelText: label, suffixText: '%'),
    );
  }
}

class _BehaviourTiles extends ConsumerWidget {
  const _BehaviourTiles();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(settingsProvider);
    final notifier = ref.read(settingsProvider.notifier);

    return Column(
      children: [
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('قائمة التحقق قبل الحفظ'),
          subtitle: const Text('تظهر قبل حفظ أي صفقة مخططة أو مفتوحة'),
          value: settings.enableChecklist,
          onChanged: notifier.setEnableChecklist,
        ),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('تأكيد قبل الحذف'),
          subtitle: const Text('اسأل قبل أي إجراء لا يمكن التراجع عنه'),
          value: settings.enableConfirmations,
          onChanged: notifier.setEnableConfirmations,
        ),
        ListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('حد انتظار الصفقة'),
          subtitle: const Text(
            'بعد كام يوم تظهر الصفقة المفتوحة في «منتظرة من زمان»',
          ),
          trailing: SizedBox(
            width: 96,
            child: _WaitingThresholdField(
              value: settings.waitingThresholdDays,
              onChanged: notifier.setWaitingThresholdDays,
            ),
          ),
        ),
      ],
    );
  }
}

class _WaitingThresholdField extends StatefulWidget {
  final int value;
  final ValueChanged<int> onChanged;

  const _WaitingThresholdField({required this.value, required this.onChanged});

  @override
  State<_WaitingThresholdField> createState() => _WaitingThresholdFieldState();
}

class _WaitingThresholdFieldState extends State<_WaitingThresholdField> {
  late final TextEditingController _controller = TextEditingController(
    text: widget.value.toString(),
  );

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _controller,
      keyboardType: TextInputType.number,
      inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9٠-٩]'))],
      textDirection: TextDirection.ltr,
      textAlign: TextAlign.center,
      decoration: const InputDecoration(suffixText: 'يوم', isDense: true),
      onChanged: (text) {
        final days = parseInteger(text);
        // Ignored rather than clamped while typing: an empty field or a
        // half-typed "0" should not rewrite the stored preference.
        if (days != null && days > 0) widget.onChanged(days);
      },
    );
  }
}

class _ThemeModeTile extends ConsumerWidget {
  const _ThemeModeTile();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(themeModeProvider);
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: const Text('المظهر'),
      subtitle: Text(switch (mode) {
        ThemeMode.system => 'حسب النظام',
        ThemeMode.light => 'فاتح',
        ThemeMode.dark => 'داكن',
      }),
      trailing: SegmentedButton<ThemeMode>(
        segments: const [
          ButtonSegment(value: ThemeMode.system, icon: Icon(Icons.brightness_auto)),
          ButtonSegment(value: ThemeMode.light, icon: Icon(Icons.light_mode)),
          ButtonSegment(value: ThemeMode.dark, icon: Icon(Icons.dark_mode)),
        ],
        selected: {mode},
        showSelectedIcon: false,
        onSelectionChanged: (selection) =>
            ref.read(themeModeProvider.notifier).set(selection.first),
      ),
    );
  }
}
