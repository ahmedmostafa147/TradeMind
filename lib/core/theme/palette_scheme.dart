import 'package:flutter/material.dart';

/// The complete set of colours for a single brightness.
@immutable
class PaletteScheme {
  final Color brand;
  final Color onBrand;
  final Color brandContainer;
  final Color onBrandContainer;
  final Color accent;
  final Color onAccent;

  final Color background;
  final Color surface;
  final Color surfaceLow;
  final Color surfaceHigh;
  final Color surfaceHighest;

  final Color onSurface;
  final Color onSurfaceVariant;
  final Color outline;
  final Color outlineVariant;

  final Color inverseSurface;
  final Color onInverseSurface;

  final Color error;
  final Color onError;
  final Color errorContainer;
  final Color onErrorContainer;

  final Color win;
  final Color loss;
  final Color open;
  final Color breakeven;

  final Color winSurface;
  final Color lossSurface;
  final Color openSurface;
  final Color breakevenSurface;

  final Color winBorder;
  final Color lossBorder;
  final Color openBorder;
  final Color breakevenBorder;

  final Color shadow;
  final Color headerFrom;
  final Color headerTo;

  const PaletteScheme({
    required this.brand,
    required this.onBrand,
    required this.brandContainer,
    required this.onBrandContainer,
    required this.accent,
    required this.onAccent,
    required this.background,
    required this.surface,
    required this.surfaceLow,
    required this.surfaceHigh,
    required this.surfaceHighest,
    required this.onSurface,
    required this.onSurfaceVariant,
    required this.outline,
    required this.outlineVariant,
    required this.inverseSurface,
    required this.onInverseSurface,
    required this.error,
    required this.onError,
    required this.errorContainer,
    required this.onErrorContainer,
    required this.win,
    required this.loss,
    required this.open,
    required this.breakeven,
    required this.winSurface,
    required this.lossSurface,
    required this.openSurface,
    required this.breakevenSurface,
    required this.winBorder,
    required this.lossBorder,
    required this.openBorder,
    required this.breakevenBorder,
    required this.shadow,
    required this.headerFrom,
    required this.headerTo,
  });

  LinearGradient get headerGradient => LinearGradient(
        colors: [headerFrom, headerTo],
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
      );

  LinearGradient get brandGradient => LinearGradient(
        colors: [brand, accent],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      );
}

/// A named light/dark pair.
@immutable
class Palette {
  final String name;
  final PaletteScheme light;
  final PaletteScheme dark;

  const Palette({
    required this.name,
    required this.light,
    required this.dark,
  });

  PaletteScheme of(Brightness brightness) =>
      brightness == Brightness.dark ? dark : light;
}
