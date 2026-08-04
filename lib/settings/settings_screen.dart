import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/calc/risk_math.dart';
import '../core/formatters.dart';
import '../features/auth/widgets/delete_account_tile.dart';
import '../features/auth/widgets/user_profile_tile.dart';
import 'settings_providers.dart';
import 'widgets/settings_tiles.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  late final TextEditingController _capitalController;
  late final TextEditingController _riskController;

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
    // The drafts back the max-loss readout and the two error messages. They are
    // only reassigned in the onChanged handlers, so without seeding them here
    // the screen opens claiming both fields are empty and shows "—" instead of
    // the saved limit — until the user types.
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
          const UserProfileTile(),
          const SizedBox(height: 16),
          TextField(
            controller: _capitalController,
            onChanged: _onCapitalChanged,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            inputFormatters: [
              FilteringTextInputFormatter.allow(RegExp(r'[0-9.٠-٩]')),
            ],
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
          MaxLossCard(maxLoss: maxLoss),
          const SizedBox(height: 24),
          const Divider(),
          const DefaultPercentTiles(),
          const Divider(),
          const ThemeModeTile(),
          const Divider(),
          const GeminiKeyTile(),
          const Divider(),
          const BehaviourTiles(),
          const Divider(),
          const ReplayIntroTile(),
          // Last, and only for a signed-in user: destructive and irreversible,
          // so it sits below everything rather than next to a toggle.
          const SizedBox(height: 24),
          const DeleteAccountTile(),
        ],
      ),
    );
  }
}
