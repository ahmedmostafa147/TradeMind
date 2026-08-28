import 'package:flutter/material.dart';

import '../../core/calc/sizing_result.dart';
import '../../core/formatters.dart';
import '../../features/market/widgets/stock_quote_badge.dart';
import '../../features/market/widgets/ticker_field.dart';
import '../timeline_entry.dart';
import '../trade_status.dart';
import 'trade_form_attachments.dart';
import 'trade_form_fields.dart';

/// Renders the main form inputs: Status, Ticker, Prices, Quantity, Live Preview & Attachments.
class TradeFormBody extends StatelessWidget {
  final TradeStatus status;
  final ValueChanged<TradeStatus> onStatusChanged;
  final TextEditingController tickerController;
  final TextEditingController entryController;
  final TextEditingController stopController;
  final TextEditingController quantityController;
  final TextEditingController takeProfitController;
  final TextEditingController reasonController;
  final TextEditingController notesController;
  final SizingResult liveResult;
  final List<String> tags;
  final ValueChanged<List<String>> onTagsChanged;
  final List<String> screenshots;
  final VoidCallback onPickImages;
  final ValueChanged<String> onRemoveScreenshot;
  final List<TimelineEntry> timeline;
  final ValueChanged<List<TimelineEntry>> onTimelineChanged;

  /// Exit price and date. Only meaningful for a position that was actually
  /// taken, so the section is hidden for planned and cancelled ideas.
  final TextEditingController exitController;
  final DateTime? exitDate;
  final ValueChanged<DateTime?> onExitDateChanged;

  /// When the position was opened.
  ///
  /// The form had no control for this at all: `DateTime.now()` was stamped on
  /// save and there was no way to change it, so a trade logged the morning
  /// after was permanently dated wrong — and «الأداء الشهري», the equity curve
  /// and «متوسط مدة الاحتفاظ» all read from this field. The web form has always
  /// had the picker.
  final DateTime entryDate;
  final ValueChanged<DateTime> onEntryDateChanged;

  const TradeFormBody({
    super.key,
    required this.status,
    required this.onStatusChanged,
    required this.entryDate,
    required this.onEntryDateChanged,
    required this.tickerController,
    required this.entryController,
    required this.stopController,
    required this.quantityController,
    required this.takeProfitController,
    required this.reasonController,
    required this.notesController,
    required this.liveResult,
    required this.tags,
    required this.onTagsChanged,
    required this.screenshots,
    required this.onPickImages,
    required this.onRemoveScreenshot,
    required this.timeline,
    required this.onTimelineChanged,
    required this.exitController,
    required this.exitDate,
    required this.onExitDateChanged,
  });

  @override
  Widget build(BuildContext context) {
    final ticker = tickerController.text.trim();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        StatusSelector(
          value: status,
          onChanged: onStatusChanged,
        ),
        const SizedBox(height: 16),
        TickerField(
          controller: tickerController,
          validator: (v) =>
              (v == null || v.trim().isEmpty) ? 'أدخل الرمز' : null,
        ),
        if (ticker.isNotEmpty) ...[
          const SizedBox(height: 8),
          StockQuoteBadge(symbol: ticker),
        ],
        const SizedBox(height: 16),
        _EntryDateField(
          date: entryDate,
          isExecuted: status.isExecuted,
          onChanged: onEntryDateChanged,
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: FormNumberField(
                controller: entryController,
                label: 'سعر الدخول',
                suffix: kCurrencySuffix,
                onChanged: () {},
                validator: (_) {
                  final v = parseNumber(entryController.text);
                  if (v == null || v <= 0) return 'أدخل سعر صحيح';
                  return null;
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: FormNumberField(
                controller: stopController,
                label: 'سعر الاستوب',
                suffix: kCurrencySuffix,
                onChanged: () {},
                validator: (_) {
                  final v = parseNumber(stopController.text);
                  if (v == null || v <= 0) return 'أدخل سعر صحيح';
                  final ev = parseNumber(entryController.text);
                  if (ev != null && v >= ev) return 'لازم أقل من الدخول';
                  return null;
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: FormNumberField(
                controller: quantityController,
                label: 'عدد الأسهم',
                integerOnly: true,
                onChanged: () {},
                // Same as the quick sheet: with no capital there is nothing to
                // size against, and an empty helper reads as a bug rather than
                // as a missing setting.
                helperText: liveResult.suggestedQty != null
                    ? 'المقترح: ${quantity(liveResult.suggestedQty)}'
                    // `maxLoss` is capital × risk%, and the risk% is validated
                    // above zero everywhere it is set — so a zero budget here
                    // means exactly one thing: no capital.
                    : (liveResult.maxLoss > 0
                          ? null
                          : 'حدّد رأس مالك في الإعدادات عشان يطلع مقترح'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: FormNumberField(
                controller: takeProfitController,
                label: 'الهدف (اختياري)',
                suffix: kCurrencySuffix,
                onChanged: () {},
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        LivePreviewCard(result: liveResult),
        const SizedBox(height: 16),
        TextFormField(
          controller: reasonController,
          decoration:
              const InputDecoration(labelText: 'سبب الدخول والتحليل الفني'),
          maxLines: 2,
          validator: (v) =>
              (v == null || v.trim().isEmpty) ? 'اكتب سبب الدخول' : null,
        ),
        // Restores the only way to close a trade. The refactor dropped these
        // inputs while `_exitController` stayed wired into the save path, so
        // the "إقفال" button sent people to a form that could not record an
        // exit — and with no closed trades, P&L, win rate and the equity curve
        // could never be anything but empty.
        if (status.isExecuted) ...[
          const SizedBox(height: 16),
          const Divider(),
          const SizedBox(height: 8),
          Text(
            'الخروج من الصفقة',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 4),
          Text(
            // Says what saving actually does now. The old line —
            // «سيبهم فاضيين لو الصفقة لسه مفتوحة» — described only the empty
            // case, so filling them in and still seeing «مفتوحة» afterwards
            // looked like the save had failed.
            status == TradeStatus.closed
                ? 'الصفقة مغلقة، فلازم تكتب سعر وتاريخ الخروج.'
                : 'املا الاتنين وهي تتقفل لوحدها. سيبهم فاضيين لو لسه مفتوحة.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: FormNumberField(
                  controller: exitController,
                  label: 'سعر الخروج',
                  suffix: kCurrencySuffix,
                  onChanged: () {},
                  // [Trade] asserts exitPrice and exitDate are set together, so
                  // a price with no date crashed the save outright. Both halves
                  // are reported here because the date field is not a
                  // FormField and cannot show an error of its own.
                  validator: (_) {
                    final price = parseNumber(exitController.text);
                    if (price == null) {
                      // «مغلقة» with no exit is a contradiction the model
                      // cannot hold: `Trade.isOpen` reads `exitPrice == null`,
                      // so the record would call itself open the moment it was
                      // written back.
                      if (status == TradeStatus.closed) {
                        return 'صفقة مغلقة لازم يكون ليها سعر خروج';
                      }
                      // A date alone is dropped silently on save; say so rather
                      // than discarding what the user picked.
                      return exitDate == null ? null : 'اكتب سعر الخروج كمان';
                    }
                    if (price <= 0) return 'أدخل سعر صحيح';
                    if (exitDate == null) return 'اختار تاريخ الخروج';
                    return null;
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(child: _ExitDateField(
                date: exitDate,
                onChanged: onExitDateChanged,
              )),
            ],
          ),
        ],
        const SizedBox(height: 16),
        TradeFormAttachments(
          tags: tags,
          onTagsChanged: onTagsChanged,
          screenshots: screenshots,
          onPickImages: onPickImages,
          onRemoveScreenshot: onRemoveScreenshot,
          timeline: timeline,
          onTimelineChanged: onTimelineChanged,
          notesController: notesController,
        ),
      ],
    );
  }
}

/// Entry date picker.
///
/// The label follows the status for the same reason the web form's does: on a
/// plan the date is an intention, on an executed trade it is a record.
class _EntryDateField extends StatelessWidget {
  final DateTime date;
  final bool isExecuted;
  final ValueChanged<DateTime> onChanged;

  const _EntryDateField({
    required this.date,
    required this.isExecuted,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return InkWell(
      onTap: () async {
        final picked = await showDatePicker(
          context: context,
          initialDate: date,
          firstDate: DateTime(2000),
          // A plan can be dated forward; a trade already taken cannot.
          lastDate: isExecuted
              ? DateTime.now().add(const Duration(days: 1))
              : DateTime.now().add(const Duration(days: 365)),
        );
        if (picked != null) onChanged(picked);
      },
      borderRadius: BorderRadius.circular(16),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: isExecuted ? 'تاريخ الدخول' : 'تاريخ الدخول المتوقّع',
          suffixIcon: const Icon(Icons.calendar_today_rounded, size: 18),
        ),
        child: NumericText(dateLabel(date), style: theme.textTheme.bodyLarge),
      ),
    );
  }
}

/// Exit date picker, styled to sit beside the exit price field.
class _ExitDateField extends StatelessWidget {
  final DateTime? date;
  final ValueChanged<DateTime?> onChanged;

  const _ExitDateField({required this.date, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return InkWell(
      onTap: () async {
        final picked = await showDatePicker(
          context: context,
          initialDate: date ?? DateTime.now(),
          firstDate: DateTime(2000),
          lastDate: DateTime.now().add(const Duration(days: 1)),
        );
        if (picked != null) onChanged(picked);
      },
      borderRadius: BorderRadius.circular(16),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: 'تاريخ الخروج',
          // Clearing matters: an exit price without a date is rejected by the
          // Trade model, so the user needs a way back out of a half-entry.
          suffixIcon: date == null
              ? const Icon(Icons.calendar_today_rounded, size: 18)
              : IconButton(
                  icon: const Icon(Icons.clear, size: 18),
                  tooltip: 'مسح التاريخ',
                  onPressed: () => onChanged(null),
                ),
        ),
        child: NumericText(
          date == null ? '—' : dateLabel(date!),
          style: theme.textTheme.bodyLarge,
        ),
      ),
    );
  }
}
