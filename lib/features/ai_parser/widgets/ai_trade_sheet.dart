import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:uuid/uuid.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../settings/cubit/settings_cubit.dart';
import '../../../trades/cubit/trades_cubit.dart';

import '../../../core/calc/sizing_result.dart';
import '../../../core/formatters.dart';
import '../../../core/theme.dart';
import '../../../trades/trade.dart';
import '../../../trades/trade_draft.dart';
import '../../../trades/trade_form_screen.dart';
import '../../../trades/trade_status.dart';
import '../models/ai_trade_data.dart';
import '../services/ai_trade_parser_service.dart';

/// Reads trade recommendations off screenshots.
///
/// Built around a list, not a single result: one screenshot routinely holds
/// several recommendations, and traders receive them in batches, so the sheet
/// takes many images at once and lets the trader tick which of the extracted
/// trades to keep.
class AiTradeSheet extends StatefulWidget {
  const AiTradeSheet({super.key});

  @override
  State<AiTradeSheet> createState() => _AiTradeSheetState();
}

class _AiTradeSheetState extends State<AiTradeSheet> {
  List<File> _images = const [];
  bool _analyzing = false;
  List<AiTradeData> _extracted = const [];

  /// Indices of [_extracted] the trader wants to keep. Everything starts
  /// ticked — the common case is "add them all".
  final _selected = <int>{};

  /// Set when analysis fails, so the sheet can explain instead of silently
  /// showing nothing.
  String? _error;

  bool _saving = false;

  Future<void> _pick(ImageSource source) async {
    final picker = ImagePicker();

    // The gallery allows many; the camera is one shot at a time.
    final picked = source == ImageSource.gallery
        ? await picker.pickMultiImage(limit: AiTradeParserService.maxImages)
        : [?await picker.pickImage(source: ImageSource.camera)];

    if (picked.isEmpty) return;
    await _analyze(picked.map((x) => File(x.path)).toList());
  }

  Future<void> _analyze(List<File> images) async {
    setState(() {
      _images = images;
      _analyzing = true;
      _extracted = const [];
      _selected.clear();
      _error = null;
    });

    try {
      final extracted = await AiTradeParserService.parseTradeImages(images);
      if (!mounted) return;
      setState(() {
        _extracted = extracted;
        _selected.addAll(List.generate(extracted.length, (i) => i));
        _analyzing = false;
      });
    } on AiParseException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _analyzing = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'تعذّر تحليل الصور. جرّب تاني.';
        _analyzing = false;
      });
    }
  }

  /// Opens the full form on one extracted trade, for the trader who wants to
  /// fill in the rest by hand. Only ever one — N stacked forms is not a flow.
  void _openInForm(AiTradeData data) {
    Navigator.of(context).pop();
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => TradeFormScreen(
          draft: TradeDraft(
            ticker: data.ticker,
            entryPrice: data.entryPrice,
            stopPrice: data.stopLoss,
            takeProfitPrice: data.takeProfit,
            reason: data.notes.isEmpty ? 'توصية من صورة' : data.notes,
          ),
        ),
      ),
    );
  }

  Future<void> _saveSelected() async {
    if (_selected.isEmpty || _saving) return;
    setState(() => _saving = true);

    final settings = context.read<SettingsCubit>().requireSettings;
    final trades = context.read<TradesCubit>();
    final chosen = (_selected.toList()..sort()).map((i) => _extracted[i]);

    var saved = 0;
    for (final data in chosen) {
      // Sized by the same risk rule the rest of the app uses, so an imported
      // idea is never a position the trader would have been warned about.
      final sizing = SizingResult.compute(
        capital: settings.capital,
        maxRiskPercent: settings.maxRiskPercent,
        entry: data.entryPrice,
        stop: data.stopLoss,
      );

      await trades.save(
        Trade(
          id: const Uuid().v4(),
          entryDate: DateTime.now(),
          ticker: data.ticker,
          reason: data.notes.isEmpty ? 'توصية من صورة' : data.notes,
          entryPrice: data.entryPrice ?? 0,
          stopPrice: data.stopLoss ?? 0,
          quantity: sizing.suggestedQty ?? 0,
          takeProfitPrice: data.takeProfit,
          // Imported, not taken: nothing here says the trader actually bought.
          status: TradeStatus.planned,
        ),
      );
      saved++;
    }

    if (!mounted) return;
    Navigator.of(context).pop();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('تمت إضافة $saved صفقة كأفكار مخططة')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(
        24,
        24,
        24,
        MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(
                Icons.auto_awesome,
                color: context.palette.aiAccent,
                size: 28,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'قراءة التوصيات بالذكاء الاصطناعي',
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'ارفع صورة أو أكتر — وكل صورة ممكن يكون فيها أكتر من صفقة.',
            style: theme.textTheme.bodyMedium,
          ),
          const SizedBox(height: 20),

          if (_analyzing) ...[
            _Analyzing(imageCount: _images.length),
          ] else ...[
            if (_error != null) ...[
              _ErrorBanner(message: _error!),
              const SizedBox(height: 16),
            ],
            if (_extracted.isEmpty) ...[
              _SourceButtons(onPick: _pick),
            ] else ...[
              _ResultsHeader(
                total: _extracted.length,
                imageCount: _images.length,
                selected: _selected.length,
                onToggleAll: () => setState(() {
                  if (_selected.length == _extracted.length) {
                    _selected.clear();
                  } else {
                    _selected
                      ..clear()
                      ..addAll(List.generate(_extracted.length, (i) => i));
                  }
                }),
              ),
              const SizedBox(height: 12),
              for (final (index, data) in _extracted.indexed) ...[
                _ExtractedTradeCard(
                  data: data,
                  selected: _selected.contains(index),
                  onToggle: () => setState(() {
                    if (!_selected.remove(index)) _selected.add(index);
                  }),
                  onOpenInForm: () => _openInForm(data),
                ),
                const SizedBox(height: 10),
              ],
              const SizedBox(height: 6),
              FilledButton.icon(
                onPressed: _selected.isEmpty || _saving ? null : _saveSelected,
                icon: const Icon(Icons.playlist_add_check_rounded),
                label: Text(
                  _selected.isEmpty
                      ? 'اختار صفقة على الأقل'
                      : 'أضف ${_selected.length} صفقة',
                ),
              ),
              const SizedBox(height: 8),
              TextButton.icon(
                onPressed: _saving ? null : () => _pick(ImageSource.gallery),
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('اختار صور تانية'),
              ),
            ],
          ],
        ],
      ),
    );
  }
}

class _Analyzing extends StatelessWidget {
  final int imageCount;

  const _Analyzing({required this.imageCount});

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const CircularProgressIndicator(),
          const SizedBox(height: 16),
          Text(
            imageCount > 1
                ? 'بيقرا $imageCount صور ويطلّع الصفقات اللي فيها...'
                : 'جاري تحليل التوصية وقراءة أسعار الأسهم...',
            textAlign: TextAlign.center,
          ),
        ],
      ),
    ),
  );
}

class _ErrorBanner extends StatelessWidget {
  final String message;

  const _ErrorBanner({required this.message});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.errorContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            Icons.error_outline_rounded,
            size: 18,
            color: theme.colorScheme.error,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onErrorContainer,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ResultsHeader extends StatelessWidget {
  final int total;
  final int imageCount;
  final int selected;
  final VoidCallback onToggleAll;

  const _ResultsHeader({
    required this.total,
    required this.imageCount,
    required this.selected,
    required this.onToggleAll,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Expanded(
          child: Text(
            imageCount > 1
                ? 'لقى $total صفقة في $imageCount صور'
                : 'لقى $total صفقة',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        TextButton(
          onPressed: onToggleAll,
          child: Text(selected == total ? 'الغي الكل' : 'اختار الكل'),
        ),
      ],
    );
  }
}

class _ExtractedTradeCard extends StatelessWidget {
  final AiTradeData data;
  final bool selected;
  final VoidCallback onToggle;
  final VoidCallback onOpenInForm;

  const _ExtractedTradeCard({
    required this.data,
    required this.selected,
    required this.onToggle,
    required this.onOpenInForm,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: selected
              ? theme.colorScheme.primary
              : theme.colorScheme.outlineVariant,
          width: selected ? 1.5 : 1,
        ),
      ),
      child: InkWell(
        onTap: onToggle,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Checkbox(value: selected, onChanged: (_) => onToggle()),
                  Expanded(
                    child: Text(
                      data.ticker,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                      textDirection: TextDirection.ltr,
                      textAlign: TextAlign.right,
                    ),
                  ),
                  IconButton(
                    onPressed: onOpenInForm,
                    icon: const Icon(Icons.edit_note_rounded),
                    tooltip: 'افتحها في الفورم الكامل',
                  ),
                ],
              ),
              const SizedBox(height: 4),
              // The same three levels, in the same order, as every other card
              // in the app — an extracted trade missing its target reads as a
              // gap rather than as an absent field.
              Wrap(
                spacing: 16,
                runSpacing: 8,
                children: [
                  _Level(label: 'الدخول', value: money(data.entryPrice)),
                  _Level(label: 'الاستوب', value: money(data.stopLoss)),
                  _Level(label: 'الهدف', value: money(data.takeProfit)),
                ],
              ),
              if (data.notes.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  data.notes,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _Level extends StatelessWidget {
  final String label;
  final String value;

  const _Level({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(label, style: theme.textTheme.bodySmall?.copyWith(fontSize: 11)),
        const SizedBox(height: 2),
        NumericText(
          value,
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.bold,
            color: value == kEmptyValue ? theme.colorScheme.outline : null,
          ),
        ),
      ],
    );
  }
}

class _SourceButtons extends StatelessWidget {
  final ValueChanged<ImageSource> onPick;

  const _SourceButtons({required this.onPick});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => onPick(ImageSource.gallery),
            icon: const Icon(Icons.photo_library),
            label: const Text('المعرض'),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => onPick(ImageSource.camera),
            icon: const Icon(Icons.camera_alt),
            label: const Text('الكاميرا'),
          ),
        ),
      ],
    );
  }
}
