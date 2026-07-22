import 'dart:ui';

import 'package:flutter/material.dart';

import 'palette.dart';

/// Brand and gradient tokens for the handful of places that need a colour
/// outside a build context.
///
/// Everything here forwards to [activePalette] — there are no colour literals
/// in this file. Widgets should still prefer `Theme.of(context)` and
/// `context.resultColors`, which are brightness-correct; these getters read the
/// *platform* brightness and so are wrong inside a nested Theme.
///
/// Holds NO theme state. Theme mode lives in Hive behind `themeModeProvider`,
/// which is what MaterialApp reads — a second copy here would be a rival source
/// of truth for the same setting and the two could drift apart.
class AppColors {
  const AppColors._();

  /// Platform brightness. See the class note: prefer Theme.of(context).
  static bool get isDark =>
      PlatformDispatcher.instance.platformBrightness == Brightness.dark;

  static PaletteScheme get _scheme =>
      isDark ? activePalette.dark : activePalette.light;

  static PaletteScheme get light => activePalette.light;
  static PaletteScheme get dark => activePalette.dark;

  static Color get primary => _scheme.brand;
  static Color get accent => _scheme.accent;
  static Color get error => _scheme.error;

  static Color get background => _scheme.background;
  static Color get surface => _scheme.surface;
  static Color get surfaceLight => _scheme.surfaceLow;
  static Color get inputBar => _scheme.surfaceLow;

  static Color get textPrimary => _scheme.onSurface;
  static Color get textSecondary => _scheme.onSurfaceVariant;
  static Color get textMuted => _scheme.outline;

  static Color get border => _scheme.outlineVariant;
  static Color get cardShadow => _scheme.shadow;

  static LinearGradient get headerGradient => _scheme.headerGradient;
  static LinearGradient get brandGradient => _scheme.brandGradient;
}
