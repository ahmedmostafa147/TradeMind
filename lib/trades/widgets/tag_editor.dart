import 'package:flutter/material.dart';

/// Common EGX-trader tags offered as one-tap suggestions. Free text is still
/// allowed — these only save typing.
const List<String> kSuggestedTags = [
  'بريك أوت',
  'سوينج',
  'توزيعات',
  'نتائج أعمال',
  'أخبار',
  'دعم',
  'مقاومة',
  'زخم',
];

class TagEditor extends StatefulWidget {
  final List<String> tags;
  final ValueChanged<List<String>> onChanged;

  const TagEditor({super.key, required this.tags, required this.onChanged});

  @override
  State<TagEditor> createState() => _TagEditorState();
}

class _TagEditorState extends State<TagEditor> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _add(String raw) {
    final tag = raw.trim();
    // Case-insensitive duplicate check, so "سوينج" typed twice or a suggestion
    // tapped after being typed does not produce two chips.
    if (tag.isEmpty ||
        widget.tags.any((t) => t.toLowerCase() == tag.toLowerCase())) {
      _controller.clear();
      return;
    }
    widget.onChanged([...widget.tags, tag]);
    _controller.clear();
  }

  void _remove(String tag) =>
      widget.onChanged(widget.tags.where((t) => t != tag).toList());

  @override
  Widget build(BuildContext context) {
    final unused = kSuggestedTags
        .where(
          (s) => !widget.tags.any((t) => t.toLowerCase() == s.toLowerCase()),
        )
        .toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.tags.isNotEmpty) ...[
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final tag in widget.tags)
                InputChip(
                  label: Text(tag),
                  onDeleted: () => _remove(tag),
                  visualDensity: VisualDensity.compact,
                ),
            ],
          ),
          const SizedBox(height: 12),
        ],
        TextField(
          controller: _controller,
          textInputAction: TextInputAction.done,
          onSubmitted: _add,
          decoration: InputDecoration(
            labelText: 'تصنيف جديد',
            hintText: 'اكتب واضغط إدخال',
            suffixIcon: IconButton(
              icon: const Icon(Icons.add),
              onPressed: () => _add(_controller.text),
            ),
          ),
        ),
        if (unused.isNotEmpty) ...[
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final suggestion in unused)
                ActionChip(
                  label: Text(suggestion),
                  onPressed: () => _add(suggestion),
                  visualDensity: VisualDensity.compact,
                ),
            ],
          ),
        ],
      ],
    );
  }
}
