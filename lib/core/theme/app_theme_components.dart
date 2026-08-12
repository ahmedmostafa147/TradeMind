import 'package:flutter/material.dart';

import 'palette_scheme.dart';

/// Button, Input, Card, and Navigation theme specs derived from [PaletteScheme].
class AppThemeComponents {
  const AppThemeComponents._();

  static const String _fontFamily = 'IBMPlexSansArabic';

  static TextTheme makeTextTheme(TextTheme base, PaletteScheme p) {
    final custom = base.apply(fontFamily: _fontFamily);
    return custom.copyWith(
      bodyLarge: custom.bodyLarge?.copyWith(fontWeight: FontWeight.w600, color: p.onSurface),
      bodyMedium: custom.bodyMedium?.copyWith(fontWeight: FontWeight.w600, color: p.onSurface),
      bodySmall: custom.bodySmall?.copyWith(fontWeight: FontWeight.w600, color: p.onSurfaceVariant),
      titleLarge: custom.titleLarge?.copyWith(fontWeight: FontWeight.w700, color: p.onSurface),
      titleMedium: custom.titleMedium?.copyWith(fontWeight: FontWeight.w700, color: p.onSurface),
      titleSmall: custom.titleSmall?.copyWith(fontWeight: FontWeight.w700, color: p.onSurface),
      labelLarge: custom.labelLarge?.copyWith(fontWeight: FontWeight.w700, color: p.onSurface),
      labelMedium: custom.labelMedium?.copyWith(fontWeight: FontWeight.w600, color: p.onSurfaceVariant),
      labelSmall: custom.labelSmall?.copyWith(fontWeight: FontWeight.w600, color: p.onSurfaceVariant),
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

  /// Its label sits on the page background, not on a brand fill, so it takes
  /// [PaletteScheme.accent] — the ink form. [PaletteScheme.brand] here would be
  /// lime type on white under the active palette.
  static OutlinedButtonThemeData outlinedButton(PaletteScheme p) =>
      OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: p.accent,
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
        // A 1.5px hairline is the thinnest thing in the app that has to be
        // noticed, so it takes the ink form too — a lime focus ring on a light
        // field is invisible, and this is the affordance that tells a user
        // which input they are typing into.
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: p.accent, width: 1.5),
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
        elevation: 8,
        height: 68,
        indicatorColor: p.brand,
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return IconThemeData(color: p.onBrand, size: 24);
          }
          return IconThemeData(
            color: p.onSurfaceVariant.withValues(alpha: 0.7),
            size: 22,
          );
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return TextStyle(
              color: p.onSurface,
              fontWeight: FontWeight.bold,
              fontSize: 12,
              fontFamily: _fontFamily,
            );
          }
          return TextStyle(
            color: p.onSurfaceVariant.withValues(alpha: 0.7),
            fontWeight: FontWeight.w500,
            fontSize: 11,
            fontFamily: _fontFamily,
          );
        }),
      );

  /// A snackbar sits on [PaletteScheme.inverseSurface], which FLIPS WITH THE
  /// THEME — charcoal in the light palettes, cream in the dark ones. The text
  /// was hard-coded to `Colors.white`, so in dark mode it was white on cream
  /// and the message could not be read at all.
  ///
  /// Both the message and the action take [PaletteScheme.onInverseSurface],
  /// the only token that is guaranteed to read on that background in either
  /// brightness. `brand` is not an option here for the same reason it is not
  /// text anywhere else: 1.15:1 lemon on the cream inverse surface.
  static SnackBarThemeData snackBar(PaletteScheme p) => SnackBarThemeData(
    backgroundColor: p.inverseSurface,
    contentTextStyle: TextStyle(
      color: p.onInverseSurface,
      fontFamily: _fontFamily,
    ),
    // Left to Material this defaults to `colorScheme.inversePrimary`, a colour
    // this palette never defines — so it came from the seeded fallback with no
    // contrast guarantee against our own inverse surface.
    actionTextColor: p.onInverseSurface,
    behavior: SnackBarBehavior.floating,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
  );
}
