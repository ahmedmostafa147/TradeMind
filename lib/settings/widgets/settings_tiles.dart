import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/formatters.dart';
import '../settings_providers.dart';

/// The live max-loss readout card.
class MaxLossCard extends StatelessWidget {
  final double? maxLoss;

  const MaxLossCard({super.key, required this.maxLoss});

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

/// Default trade percentages tiles for smart builder.
class DefaultPercentTiles extends ConsumerStatefulWidget {
  const DefaultPercentTiles({super.key});

  @override
  ConsumerState<DefaultPercentTiles> createState() =>
      _DefaultPercentTilesState();
}

class _DefaultPercentTilesState extends ConsumerState<DefaultPercentTiles> {
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

class BehaviourTiles extends ConsumerWidget {
  const BehaviourTiles({super.key});

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
        if (days != null && days > 0) widget.onChanged(days);
      },
    );
  }
}

class ThemeModeTile extends ConsumerWidget {
  const ThemeModeTile({super.key});

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
          ButtonSegment(
            value: ThemeMode.system,
            icon: Icon(Icons.brightness_auto),
          ),
          ButtonSegment(
            value: ThemeMode.light,
            icon: Icon(Icons.light_mode),
          ),
          ButtonSegment(
            value: ThemeMode.dark,
            icon: Icon(Icons.dark_mode),
          ),
        ],
        selected: {mode},
        showSelectedIcon: false,
        onSelectionChanged: (selection) =>
            ref.read(themeModeProvider.notifier).set(selection.first),
      ),
    );
  }
}
