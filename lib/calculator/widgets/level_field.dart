import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/formatters.dart';
import 'percent_picker.dart';

/// How a level was entered.
enum LevelInputMode { percent, price }

/// «الهدف» and «وقف الخسارة», entered EITHER as a percentage OR as a price.
///
/// One widget for both, because they are the same question in two directions
/// and the app used to answer them differently: the stop had a نسبة/سعر switch
/// and the target was percent-only, so a trader reading a resistance level off
/// a chart had to divide it by their entry in their head before they could type
/// it. The site's calculator has had the switch on both since it was written —
/// this is the app catching up to it.
///
/// WHATEVER IS NOT TYPED IS SHOWN. Type 5% and the price appears under the
/// field; type the price and the percentage does. That is what removes the need
/// for the summary card to repeat the levels back: the answer is already
/// beside the question.
class LevelField extends StatelessWidget {
  final String title;

  /// Tints the derived readout, so a target reads as profit and a stop as risk.
  final Color accent;

  final LevelInputMode mode;
  final ValueChanged<LevelInputMode> onModeChanged;

  /// Percent mode: the quick presets, as fractions (0.05 is 5%).
  final List<double> presets;
  final double? selectedPercent;
  final TextEditingController percentController;
  final ValueChanged<double> onPercentSelected;
  final ValueChanged<double> onPercentTyped;
  final Key? percentFieldKey;

  final TextEditingController priceController;
  final ValueChanged<String> onPriceChanged;
  final Key? priceFieldKey;
  final String priceLabel;

  /// The level in money, however it was arrived at. Null while incomplete.
  final double? resolvedPrice;

  /// The level as a fraction of the entry. Null while incomplete.
  final double? resolvedPercent;

  /// Shown under the price box when the typed price cannot work.
  final String? priceError;

  /// Explains what a valid price looks like, e.g. «لازم يكون أقل من الدخول».
  final String priceHelper;

  const LevelField({
    super.key,
    required this.title,
    required this.accent,
    required this.mode,
    required this.onModeChanged,
    required this.presets,
    required this.selectedPercent,
    required this.percentController,
    required this.onPercentSelected,
    required this.onPercentTyped,
    required this.priceController,
    required this.onPriceChanged,
    required this.priceLabel,
    required this.priceHelper,
    this.resolvedPrice,
    this.resolvedPercent,
    this.priceError,
    this.percentFieldKey,
    this.priceFieldKey,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final inPercent = mode == LevelInputMode.percent;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                title,
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            SegmentedButton<LevelInputMode>(
              showSelectedIcon: false,
              style: const ButtonStyle(
                visualDensity: VisualDensity.compact,
              ),
              segments: const [
                ButtonSegment(
                  value: LevelInputMode.percent,
                  label: Text('نسبة'),
                ),
                ButtonSegment(
                  value: LevelInputMode.price,
                  label: Text('سعر'),
                ),
              ],
              selected: {mode},
              onSelectionChanged: (s) => onModeChanged(s.first),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (inPercent)
          PercentPicker(
            title: title,
            showTitle: false,
            fieldKey: percentFieldKey,
            presets: presets,
            selected: selectedPercent,
            controller: percentController,
            onSelected: onPercentSelected,
            onTyped: onPercentTyped,
          )
        else
          TextField(
            key: priceFieldKey,
            controller: priceController,
            onChanged: onPriceChanged,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            inputFormatters: [
              FilteringTextInputFormatter.allow(RegExp(r'[0-9.٠-٩,]')),
              const ThousandsFormatter(),
            ],
            textDirection: TextDirection.ltr,
            textAlign: TextAlign.right,
            decoration: InputDecoration(
              labelText: priceLabel,
              suffixText: kCurrencySuffix,
              helperText: priceHelper,
              errorText: priceError,
            ),
          ),
        // The counterpart. Absent rather than «—» when it cannot be worked out:
        // an empty entry price is not a level of zero.
        if (_counterpart != null) ...[
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.10),
              borderRadius: BorderRadius.circular(8),
            ),
            child: NumericText(
              _counterpart!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: accent,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ],
    );
  }

  String? get _counterpart {
    if (mode == LevelInputMode.percent) {
      return resolvedPrice == null ? null : '= ${money(resolvedPrice)}';
    }
    return resolvedPercent == null ? null : '= ${percent(resolvedPercent)}';
  }
}
