import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../core/formatters.dart';
import '../core/theme.dart';
import 'recommendation_parser.dart';
import 'watchlist_item.dart';
import 'watchlist_providers.dart';

/// Paste a chat message, review what was read out of it, save the lot.
///
/// The review step is not optional. Chat messages have no fixed format, so the
/// parser produces a draft rather than a commitment — anything it read wrongly
/// gets corrected here, before it reaches storage.
class PasteRecommendationsScreen extends ConsumerStatefulWidget {
  const PasteRecommendationsScreen({super.key});

  @override
  ConsumerState<PasteRecommendationsScreen> createState() =>
      _PasteRecommendationsScreenState();
}

class _PasteRecommendationsScreenState
    extends ConsumerState<PasteRecommendationsScreen> {
  final _messageController = TextEditingController();
  final _sourceController = TextEditingController();

  /// Null until the message has been read — that is what switches the screen
  /// from "paste" mode to "review" mode.
  List<_Draft>? _drafts;

  @override
  void dispose() {
    _messageController.dispose();
    _sourceController.dispose();
    for (final draft in _drafts ?? const <_Draft>[]) {
      draft.dispose();
    }
    super.dispose();
  }

  void _read() {
    final parsed = RecommendationParser.parse(_messageController.text);
    setState(() {
      for (final draft in _drafts ?? const <_Draft>[]) {
        draft.dispose();
      }
      _drafts = [for (final item in parsed) _Draft(item)];
    });
  }

  Future<void> _saveAll() async {
    final drafts = _drafts;
    if (drafts == null) return;

    final source = _sourceController.text.trim();
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final notifier = ref.read(watchlistProvider.notifier);

    var saved = 0;
    for (final draft in drafts) {
      if (!draft.selected || !draft.isValid) continue;
      await notifier.add(
        WatchlistItem(
          id: const Uuid().v4(),
          ticker: draft.ticker.text.trim().toUpperCase(),
          targetBuyPrice: parseNumber(draft.entry.text)!,
          stopPrice: parseNumber(draft.stop.text)!,
          reason: draft.reason.text.trim().isEmpty
              ? 'ترشيح'
              : draft.reason.text.trim(),
          priority: draft.priority,
          dateAdded: today,
          source: source.isEmpty ? null : source,
        ),
      );
      saved++;
    }

    if (!mounted) return;
    Navigator.of(context).pop();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('اتحفظ ${quantity(saved)} ترشيح في المتابعة')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final drafts = _drafts;
    final theme = Theme.of(context);
    final readyCount =
        drafts?.where((d) => d.selected && d.isValid).length ?? 0;

    return Scaffold(
      appBar: AppBar(title: const Text('لصق ترشيحات')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            controller: _messageController,
            maxLines: 8,
            minLines: 4,
            decoration: const InputDecoration(
              labelText: 'الصق الرسالة هنا',
              hintText:
                  'مثال:\nCOMI دخول 10.50 استوب 9.80\nHRHO شراء 18.40 وقف 17.90',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 12),

          TextField(
            controller: _sourceController,
            decoration: const InputDecoration(
              labelText: 'المصدر',
              hintText: 'مين رشّحها؟ قناة، محلل، تحليلك…',
              helperText: 'هيتنقل مع الصفقة، وتشوف بعدين كل مصدر كسّبك كام',
            ),
          ),
          const SizedBox(height: 16),

          FilledButton.icon(
            onPressed: _read,
            icon: const Icon(Icons.auto_fix_high),
            label: const Text('اقرأ الرسالة'),
          ),
          const SizedBox(height: 20),

          if (drafts != null) ...[
            const Divider(),
            const SizedBox(height: 8),
            if (drafts.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 24),
                child: Column(
                  children: [
                    Icon(
                      Icons.search_off,
                      size: 40,
                      color: theme.colorScheme.outline,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'ملقيتش ترشيحات في الرسالة دي',
                      style: theme.textTheme.titleSmall,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'جرّب تسيب سطر لكل سهم، والرمز بالإنجليزي زي COMI.',
                      style: theme.textTheme.bodySmall,
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              )
            else ...[
              Row(
                children: [
                  Text(
                    'راجع قبل الحفظ',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    '${quantity(readyCount)} / ${quantity(drafts.length)}',
                    style: theme.textTheme.bodySmall,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              for (final draft in drafts)
                _DraftCard(
                  draft: draft,
                  onChanged: () => setState(() {}),
                ),
              const SizedBox(height: 8),
              FilledButton(
                onPressed: readyCount == 0 ? null : _saveAll,
                child: Text(
                  readyCount == 0
                      ? 'كمّل الناقص الأول'
                      : 'احفظ ${quantity(readyCount)} في المتابعة',
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }
}

/// One editable row. Holds its own controllers so edits survive rebuilds.
class _Draft {
  final String rawLine;
  final TextEditingController ticker;
  final TextEditingController entry;
  final TextEditingController stop;
  final TextEditingController reason;
  WatchPriority priority = WatchPriority.medium;
  bool selected = true;

  _Draft(ParsedRecommendation parsed)
    : rawLine = parsed.rawLine,
      ticker = TextEditingController(text: parsed.ticker ?? ''),
      entry = TextEditingController(text: _price(parsed.entryPrice)),
      stop = TextEditingController(text: _price(parsed.stopPrice)),
      reason = TextEditingController(
        text: parsed.targetPrice == null
            ? ''
            : 'الهدف ${_price(parsed.targetPrice)}',
      );

  static String _price(double? value) =>
      value == null ? '' : value.toStringAsFixed(2);

  /// Mirrors the watchlist form's rules, so nothing invalid can be saved in
  /// bulk that the single-item form would have rejected.
  bool get isValid {
    if (ticker.text.trim().isEmpty) return false;
    final entryValue = parseNumber(entry.text);
    final stopValue = parseNumber(stop.text);
    if (entryValue == null || entryValue <= 0) return false;
    if (stopValue == null || stopValue <= 0) return false;
    return stopValue < entryValue;
  }

  String? get problem {
    if (ticker.text.trim().isEmpty) return 'الرمز ناقص';
    final entryValue = parseNumber(entry.text);
    final stopValue = parseNumber(stop.text);
    if (entryValue == null || entryValue <= 0) return 'سعر الشراء ناقص';
    if (stopValue == null || stopValue <= 0) return 'الاستوب ناقص';
    if (stopValue >= entryValue) return 'الاستوب لازم يكون أقل من سعر الشراء';
    return null;
  }

  void dispose() {
    ticker.dispose();
    entry.dispose();
    stop.dispose();
    reason.dispose();
  }
}

class _DraftCard extends StatelessWidget {
  final _Draft draft;
  final VoidCallback onChanged;

  const _DraftCard({required this.draft, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.resultColors;
    final problem = draft.problem;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Card(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: problem == null
                ? theme.colorScheme.outlineVariant
                : colors.breakeven,
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 4, 12, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Checkbox(
                    value: draft.selected,
                    onChanged: (value) {
                      draft.selected = value ?? false;
                      onChanged();
                    },
                  ),
                  Expanded(
                    child: Text(
                      draft.rawLine.trim(),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              if (draft.selected) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: _Field(
                        controller: draft.ticker,
                        label: 'الرمز',
                        onChanged: onChanged,
                        uppercase: true,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      flex: 2,
                      child: _Field(
                        controller: draft.entry,
                        label: 'الشراء',
                        onChanged: onChanged,
                        numeric: true,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      flex: 2,
                      child: _Field(
                        controller: draft.stop,
                        label: 'الاستوب',
                        onChanged: onChanged,
                        numeric: true,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 6,
                  children: [
                    for (final priority in WatchPriority.values)
                      ChoiceChip(
                        label: Text(priority.label),
                        selected: priority == draft.priority,
                        visualDensity: VisualDensity.compact,
                        onSelected: (_) {
                          draft.priority = priority;
                          onChanged();
                        },
                      ),
                  ],
                ),
                if (problem != null) ...[
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(
                        Icons.error_outline,
                        size: 16,
                        color: colors.breakeven,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        problem,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colors.breakeven,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _Field extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final VoidCallback onChanged;
  final bool numeric;
  final bool uppercase;

  const _Field({
    required this.controller,
    required this.label,
    required this.onChanged,
    this.numeric = false,
    this.uppercase = false,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      onChanged: (_) => onChanged(),
      keyboardType: numeric
          ? const TextInputType.numberWithOptions(decimal: true)
          : TextInputType.text,
      textCapitalization: uppercase
          ? TextCapitalization.characters
          : TextCapitalization.none,
      inputFormatters: numeric
          ? [FilteringTextInputFormatter.allow(RegExp(r'[0-9.٠-٩]'))]
          : null,
      textDirection: numeric ? TextDirection.ltr : null,
      textAlign: numeric ? TextAlign.center : TextAlign.start,
      decoration: InputDecoration(labelText: label, isDense: true),
    );
  }
}
