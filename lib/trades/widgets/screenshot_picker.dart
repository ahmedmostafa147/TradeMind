import 'dart:io';

import 'package:flutter/material.dart';

/// Thumbnail strip with add and remove, used inside the trade form.
///
/// Removal only drops the path from the list — the file itself is deleted by
/// the form when it saves, so backing out of an edit cannot destroy images that
/// are still referenced by the saved record.
class ScreenshotPicker extends StatelessWidget {
  final List<String> paths;
  final VoidCallback onAdd;
  final ValueChanged<String> onRemove;
  final bool busy;

  const ScreenshotPicker({
    super.key,
    required this.paths,
    required this.onAdd,
    required this.onRemove,
    this.busy = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (paths.isNotEmpty)
          SizedBox(
            height: 100,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: paths.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final path = paths[index];
                return Stack(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: _Thumb(path: path),
                    ),
                    PositionedDirectional(
                      top: 2,
                      end: 2,
                      child: GestureDetector(
                        onTap: () => onRemove(path),
                        child: Container(
                          decoration: BoxDecoration(
                            color: theme.colorScheme.surface.withValues(
                              alpha: 0.85,
                            ),
                            shape: BoxShape.circle,
                          ),
                          padding: const EdgeInsets.all(2),
                          child: const Icon(Icons.close, size: 16),
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          onPressed: busy ? null : onAdd,
          icon: busy
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.add_photo_alternate_outlined),
          label: Text(busy ? 'بيحمّل…' : 'إضافة صور'),
        ),
      ],
    );
  }
}

class _Thumb extends StatelessWidget {
  final String path;

  const _Thumb({required this.path});

  @override
  Widget build(BuildContext context) {
    final file = File(path);
    // A referenced file can go missing — cleared storage, or a backup restored
    // onto another device. Never let that throw during a form rebuild.
    if (!file.existsSync()) {
      return Container(
        width: 100,
        height: 100,
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        child: Icon(
          Icons.broken_image_outlined,
          color: Theme.of(context).colorScheme.outline,
        ),
      );
    }
    return Image.file(file, width: 100, height: 100, fit: BoxFit.cover);
  }
}
