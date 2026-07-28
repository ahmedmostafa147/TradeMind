import 'package:flutter/material.dart';

import 'app_theme_chips.dart';
import 'app_theme_components.dart';
import 'palette.dart';
import 'result_colors.dart';

/// Builds the Light and Dark [ThemeData] from [activePalette].
class AppTheme {
  const AppTheme._();

  static const String _fontFamily = 'Cairo';

  static ThemeData light() => _buildTheme(Brightness.light);
  static ThemeData dark() => _buildTheme(Brightness.dark);

  static ThemeData _buildTheme(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    final p = activePalette.of(brightness);
    final base = isDark
        ? ThemeData.dark(useMaterial3: true)
        : ThemeData.light(useMaterial3: true);

    final colorScheme = ColorScheme(
      brightness: brightness,

      // primary is [accent], NOT [brand].
      //
      // Material uses ColorScheme.primary both ways: as a fill (FilledButton,
      // the Switch thumb, the focused input border) and as a foreground (the
      // TextButton label, a tinted icon). A palette whose brand is a light,
      // vivid colour cannot serve both — the acid lime is 1.15:1 as text on
      // white, so every `colorScheme.primary` icon in the app would vanish.
      //
      // [accent] is the token that carries the double contract, and the
      // generator enforces it: accent must clear 4.5:1 against the surface AND
      // host onAccent. The loud lime stays [brand] and is applied only where
      // the pairing is stated outright — the FAB, the filled button, the
      // navigation indicator — each with onBrand on top of it.
      primary: p.accent,
      onPrimary: p.onAccent,
      primaryContainer: p.brandContainer,
      onPrimaryContainer: p.onBrandContainer,
      secondary: p.brand,
      onSecondary: p.onBrand,
      error: p.error,
      onError: p.onError,
      errorContainer: p.errorContainer,
      onErrorContainer: p.onErrorContainer,
      surface: p.surface,
      onSurface: p.onSurface,
      onSurfaceVariant: p.onSurfaceVariant,
      surfaceContainerLowest: p.background,
      surfaceContainerLow: p.surfaceLow,
      surfaceContainer: p.surfaceLow,
      surfaceContainerHigh: p.surfaceHigh,
      surfaceContainerHighest: p.surfaceHighest,
      outline: p.outline,
      outlineVariant: p.outlineVariant,
      inverseSurface: p.inverseSurface,
      onInverseSurface: p.onInverseSurface,
      shadow: p.shadow,
    );

    final textTheme = AppThemeComponents.makeTextTheme(base.textTheme, p);

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: p.background,
      fontFamily: _fontFamily,
      textTheme: textTheme,
      primaryTextTheme:
          AppThemeComponents.makeTextTheme(base.primaryTextTheme, p),
      dividerColor: p.outlineVariant,
      dividerTheme: DividerThemeData(
        color: p.outlineVariant,
        thickness: 1,
        space: 1,
      ),
      extensions: [ResultColors.fromScheme(p)],
      appBarTheme: AppBarTheme(
        backgroundColor: p.surface,
        foregroundColor: p.onSurface,
        surfaceTintColor: Colors.transparent,
        centerTitle: false,
        elevation: 0,
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: p.brand,
        foregroundColor: p.onBrand,
        elevation: 4,
      ),
      filledButtonTheme: AppThemeComponents.filledButton(p),
      // A label, so it takes the ink form rather than the fill.
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: p.accent),
      ),
      outlinedButtonTheme: AppThemeComponents.outlinedButton(p),
      inputDecorationTheme: AppThemeComponents.inputDecoration(p),
      cardTheme: AppThemeComponents.card(p, isDark),
      chipTheme: AppThemeChips.chip(p),
      segmentedButtonTheme: AppThemeChips.segmentedButton(p),
      navigationBarTheme: AppThemeComponents.navigationBar(p),
      snackBarTheme: AppThemeComponents.snackBar(p),
    );
  }
}
