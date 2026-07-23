import 'package:flutter/material.dart';

/// A round badge showing a ticker's first letters on a colour derived from the
/// ticker itself.
///
/// EGX has no free, complete source of company logos, and runtime scraping for
/// them would be fragile and slow. A deterministic initials avatar needs no
/// network, never breaks, and still gives each stock a stable, recognisable
/// mark — the same COMI is always the same colour.
class TickerAvatar extends StatelessWidget {
  final String ticker;
  final double size;

  const TickerAvatar({super.key, required this.ticker, this.size = 40});

  /// Muted, evenly-spread hues. Chosen to read on both light and dark cards and
  /// to stay clear of the red/green the app reserves for profit and loss.
  static const _palette = [
    Color(0xFF3B82F6),
    Color(0xFF6366F1),
    Color(0xFF8B5CF6),
    Color(0xFF0EA5E9),
    Color(0xFF14B8A6),
    Color(0xFF0891B2),
    Color(0xFFF59E0B),
    Color(0xFFEC4899),
    Color(0xFF64748B),
  ];

  Color get _color {
    // Small deterministic hash, stable across sessions and Dart versions.
    var hash = 0;
    for (final unit in ticker.codeUnits) {
      hash = (hash * 31 + unit) & 0x7fffffff;
    }
    return _palette[hash % _palette.length];
  }

  String get _initials {
    final clean = ticker.trim();
    if (clean.isEmpty) return '؟';
    // EGX codes are short Latin (COMI, TMGH); two letters read best.
    return clean.length <= 2
        ? clean.toUpperCase()
        : clean.substring(0, 2).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final color = _color;
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.16),
        shape: BoxShape.circle,
        border: Border.all(color: color.withValues(alpha: 0.5)),
      ),
      child: Text(
        _initials,
        // Latin initials, so pin LTR regardless of the RTL surroundings.
        textDirection: TextDirection.ltr,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w800,
          fontSize: size * 0.34,
        ),
      ),
    );
  }
}
