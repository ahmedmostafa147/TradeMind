import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../core/formatters.dart';
import 'watchlist_item.dart';
import 'watchlist_providers.dart';

class WatchlistFormScreen extends ConsumerStatefulWidget {
  final WatchlistItem? existing;

  const WatchlistFormScreen({super.key, this.existing});

  @override
  ConsumerState<WatchlistFormScreen> createState() =>
      _WatchlistFormScreenState();
}

class _WatchlistFormScreenState extends ConsumerState<WatchlistFormScreen> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _tickerController;
  late final TextEditingController _targetController;
  late final TextEditingController _stopController;
  late final TextEditingController _reasonController;
  late final TextEditingController _sourceController;
  late WatchPriority _priority;

  bool get _isEditing => widget.existing != null;

  @override
  void initState() {
    super.initState();
    final existing = widget.existing;
    String price(double? value) =>
        value == null ? '' : value.toStringAsFixed(2);

    _tickerController = TextEditingController(text: existing?.ticker ?? '');
    _targetController = TextEditingController(
      text: price(existing?.targetBuyPrice),
    );
    _stopController = TextEditingController(text: price(existing?.stopPrice));
    _reasonController = TextEditingController(text: existing?.reason ?? '');
    _sourceController = TextEditingController(text: existing?.source ?? '');
    _priority = existing?.priority ?? WatchPriority.medium;
  }

  @override
  void dispose() {
    _tickerController.dispose();
    _targetController.dispose();
    _stopController.dispose();
    _reasonController.dispose();
    _sourceController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditing ? 'تعديل المتابعة' : 'إضافة للمتابعة'),
      ),
      body: Form(
        key: _formKey,
        autovalidateMode: AutovalidateMode.onUserInteraction,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
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

            _PriceField(
              controller: _targetController,
              label: 'سعر الشراء المستهدف',
              onChanged: () => setState(() {}),
              validator: (_) {
                final value = parseNumber(_targetController.text);
                if (value == null || value <= 0) {
                  return 'السعر لازم يكون أكبر من صفر';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            _PriceField(
              controller: _stopController,
              label: 'سعر الاستوب',
              onChanged: () => setState(() {}),
              validator: (_) {
                final value = parseNumber(_stopController.text);
                if (value == null || value <= 0) {
                  return 'السعر لازم يكون أكبر من صفر';
                }
                final target = parseNumber(_targetController.text);
                if (target != null && value >= target) {
                  return 'الاستوب لازم يكون أقل من سعر الشراء';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            TextFormField(
              controller: _reasonController,
              decoration: const InputDecoration(labelText: 'سبب المتابعة'),
              maxLines: 2,
              validator: (value) => (value == null || value.trim().isEmpty)
                  ? 'اكتب سبب المتابعة'
                  : null,
            ),
            const SizedBox(height: 16),

            TextFormField(
              controller: _sourceController,
              decoration: const InputDecoration(
                labelText: 'المصدر',
                hintText: 'مين رشّحها؟ (اختياري)',
              ),
            ),
            const SizedBox(height: 24),

            Text('الأولوية', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                for (final priority in WatchPriority.values)
                  ChoiceChip(
                    label: Text(priority.label),
                    selected: priority == _priority,
                    onSelected: (_) => setState(() => _priority = priority),
                  ),
              ],
            ),
            const SizedBox(height: 24),

            FilledButton(
              onPressed: _save,
              child: Text(_isEditing ? 'حفظ التعديلات' : 'إضافة'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    final now = DateTime.now();
    final item = WatchlistItem(
      id: widget.existing?.id ?? const Uuid().v4(),
      ticker: _tickerController.text.trim().toUpperCase(),
      targetBuyPrice: parseNumber(_targetController.text)!,
      stopPrice: parseNumber(_stopController.text)!,
      reason: _reasonController.text.trim(),
      priority: _priority,
      dateAdded:
          widget.existing?.dateAdded ??
          DateTime(now.year, now.month, now.day),
      source: _sourceController.text.trim().isEmpty
          ? null
          : _sourceController.text.trim(),
    );

    final notifier = ref.read(watchlistProvider.notifier);
    if (_isEditing) {
      await notifier.update(item);
    } else {
      await notifier.add(item);
    }
    if (mounted) Navigator.of(context).pop();
  }
}

class _PriceField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final VoidCallback onChanged;
  final FormFieldValidator<String>? validator;

  const _PriceField({
    required this.controller,
    required this.label,
    required this.onChanged,
    this.validator,
  });

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      onChanged: (_) => onChanged(),
      validator: validator,
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      inputFormatters: [
        FilteringTextInputFormatter.allow(RegExp(r'[0-9.٠-٩]')),
      ],
      textDirection: TextDirection.ltr,
      textAlign: TextAlign.right,
      decoration: InputDecoration(
        labelText: label,
        suffixText: kCurrencySuffix,
      ),
    );
  }
}
