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
