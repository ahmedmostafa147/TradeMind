import 'package:flutter/material.dart';

import '../timeline_entry.dart';
import 'screenshot_picker.dart';
import 'tag_editor.dart';
import 'timeline_editor.dart';
import 'trade_form_fields.dart';

/// Collapsible optional attachments section (Tags, Screenshots, Timeline, Notes).
class TradeFormAttachments extends StatelessWidget {
  final List<String> tags;
  final ValueChanged<List<String>> onTagsChanged;
  final List<String> screenshots;
  final VoidCallback onPickImages;
  final ValueChanged<String> onRemoveScreenshot;
  final List<TimelineEntry> timeline;
  final ValueChanged<List<TimelineEntry>> onTimelineChanged;
  final TextEditingController notesController;

  const TradeFormAttachments({
    super.key,
    required this.tags,
    required this.onTagsChanged,
    required this.screenshots,
    required this.onPickImages,
    required this.onRemoveScreenshot,
    required this.timeline,
    required this.onTimelineChanged,
    required this.notesController,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ExpansionTile(
        title: const Text(
          'أدوات ومرفقات إضافية (صور، تصنيفات، سجل)',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        childrenPadding: const EdgeInsets.all(16),
        children: [
          FormSection(
            title: 'التصنيفات',
            child: TagEditor(
              tags: tags,
              onChanged: onTagsChanged,
            ),
          ),
          FormSection(
            title: 'مرفقات الصور',
            child: ScreenshotPicker(
              paths: screenshots,
              onAdd: onPickImages,
              onRemove: onRemoveScreenshot,
            ),
          ),
          FormSection(
            title: 'مخطط زمني للتعديلات',
            child: TimelineEditor(
              entries: timeline,
              onChanged: onTimelineChanged,
            ),
          ),
          TextFormField(
            controller: notesController,
            decoration: const InputDecoration(labelText: 'ملاحظات ختامية'),
            maxLines: 2,
          ),
        ],
      ),
    );
  }
}
