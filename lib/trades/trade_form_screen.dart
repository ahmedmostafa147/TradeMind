import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../core/calc/sizing_result.dart';
import '../core/formatters.dart';
import '../core/theme.dart';
import '../core/widgets/risk_warning.dart';
import '../settings/settings_providers.dart';
import 'screenshot_store.dart';
import 'timeline_entry.dart';
import 'trade.dart';
import 'trade_draft.dart';
import 'trade_status.dart';
import 'trades_providers.dart';
import 'widgets/checklist_sheet.dart';
import 'widgets/screenshot_picker.dart';
import 'widgets/tag_editor.dart';
import 'widgets/timeline_editor.dart';

/// Add or edit one trade.
///
/// [existing] edits a saved trade, [draft] prefills a new one from the
/// calculator, neither starts blank. They are never both meaningful.
class TradeFormScreen extends ConsumerStatefulWidget {
  final Trade? existing;
  final TradeDraft? draft;

  const TradeFormScreen({super.key, this.existing, this.draft});

  @override
  ConsumerState<TradeFormScreen> createState() => _TradeFormScreenState();
}

class _TradeFormScreenState extends ConsumerState<TradeFormScreen> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _tickerController;
  late final TextEditingController _reasonController;
  late final TextEditingController _entryController;
  late final TextEditingController _stopController;
  late final TextEditingController _quantityController;
  late final TextEditingController _takeProfitController;
  late final TextEditingController _exitController;
  late final TextEditingController _notesController;

  late DateTime _entryDate;
  DateTime? _exitDate;

  late TradeStatus _status;
  late List<String> _tags;
  late bool _isFavorite;
  late List<String> _checklist;
  late List<String> _screenshots;
  late List<TimelineEntry> _timeline;

  /// Screenshots copied in during this session that have not been saved yet.
  /// If the user backs out, these files are orphans and get cleaned up.
  final _unsavedScreenshots = <String>[];
  final _store = ScreenshotStore();
  bool _pickingImages = false;

  bool get _isEditing => widget.existing != null;

  /// A planned or cancelled idea was never executed, so it needs no share
  /// count and no exit.
  bool get _requiresQuantity => _status.isExecuted;

  @override
  void initState() {
    super.initState();
    final existing = widget.existing;
    final draft = widget.draft;

    String priceText(double? value) =>
        value == null ? '' : value.toStringAsFixed(2);

    _tickerController = TextEditingController(text: existing?.ticker ?? '');
    _reasonController = TextEditingController(
      text: existing?.reason ?? draft?.reason ?? '',
    );
    _entryController = TextEditingController(
      text: priceText(existing?.entryPrice ?? draft?.entryPrice),
    );
    _stopController = TextEditingController(
      text: priceText(existing?.stopPrice ?? draft?.stopPrice),
    );
    _quantityController = TextEditingController(
      text: (existing?.quantity ?? draft?.quantity)?.toString() ?? '',
    );
    _takeProfitController = TextEditingController(
      text: priceText(existing?.takeProfitPrice ?? draft?.takeProfitPrice),
    );
    _exitController = TextEditingController(
      text: priceText(existing?.exitPrice),
    );
    _notesController = TextEditingController(text: existing?.notes ?? '');

    _entryDate = existing?.entryDate ?? _today();
    _exitDate = existing?.exitDate;

    _status = existing?.status ?? TradeStatus.open;
    _tags = [...?existing?.tags];
    _isFavorite = existing?.isFavorite ?? false;
    _checklist = [...?existing?.completedChecklistItems];
    _screenshots = [...?existing?.screenshotPaths];
    _timeline = [...?existing?.timeline];
  }

  @override
  void dispose() {
    _tickerController.dispose();
    _reasonController.dispose();
    _entryController.dispose();
    _stopController.dispose();
    _quantityController.dispose();
    _exitController.dispose();
    _takeProfitController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  /// Dates are normalised to local midnight: only the day matters here, and a
  /// stray time component makes same-day ordering non-deterministic.
  static DateTime _today() {
    final now = DateTime.now();
    return DateTime(now.year, now.month, now.day);
  }

  @override
  Widget build(BuildContext context) {
    final settings = ref.watch(settingsProvider);
    final entry = parseNumber(_entryController.text);
    final stop = parseNumber(_stopController.text);
    final qty = parseInteger(_quantityController.text);

    final live = SizingResult.compute(
      capital: settings.capital,
      maxRiskPercent: settings.maxRiskPercent,
      entry: entry,
      stop: stop,
      userQty: qty,
    );

    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditing ? 'تعديل الصفقة' : 'إضافة صفقة'),
        actions: [
          IconButton(
            icon: Icon(_isFavorite ? Icons.star : Icons.star_border),
            tooltip: 'مفضلة',
            onPressed: () => setState(() => _isFavorite = !_isFavorite),
          ),
          TextButton(onPressed: _save, child: const Text('حفظ')),
        ],
      ),
      body: Form(
        key: _formKey,
        autovalidateMode: AutovalidateMode.onUserInteraction,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _StatusSelector(
              value: _status,
              onChanged: (status) => setState(() {
                _status = status;
                // An idea that was never executed cannot have an exit.
                if (!status.isExecuted) {
                  _exitController.clear();
                  _exitDate = null;
                }
              }),
            ),
            const SizedBox(height: 16),

            TextFormField(
              controller: _tickerController,
              textCapitalization: TextCapitalization.characters,
              decoration: const InputDecoration(
                labelText: 'الرمز',
                hintText: 'COMI',
              ),
              validator: (value) =>
                  (value == null || value.trim().isEmpty) ? 'أدخل الرمز' : null,
            ),
            const SizedBox(height: 16),

            _DateField(
              label: 'تاريخ الدخول',
              value: _entryDate,
              onPick: (picked) => setState(() => _entryDate = picked),
            ),
            const SizedBox(height: 16),

            TextFormField(
              controller: _reasonController,
              decoration: const InputDecoration(labelText: 'سبب الدخول'),
              maxLines: 2,
              validator: (value) => (value == null || value.trim().isEmpty)
                  ? 'اكتب سبب الدخول'
                  : null,
            ),
            const SizedBox(height: 16),

            _NumberField(
              controller: _entryController,
              label: 'سعر الدخول',
              suffix: kCurrencySuffix,
              onChanged: () => setState(() {}),
              validator: (_) {
                final value = parseNumber(_entryController.text);
                if (value == null || value <= 0) {
                  return 'سعر الدخول لازم يكون أكبر من صفر';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            _NumberField(
              controller: _stopController,
              label: 'سعر الاستوب',
              suffix: kCurrencySuffix,
              onChanged: () => setState(() {}),
              validator: (_) {
                final value = parseNumber(_stopController.text);
                if (value == null || value <= 0) {
                  return 'سعر الاستوب لازم يكون أكبر من صفر';
                }
                final entryValue = parseNumber(_entryController.text);
                if (entryValue != null && value >= entryValue) {
                  return 'سعر الاستوب لازم يكون أقل من سعر الدخول';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            _NumberField(
              controller: _quantityController,
              label: 'عدد الأسهم',
              integerOnly: true,
              onChanged: () => setState(() {}),
              helperText: live.suggestedQty != null
                  ? 'الأسهم المقترحة: ${quantity(live.suggestedQty)}'
                  : null,
              validator: (_) {
                final value = parseInteger(_quantityController.text);
                // Planned and cancelled ideas were never bought, so a share
                // count is optional for them.
                if (!_requiresQuantity) {
                  return (value != null && value < 0)
                      ? 'عدد الأسهم لا يمكن أن يكون سالبًا'
                      : null;
                }
                if (value == null || value <= 0) {
                  return 'عدد الأسهم لازم يكون أكبر من صفر';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            _NumberField(
              controller: _takeProfitController,
              label: 'سعر الهدف (اختياري)',
              suffix: kCurrencySuffix,
              onChanged: () => setState(() {}),
              validator: (_) {
                final text = _takeProfitController.text.trim();
                if (text.isEmpty) return null;
                final value = parseNumber(text);
                if (value == null || value <= 0) {
                  return 'سعر الهدف لازم يكون أكبر من صفر';
                }
                final entryValue = parseNumber(_entryController.text);
                if (entryValue != null && value <= entryValue) {
                  return 'سعر الهدف لازم يكون أعلى من سعر الدخول';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            _LivePreview(result: live),
            const SizedBox(height: 24),

            _FormSection(
              title: 'التصنيفات',
              child: TagEditor(
                tags: _tags,
                onChanged: (tags) => setState(() => _tags = tags),
              ),
            ),

            _FormSection(
              title: 'الصور',
              child: ScreenshotPicker(
                paths: _screenshots,
                busy: _pickingImages,
                onAdd: _pickScreenshots,
                onRemove: (path) =>
                    setState(() => _screenshots.remove(path)),
              ),
            ),

            _FormSection(
              title: 'الأحداث',
              child: TimelineEditor(
                entries: _timeline,
                onChanged: (entries) => setState(() => _timeline = entries),
              ),
            ),

            // Planned and cancelled ideas have no exit to record.
            if (_status.isExecuted) ...[
              const Divider(),
              const SizedBox(height: 8),
              Text(
                'الخروج (اتركه فارغًا لو الصفقة لسه مفتوحة)',
                style: Theme.of(context).textTheme.titleSmall,
              ),
              const SizedBox(height: 12),

              _NumberField(
                controller: _exitController,
                label: 'سعر الخروج',
                suffix: kCurrencySuffix,
                onChanged: () => setState(() {}),
                validator: (_) {
                  final text = _exitController.text.trim();
                  if (text.isEmpty) return null;
                  final value = parseNumber(text);
                  if (value == null || value <= 0) {
                    return 'سعر الخروج لازم يكون أكبر من صفر';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              _DateField(
                label: 'تاريخ الخروج',
                value: _exitDate,
                onPick: (picked) => setState(() => _exitDate = picked),
                onClear: () => setState(() => _exitDate = null),
                // Surfaces the both-or-neither invariant before save rather
                // than as a failed submit.
                errorText: _exitPairingError,
              ),
              const SizedBox(height: 16),
            ],

            TextFormField(
              controller: _notesController,
              decoration: const InputDecoration(labelText: 'الدرس / ملاحظة'),
              maxLines: 3,
            ),
            const SizedBox(height: 24),

            FilledButton(
              onPressed: _save,
              child: Text(_isEditing ? 'حفظ التعديلات' : 'إضافة الصفقة'),
            ),
          ],
        ),
      ),
    );
  }

  /// exitPrice and exitDate must be set together or both left blank — a trade
  /// with one but not the other counts in totalPnl yet vanishes from the equity
  /// curve, breaking "last point == currentCapital".
  String? get _exitPairingError {
    final hasPrice = _exitController.text.trim().isNotEmpty;
    final hasDate = _exitDate != null;
    if (hasPrice && !hasDate) return 'أدخل تاريخ الخروج كمان';
    if (!hasPrice && hasDate) return 'أدخل سعر الخروج كمان';
    return null;
  }

  Future<void> _pickScreenshots() async {
    setState(() => _pickingImages = true);
    try {
      final added = await _store.pickAndStore();
      if (!mounted) return;
      setState(() {
        _screenshots.addAll(added);
        _unsavedScreenshots.addAll(added);
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {});
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('تعذّر إضافة الصور: $error')));
    } finally {
      if (mounted) setState(() => _pickingImages = false);
    }
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (_status.isExecuted && _exitPairingError != null) {
      setState(() {}); // surface the pairing error
      return;
    }

    // The checklist is a prompt, not a gate — see ChecklistSheet. It is skipped
    // for cancelled ideas, which are being abandoned rather than entered.
    final settings = ref.read(settingsProvider);
    if (settings.enableChecklist && _status != TradeStatus.cancelled) {
      final result = await ChecklistSheet.show(context, _checklist);
      if (result == null) return; // backed out — do not save
      _checklist = result;
    }

    final isExecuted = _status.isExecuted;
    final exitPrice = isExecuted ? parseNumber(_exitController.text) : null;
    final notes = _notesController.text.trim();

    final trade = Trade(
      id: widget.existing?.id ?? const Uuid().v4(),
      entryDate: _entryDate,
      ticker: _tickerController.text.trim().toUpperCase(),
      reason: _reasonController.text.trim(),
      entryPrice: parseNumber(_entryController.text)!,
      stopPrice: parseNumber(_stopController.text)!,
      quantity: parseInteger(_quantityController.text) ?? 0,
      takeProfitPrice: parseNumber(_takeProfitController.text),
      exitPrice: exitPrice,
      exitDate: exitPrice == null ? null : _exitDate,
      notes: notes.isEmpty ? null : notes,
      status: _status,
      tags: _tags,
      isFavorite: _isFavorite,
      screenshotPaths: _screenshots,
      completedChecklistItems: _checklist,
      timeline: _timeline,
    );

    // Images the user removed during this edit are now unreferenced. Deleted
    // only on a successful save, so backing out leaves the saved record intact.
    final removed = (widget.existing?.screenshotPaths ?? const <String>[])
        .where((path) => !_screenshots.contains(path));
    for (final path in removed) {
      await _store.delete(path);
    }
    // Anything picked this session that did not survive to the saved list.
    for (final path in _unsavedScreenshots) {
      if (!_screenshots.contains(path)) await _store.delete(path);
    }

    final notifier = ref.read(tradesProvider.notifier);
    if (_isEditing) {
      await notifier.update(trade);
    } else {
      await notifier.add(trade);
    }

    if (mounted) Navigator.of(context).pop();
  }
}

class _StatusSelector extends StatelessWidget {
  final TradeStatus value;
  final ValueChanged<TradeStatus> onChanged;

  const _StatusSelector({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('حالة الصفقة', style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: [
            for (final status in TradeStatus.values)
              ChoiceChip(
                label: Text(status.label),
                selected: status == value,
                onSelected: (_) => onChanged(status),
              ),
          ],
        ),
      ],
    );
  }
}

class _FormSection extends StatelessWidget {
  final String title;
  final Widget child;

  const _FormSection({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

/// Live sizing feedback while the user types, so they size correctly before
/// saving rather than discovering the breach afterwards.
class _LivePreview extends StatelessWidget {
  final SizingResult result;

  const _LivePreview({required this.result});

  @override
  Widget build(BuildContext context) {
    final colors = context.resultColors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (result.overRisk) ...[
          const RiskWarning(),
          const SizedBox(height: 12),
        ],
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                ReadoutRow(
                  label: 'قيمة المركز',
                  value: money(result.positionValue),
                ),
                ReadoutRow(
                  label: 'المخاطرة بالجنيه',
                  value: money(result.riskEgp),
                ),
                ReadoutRow(
                  label: 'نسبة المخاطرة',
                  value: percent(result.riskPct),
                  valueColor: result.overRisk ? colors.loss : null,
                  emphasise: true,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _NumberField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String? suffix;
  final String? helperText;
  final bool integerOnly;
  final VoidCallback onChanged;
  final FormFieldValidator<String>? validator;

  const _NumberField({
    required this.controller,
    required this.label,
    required this.onChanged,
    this.suffix,
    this.helperText,
    this.integerOnly = false,
    this.validator,
  });

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      onChanged: (_) => onChanged(),
      validator: validator,
      keyboardType: TextInputType.numberWithOptions(decimal: !integerOnly),
      inputFormatters: [
        FilteringTextInputFormatter.allow(
          integerOnly ? RegExp(r'[0-9٠-٩]') : RegExp(r'[0-9.٠-٩]'),
        ),
      ],
      textDirection: TextDirection.ltr,
      textAlign: TextAlign.right,
      decoration: InputDecoration(
        labelText: label,
        suffixText: suffix,
        helperText: helperText,
      ),
    );
  }
}

class _DateField extends StatelessWidget {
  final String label;
  final DateTime? value;
  final ValueChanged<DateTime> onPick;
  final VoidCallback? onClear;
  final String? errorText;

  const _DateField({
    required this.label,
    required this.value,
    required this.onPick,
    this.onClear,
    this.errorText,
  });

  @override
  Widget build(BuildContext context) {
    return InputDecorator(
      decoration: InputDecoration(labelText: label, errorText: errorText),
      child: Row(
        children: [
          Expanded(
            child: InkWell(
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: value ?? DateTime.now(),
                  firstDate: DateTime(2000),
                  lastDate: DateTime(2100),
                );
                if (picked != null) {
                  onPick(DateTime(picked.year, picked.month, picked.day));
                }
              },
              // toWesternDigits guards against the picker's locale-aware
              // formatting leaking Arabic-Indic digits into our label.
              child: Text(
                value == null ? '—' : toWesternDigits(dateLabel(value)),
                textDirection: TextDirection.ltr,
                textAlign: TextAlign.right,
              ),
            ),
          ),
          if (onClear != null && value != null)
            IconButton(
              icon: const Icon(Icons.clear, size: 18),
              onPressed: onClear,
              tooltip: 'مسح التاريخ',
            ),
        ],
      ),
    );
  }
}
