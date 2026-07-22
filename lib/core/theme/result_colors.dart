import 'package:flutter/material.dart';

import 'palette.dart';

/// Semantic colours for trade outcomes (win, loss, open, breakeven).
///
/// Each outcome carries three tokens:
///
/// * the base colour — text and icons;
/// * `*Surface` — the chip/banner background;
/// * `*Border`  — the chip/banner outline.
///
/// The surface and border tokens are **opaque**. Tinting by compositing the
/// base colour at low alpha (`win.withValues(alpha: 0.12)`) only lands as
/// intended on top of `surface`; over a card, a gradient header or a filled
/// tile the same call produces a different colour each time, and on white the
/// result is so faint it disappears. Baking the tints removes that dependency
/// on whatever happens to be painted underneath.
///
/// Values come from [activePalette]; this class does not define colours.
class ResultColors extends ThemeExtension<ResultColors> {
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

  const ResultColors({
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
  });

  /// Lifts the outcome tokens out of a palette scheme.
  factory ResultColors.fromScheme(PaletteScheme s) => ResultColors(
    win: s.win,
    loss: s.loss,
    open: s.open,
    breakeven: s.breakeven,
    winSurface: s.winSurface,
    lossSurface: s.lossSurface,
    openSurface: s.openSurface,
    breakevenSurface: s.breakevenSurface,
    winBorder: s.winBorder,
    lossBorder: s.lossBorder,
    openBorder: s.openBorder,
    breakevenBorder: s.breakevenBorder,
  );

  static ResultColors get light =>
      ResultColors.fromScheme(activePalette.light);
  static ResultColors get dark => ResultColors.fromScheme(activePalette.dark);

  /// The opaque chip background matching [content], for call sites that pick an
  /// outcome colour dynamically. Unrecognised colours fall back to the neutral
  /// tint rather than to a transparent one.
  Color surfaceFor(Color content) {
    if (content == win) return winSurface;
    if (content == loss) return lossSurface;
    if (content == breakeven) return breakevenSurface;
    return openSurface;
  }

  /// The opaque chip outline matching [content]. See [surfaceFor].
  Color borderFor(Color content) {
    if (content == win) return winBorder;
    if (content == loss) return lossBorder;
    if (content == breakeven) return breakevenBorder;
    return openBorder;
  }

  @override
  ResultColors copyWith({
    Color? win,
    Color? loss,
    Color? open,
    Color? breakeven,
    Color? winSurface,
    Color? lossSurface,
    Color? openSurface,
    Color? breakevenSurface,
    Color? winBorder,
    Color? lossBorder,
    Color? openBorder,
    Color? breakevenBorder,
  }) => ResultColors(
    win: win ?? this.win,
    loss: loss ?? this.loss,
    open: open ?? this.open,
    breakeven: breakeven ?? this.breakeven,
    winSurface: winSurface ?? this.winSurface,
    lossSurface: lossSurface ?? this.lossSurface,
    openSurface: openSurface ?? this.openSurface,
    breakevenSurface: breakevenSurface ?? this.breakevenSurface,
    winBorder: winBorder ?? this.winBorder,
    lossBorder: lossBorder ?? this.lossBorder,
    openBorder: openBorder ?? this.openBorder,
    breakevenBorder: breakevenBorder ?? this.breakevenBorder,
  );

  @override
  ResultColors lerp(ThemeExtension<ResultColors>? other, double t) {
    if (other is! ResultColors) return this;
    return ResultColors(
      win: Color.lerp(win, other.win, t)!,
      loss: Color.lerp(loss, other.loss, t)!,
      open: Color.lerp(open, other.open, t)!,
      breakeven: Color.lerp(breakeven, other.breakeven, t)!,
      winSurface: Color.lerp(winSurface, other.winSurface, t)!,
      lossSurface: Color.lerp(lossSurface, other.lossSurface, t)!,
      openSurface: Color.lerp(openSurface, other.openSurface, t)!,
      breakevenSurface:
          Color.lerp(breakevenSurface, other.breakevenSurface, t)!,
      winBorder: Color.lerp(winBorder, other.winBorder, t)!,
      lossBorder: Color.lerp(lossBorder, other.lossBorder, t)!,
      openBorder: Color.lerp(openBorder, other.openBorder, t)!,
      breakevenBorder: Color.lerp(breakevenBorder, other.breakevenBorder, t)!,
    );
  }
}

extension ResultColorsX on BuildContext {
  /// Theme-aware accessor for trading result colors.
  ResultColors get resultColors {
    final theme = Theme.of(this);
    return theme.extension<ResultColors>() ??
        (theme.brightness == Brightness.dark
            ? ResultColors.dark
            : ResultColors.light);
  }
}
