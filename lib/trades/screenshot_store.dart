import 'dart:io';

import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';

/// Copies picked images into the app's own storage and hands back their paths.
///
/// The gallery path the picker returns is a temporary cache entry on Android —
/// it can be cleared at any time, which would leave the journal pointing at
/// files that no longer exist. Copying into the documents directory makes the
/// attachment as durable as the trade record itself.
///
/// Images are stored as files and referenced by path. Putting bytes in the record
/// would bloat the box and undo the large-journal performance work.
class ScreenshotStore {
  static const String _folder = 'screenshots';

  final ImagePicker _picker;

  ScreenshotStore({ImagePicker? picker}) : _picker = picker ?? ImagePicker();

  Future<Directory> _directory() async {
    final docs = await getApplicationDocumentsDirectory();
    final dir = Directory('${docs.path}/$_folder');
    if (!await dir.exists()) await dir.create(recursive: true);
    return dir;
  }

  /// Picks images from the gallery and returns the paths of the stored copies.
  /// Returns an empty list when the user backs out.
  Future<List<String>> pickAndStore() async {
    final picked = await _picker.pickMultiImage();
    if (picked.isEmpty) return const [];

    final dir = await _directory();
    final stored = <String>[];
    for (var i = 0; i < picked.length; i++) {
      final source = picked[i];
      // Uniqueness comes from the source filename plus an index rather than a
      // timestamp, so two images picked in the same millisecond cannot collide.
      final extension = _extensionOf(source.name);
      final name =
          '${DateTime.now().microsecondsSinceEpoch}_$i$extension';
      final destination = File('${dir.path}/$name');
      await destination.writeAsBytes(await source.readAsBytes());
      stored.add(destination.path);
    }
    return stored;
  }

  /// Best-effort delete. A missing or already-removed file is not an error —
  /// the trade record is the source of truth, not the filesystem.
  Future<void> delete(String path) async {
    try {
      final file = File(path);
      if (await file.exists()) await file.delete();
    } on FileSystemException {
      // Ignored deliberately: failing to delete an orphan must never block
      // saving or editing a trade.
    }
  }

  static String _extensionOf(String filename) {
    final dot = filename.lastIndexOf('.');
    if (dot < 0 || dot == filename.length - 1) return '.jpg';
    final ext = filename.substring(dot).toLowerCase();
    // Guard against a pathological "filename" carrying a path separator.
    return ext.contains('/') || ext.contains(r'\') ? '.jpg' : ext;
  }
}
