import 'package:flutter/material.dart';

import 'theme/app_theme.dart';

/// The theme barrel. Importing this gives a widget the palette, the generated
/// [ThemeData] and the `context.resultColors` extension.
///
/// To restyle the whole app, edit `activePalette` in `theme/palette.dart` —
/// that is the only line that picks colours.
export 'theme/app_colors.dart';
export 'theme/app_theme.dart';
export 'theme/palette.dart';
export 'theme/result_colors.dart';

/// Legacy helpers forwarding to AppTheme for backwards compatibility.
ThemeData buildLightTheme() => AppTheme.light();
ThemeData buildDarkTheme() => AppTheme.dark();
