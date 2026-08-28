import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/preferences/device_prefs_cubit.dart';
import '../../core/state/app_state.dart';
import '../cubit/settings_cubit.dart';

import '../../core/formatters.dart';
import '../../core/theme.dart';

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
            // NOT a position size. This is the loss budget: the most the
            // trader may be down when the stop is hit. The old subtitle,
            // "رأس المال × نسبة المخاطرة" with no other context, read as
            // though the whole account went into one trade — it was
            // misreported as a bug on exactly those grounds. The number is
            // what the entire sizing engine divides by, so the fix is saying
            // what it means, not removing it.
            Text(
              'أقصى خسارة لو ضرب الاستوب',
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
              'دي مش قيمة الصفقة — دي أكبر مبلغ ممكن تخسره فيها. '
              'التطبيق بيقسّمه على المسافة بين الدخول والاستوب عشان يطلّع '
              'عدد الأسهم.',
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

/// Default trade percentages tiles for smart builder.
class DefaultPercentTiles extends StatefulWidget {
  const DefaultPercentTiles({super.key});

  @override
  State<DefaultPercentTiles> createState() =>
      _DefaultPercentTilesState();
}

class _DefaultPercentTilesState extends State<DefaultPercentTiles> {
  late final TextEditingController _takeProfitController;
  late final TextEditingController _stopLossController;

  @override
  void initState() {
    super.initState();
    final settings = context.read<SettingsCubit>().requireSettings;
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
    final notifier = context.read<SettingsCubit>();

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

class BehaviourTiles extends StatelessWidget {
  const BehaviourTiles({super.key});

  @override
  Widget build(BuildContext context) {
    final settings = context.settings;
    final notifier = context.read<SettingsCubit>();

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

class ThemeModeTile extends StatelessWidget {
  const ThemeModeTile({super.key});

  @override
  Widget build(BuildContext context) {
    final mode = context.watch<DevicePrefsCubit>().state.themeMode;
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
            context.read<DevicePrefsCubit>().setThemeMode(selection.first),
      ),
    );
  }
}

/// Where the Gemini API key is entered.
///
/// Exists because the key used to be compile-time only: without a
/// `--dart-define` at build time the AI screen could do nothing but report that
/// it was not configured, which is what it did on every normal `flutter run`.
class GeminiKeyTile extends StatefulWidget {
  const GeminiKeyTile({super.key});

  @override
  State<GeminiKeyTile> createState() => _GeminiKeyTileState();
}

class _GeminiKeyTileState extends State<GeminiKeyTile> {
  final _controller = TextEditingController();
  bool _obscure = true;
  bool _seeded = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final stored = context.watch<DevicePrefsCubit>().state.geminiKey;

    // Seeded once. Re-syncing on every build would fight the user's cursor.
    if (!_seeded) {
      _controller.text = stored;
      _seeded = true;
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'مفتاح الذكاء الاصطناعي (Gemini)',
            style: theme.textTheme.titleMedium,
          ),
          const SizedBox(height: 4),
          Text(
            'لتحليل صور التوصيات. احصل على مفتاح مجاني من aistudio.google.com',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _controller,
            obscureText: _obscure,
            autocorrect: false,
            enableSuggestions: false,
            textDirection: TextDirection.ltr,
            decoration: InputDecoration(
              labelText: 'API key',
              hintText: 'AIza...',
              suffixIcon: IconButton(
                icon: Icon(
                  _obscure
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined,
                ),
                tooltip: _obscure ? 'إظهار المفتاح' : 'إخفاء المفتاح',
                onPressed: () => setState(() => _obscure = !_obscure),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              FilledButton(
                onPressed: () async {
                  await context.read<DevicePrefsCubit>().setGeminiKey(
                    _controller.text,
                  );
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('تم حفظ المفتاح')),
                    );
                  }
                },
                child: const Text('حفظ'),
              ),
              const SizedBox(width: 8),
              if (stored.isNotEmpty)
                TextButton(
                  onPressed: () async {
                    _controller.clear();
                    await context.read<DevicePrefsCubit>().setGeminiKey('');
                  },
                  child: const Text('مسح'),
                ),
              const Spacer(),
              if (stored.isNotEmpty)
                Row(
                  children: [
                    Icon(
                      Icons.check_circle_outline,
                      size: 16,
                      color: context.resultColors.win,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'مفعّل',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: context.resultColors.win,
                      ),
                    ),
                  ],
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Replays the intro.
///
/// Exists so the onboarding screens stay reachable after first run. Without it
/// they are code that executes exactly once per install and can never be seen
/// again — which is how intro flows quietly rot into stating things the app no
/// longer does, with nobody noticing because nobody can look.
class ReplayIntroTile extends StatelessWidget {
  const ReplayIntroTile({super.key});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: const Icon(Icons.slideshow_outlined),
      title: const Text('اعرض جولة التعريف تاني'),
      subtitle: const Text('الأربع شاشات اللي بتظهر أول مرة'),
      trailing: const Icon(Icons.chevron_left),
      onTap: () async {
        // The gate watches this flag, so flipping it swaps the whole subtree —
        // no navigation, and nothing left underneath to pop back to.
        await context.read<DevicePrefsCubit>().resetOnboarding();
      },
    );
  }
}
