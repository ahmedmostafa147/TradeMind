import 'package:flutter/material.dart';

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
      primary: p.brand,
      onPrimary: p.onBrand,
      primaryContainer: p.brandContainer,
      onPrimaryContainer: p.onBrandContainer,
      secondary: p.accent,
      onSecondary: p.onAccent,
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

    final textTheme = base.textTheme.apply(fontFamily: _fontFamily);

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: p.background,
      fontFamily: _fontFamily,
      textTheme: textTheme,
      primaryTextTheme: base.primaryTextTheme.apply(fontFamily: _fontFamily),
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
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: p.brand),
      ),
      outlinedButtonTheme: AppThemeComponents.outlinedButton(p),
      inputDecorationTheme: AppThemeComponents.inputDecoration(p),
      cardTheme: AppThemeComponents.card(p, isDark),
      chipTheme: ChipThemeData(
        backgroundColor: p.surfaceHighest,
        side: BorderSide(color: p.outlineVariant),
        labelStyle: TextStyle(color: p.onSurface, fontFamily: _fontFamily),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
      ),
      navigationBarTheme: AppThemeComponents.navigationBar(p),
      snackBarTheme: AppThemeComponents.snackBar(p),
    );
  }
}
