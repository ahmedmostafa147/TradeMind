import 'package:flutter/material.dart';

import 'palette_scheme.dart';
import 'palettes/generated_palettes.dart';

export 'palette_scheme.dart';

/// ============================================================================
/// THE ONE LINE TO CHANGE THE ENTIRE APP THEME — but do not change it here.
///
/// Every colour in the app resolves to [activePalette], and [activePalette]
/// comes from `design/palettes.json`, which is also what generates the web
/// site's CSS tokens. Editing the JSON's `"active"` field and running
/// `npm --prefix site run theme` re-themes the app AND the site in one step.
///
/// Editing this file instead would re-theme only the app, and the site would
/// silently keep the old colours — which is exactly the drift the generator
/// exists to make impossible.
/// ============================================================================
const Palette activePalette = activePaletteData;

/// The palettes that ship, for anything that needs to name one directly (a
/// theme picker, a widget test asserting behaviour across brands).
///
/// These are re-exports of generated constants. Adding a palette means adding
/// it to `design/palettes.json` and regenerating, not writing one here — a
/// hand-written palette would skip the contrast gate that the generator runs
/// over every token pair before it emits anything.
abstract final class AppPalettes {
  static const cobalt = cobaltPalette;
  static const cyan = cyanPalette;
  static const violet = violetPalette;
  static const monochrome = monochromePalette;
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
