import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/calc/sizing_result.dart';
import '../core/formatters.dart';
import '../settings/settings_providers.dart';
import 'screenshot_store.dart';
import 'timeline_entry.dart';
import 'trade.dart';
import 'trade_draft.dart';
import 'trade_status.dart';
import 'widgets/trade_form_body.dart';
import 'widgets/trade_form_saver.dart';

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

  final _unsavedScreenshots = <String>[];
  final _store = ScreenshotStore();
  bool _pickingImages = false;

  bool get _isEditing => widget.existing != null;

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    final d = widget.draft;
    String p(double? v) => v == null ? '' : v.toStringAsFixed(2);

    _tickerController = TextEditingController(text: e?.ticker ?? d?.ticker ?? '');
    _reasonController = TextEditingController(text: e?.reason ?? d?.reason ?? '');
    _entryController = TextEditingController(text: p(e?.entryPrice ?? d?.entryPrice));
    _stopController = TextEditingController(text: p(e?.stopPrice ?? d?.stopPrice));
    _quantityController = TextEditingController(text: (e?.quantity ?? d?.quantity)?.toString() ?? '');
    _takeProfitController = TextEditingController(text: p(e?.takeProfitPrice ?? d?.takeProfitPrice));
    _exitController = TextEditingController(text: p(e?.exitPrice));
    _notesController = TextEditingController(text: e?.notes ?? '');

    _entryDate = e?.entryDate ?? DateTime.now();
    _exitDate = e?.exitDate;
    _status = e?.status ?? TradeStatus.planned;
    _tags = List.from(e?.tags ?? const []);
    _isFavorite = e?.isFavorite ?? false;
    _checklist = List.from(e?.completedChecklistItems ?? const []);
    _screenshots = List.from(e?.screenshotPaths ?? const []);
    _timeline = List.from(e?.timeline ?? const []);
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

  Future<void> _pickImages() async {
    if (_pickingImages) return;
    setState(() => _pickingImages = true);
    try {
      final paths = await _store.pickAndStore();
      if (paths.isEmpty) return;
      _unsavedScreenshots.addAll(paths);
      setState(() => _screenshots.addAll(paths));
    } finally {
      if (mounted) setState(() => _pickingImages = false);
    }
  }

  Future<void> _save() async {
    final entry = parseNumber(_entryController.text);
    final stop = parseNumber(_stopController.text);
    if (entry == null || stop == null) return;

    await TradeFormSaver.saveTrade(
      context: context,
      ref: ref,
      existing: widget.existing,
      formKey: _formKey,
      entryDate: _entryDate,
      ticker: _tickerController.text,
      reason: _reasonController.text,
      entryPrice: entry,
      stopPrice: stop,
      quantity: parseInteger(_quantityController.text) ?? 0,
      takeProfitPrice: parseNumber(_takeProfitController.text),
      exitPriceText: _exitController.text,
      exitDate: _exitDate,
      notesText: _notesController.text,
      status: _status,
      tags: _tags,
      isFavorite: _isFavorite,
      screenshots: _screenshots,
      checklist: _checklist,
      timeline: _timeline,
      unsavedScreenshots: _unsavedScreenshots,
      store: _store,
    );
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
            onPressed: () => setState(() => _isFavorite = !_isFavorite),
          ),
          TextButton(onPressed: _save, child: const Text('حفظ')),
        ],
      ),
      body: Form(
        key: _formKey,
        autovalidateMode: AutovalidateMode.onUserInteraction,
        child: TradeFormBody(
          status: _status,
          onStatusChanged: (s) => setState(() => _status = s),
          tickerController: _tickerController,
          entryController: _entryController,
          stopController: _stopController,
          quantityController: _quantityController,
          takeProfitController: _takeProfitController,
          reasonController: _reasonController,
          notesController: _notesController,
          liveResult: live,
          tags: _tags,
          onTagsChanged: (t) => setState(() => _tags = t),
          screenshots: _screenshots,
          onPickImages: _pickImages,
          onRemoveScreenshot: (p) => setState(() => _screenshots.remove(p)),
          exitController: _exitController,
          exitDate: _exitDate,
          onExitDateChanged: (d) => setState(() => _exitDate = d),
          timeline: _timeline,
          onTimelineChanged: (t) => setState(() => _timeline = t),
        ),
      ),
    );
  }
}
