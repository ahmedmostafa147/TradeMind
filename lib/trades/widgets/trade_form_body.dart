import 'package:flutter/material.dart';

import '../../core/calc/sizing_result.dart';
import '../../core/formatters.dart';
import '../../features/market/widgets/stock_quote_badge.dart';
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

  const TradeFormBody({
    super.key,
    required this.status,
    required this.onStatusChanged,
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
        TextFormField(
          controller: tickerController,
          textCapitalization: TextCapitalization.characters,
          decoration: const InputDecoration(
            labelText: 'رمز السهم',
            hintText: 'COMI',
          ),
          validator: (v) =>
              (v == null || v.trim().isEmpty) ? 'أدخل الرمز' : null,
        ),
        if (ticker.isNotEmpty) ...[
          const SizedBox(height: 8),
          StockQuoteBadge(symbol: ticker),
        ],
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
                helperText: liveResult.suggestedQty != null
                    ? 'المقترح: ${quantity(liveResult.suggestedQty)}'
                    : null,
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
