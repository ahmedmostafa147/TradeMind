import 'package:flutter/material.dart';

import 'palette_scheme.dart';

/// Chip and SegmentedButton theme specs derived from [PaletteScheme].
class AppThemeChips {
  const AppThemeChips._();

  static const String _fontFamily = 'Cairo';

  static ChipThemeData chip(PaletteScheme p) => ChipThemeData(
        backgroundColor: p.surfaceLow,
        selectedColor: p.brand,
        secondarySelectedColor: p.brand,
        disabledColor: p.surfaceLow.withValues(alpha: 0.5),
        checkmarkColor: p.onBrand,
        labelStyle: TextStyle(
          color: p.onSurface,
          fontFamily: _fontFamily,
          fontWeight: FontWeight.w600,
        ),
        secondaryLabelStyle: TextStyle(
          color: p.onBrand,
          fontFamily: _fontFamily,
          fontWeight: FontWeight.bold,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        side: BorderSide(color: p.outlineVariant),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      );

  static SegmentedButtonThemeData segmentedButton(PaletteScheme p) =>
      SegmentedButtonThemeData(
        style: ButtonStyle(
          backgroundColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) return p.brand;
            return p.surfaceLow;
          }),
          foregroundColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) return p.onBrand;
            return p.onSurface;
          }),
          textStyle: WidgetStateProperty.resolveWith((states) {
            final isSel = states.contains(WidgetState.selected);
            return TextStyle(
              fontFamily: _fontFamily,
              fontWeight: isSel ? FontWeight.bold : FontWeight.w600,
              fontSize: 13,
            );
          }),
          side: WidgetStateProperty.all(BorderSide(color: p.outlineVariant)),
          shape: WidgetStateProperty.all(
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
      );
}
