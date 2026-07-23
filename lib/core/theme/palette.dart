import 'package:flutter/material.dart';

import 'palette_scheme.dart';
import 'palettes/monochrome_palette.dart';
import 'palettes/teal_palette.dart';

export 'palette_scheme.dart';

/// ============================================================================
/// THE ONE LINE TO CHANGE THE ENTIRE APP THEME.
///
/// Every colour in the app resolves to [activePalette]. Swap the value below
/// and the whole app — light mode, dark mode, buttons, cards, badges, charts —
/// changes instantly.
/// ============================================================================
const Palette activePalette = AppPalettes.monochrome;

abstract final class AppPalettes {
  static const monochrome = monochromePalette;
  static const teal = tealPalette;
}

extension PaletteX on BuildContext {
  /// The active palette at the *widget's* brightness.
  ///
  /// Use this for tokens that have no ColorScheme equivalent (for example
  /// `aiAccent`). Unlike the static getters on `AppColors`, it reads the
  /// surrounding Theme rather than the platform, so it stays correct inside a
  /// nested Theme and when the user overrides the mode in settings.
  PaletteScheme get palette => activePalette.of(Theme.of(this).brightness);
}
