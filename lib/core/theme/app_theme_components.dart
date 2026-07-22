import 'package:flutter/material.dart';

import 'palette_scheme.dart';

/// Button, Input, Card, and Navigation theme specs derived from [PaletteScheme].
class AppThemeComponents {
  const AppThemeComponents._();

  static const String _fontFamily = 'Cairo';

  static TextTheme makeTextTheme(TextTheme base, PaletteScheme p) {
    final custom = base.apply(fontFamily: _fontFamily);
    return custom.copyWith(
      bodyLarge: custom.bodyLarge?.copyWith(
        fontWeight: FontWeight.w600,
        color: p.onSurface,
      ),
      bodyMedium: custom.bodyMedium?.copyWith(
        fontWeight: FontWeight.w600,
        color: p.onSurface,
      ),
      bodySmall: custom.bodySmall?.copyWith(
        fontWeight: FontWeight.w600,
        color: p.onSurfaceVariant,
      ),
      titleLarge: custom.titleLarge?.copyWith(
        fontWeight: FontWeight.w700,
        color: p.onSurface,
      ),
      titleMedium: custom.titleMedium?.copyWith(
        fontWeight: FontWeight.w700,
        color: p.onSurface,
      ),
      titleSmall: custom.titleSmall?.copyWith(
        fontWeight: FontWeight.w700,
        color: p.onSurface,
      ),
      labelLarge: custom.labelLarge?.copyWith(
        fontWeight: FontWeight.w700,
        color: p.onSurface,
      ),
      labelMedium: custom.labelMedium?.copyWith(
        fontWeight: FontWeight.w600,
        color: p.onSurfaceVariant,
      ),
      labelSmall: custom.labelSmall?.copyWith(
        fontWeight: FontWeight.w600,
        color: p.onSurfaceVariant,
      ),
    );
  }

  static FilledButtonThemeData filledButton(PaletteScheme p) =>
      FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: p.brand,
          foregroundColor: p.onBrand,
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      );

  static OutlinedButtonThemeData outlinedButton(PaletteScheme p) =>
      OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: p.brand,
          side: BorderSide(color: p.outlineVariant),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      );

  static InputDecorationTheme inputDecoration(PaletteScheme p) =>
      InputDecorationTheme(
        filled: true,
        fillColor: p.surfaceLow,
        labelStyle: TextStyle(color: p.onSurfaceVariant),
        hintStyle: TextStyle(color: p.outline),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: p.outlineVariant),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: p.brand, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: p.error),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: p.error, width: 1.5),
        ),
      );

  static CardThemeData card(PaletteScheme p, bool isDark) => CardThemeData(
    color: p.surface,
    surfaceTintColor: Colors.transparent,
    elevation: isDark ? 0 : 2,
    shadowColor: p.shadow,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
  );

  static NavigationBarThemeData navigationBar(PaletteScheme p) =>
      NavigationBarThemeData(
        backgroundColor: p.surface,
        surfaceTintColor: Colors.transparent,
        indicatorColor: p.brandContainer,
        elevation: 3,
      );

  static SnackBarThemeData snackBar(PaletteScheme p) => SnackBarThemeData(
    backgroundColor: p.inverseSurface,
    contentTextStyle: const TextStyle(
      color: Colors.white,
      fontFamily: _fontFamily,
    ),
    behavior: SnackBarBehavior.floating,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
  );
}
