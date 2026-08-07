import 'dart:math' as math;

import 'package:egx_trade_journal/core/theme/app_theme.dart';
import 'package:egx_trade_journal/core/theme/palette.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// A snackbar sits on `inverseSurface`, and INVERSE SURFACE FLIPS WITH THE
/// THEME: charcoal in the light palette, cream in the dark one.
///
/// The message text was hard-coded to `Colors.white`, so in dark mode every
/// snackbar in the app was white on cream — «تمت إضافة صفقة», «اتسجّلت
/// الملاحظة», «أدخل سعر وتاريخ الخروج» — unreadable, with nothing in the
/// analyzer or the widget tests to notice.
///
/// This is the same trap CLAUDE.md records for the web: never put a fixed
/// foreground on an inverse surface, only its own `on` token.
void main() {
  /// The same 4.5:1 bar the palette generator holds every other pair to.
  double contrast(Color a, Color b) {
    double channel(double c) =>
        c <= 0.03928 ? c / 12.92 : math.pow((c + 0.055) / 1.055, 2.4).toDouble();
    double luminance(Color c) =>
        0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);

    final la = luminance(a);
    final lb = luminance(b);
    return (math.max(la, lb) + 0.05) / (math.min(la, lb) + 0.05);
  }

  for (final brightness in Brightness.values) {
    final label = brightness.name;
    final palette = activePalette.of(brightness);
    final snackBar = (brightness == Brightness.dark
            ? AppTheme.dark()
            : AppTheme.light())
        .snackBarTheme;

    test('$label: the snackbar message reads on its own background', () {
      expect(snackBar.backgroundColor, palette.inverseSurface);

      final text = snackBar.contentTextStyle?.color;
      expect(text, isNotNull);
      expect(
        contrast(text!, snackBar.backgroundColor!),
        greaterThanOrEqualTo(4.5),
        reason: 'a message nobody can read is a message that was not shown',
      );
    });

    test('$label: the snackbar action reads too', () {
      // Left unset, Material falls back to `colorScheme.inversePrimary` — a
      // colour this palette never defines, so it came from the seeded default
      // with no contrast guarantee against our own inverse surface.
      final action = snackBar.actionTextColor;
      expect(action, isNotNull);
      expect(
        contrast(action!, snackBar.backgroundColor!),
        greaterThanOrEqualTo(4.5),
      );
    });
  }
}
