import 'package:flutter/material.dart';

/// Stable per-note accent colors: every note in a chat gets its own hue,
/// derived from the message id so it never changes between rebuilds/sessions.
class NoteAccents {
  const NoteAccents._();

  static const List<Color> palette = [
    Color(0xFF34D399), // emerald
    Color(0xFF60A5FA), // sky blue
    Color(0xFFA78BFA), // violet
    Color(0xFFFBBF24), // amber
    Color(0xFFFB7185), // coral
    Color(0xFF22D3EE), // cyan
  ];

  /// The accent for a note: the user's pick when they've made one, otherwise
  /// the stable hue derived from the note id.
  static Color of(String id, {int? colorIndex}) {
    if (colorIndex != null) return palette[colorIndex % palette.length];

    // Tiny deterministic hash to stay stable across Dart versions.
    var hash = 0;
    for (final unit in id.codeUnits) {
      hash = (hash * 31 + unit) & 0x7fffffff;
    }
    return palette[hash % palette.length];
  }
}
