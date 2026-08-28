import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../services/egx_market_service.dart';

/// A company's logo, with the ticker chip as its fallback.
///
/// MIRROR OF site/components/dashboard/stock-logo.tsx — same source, same
/// fallback, same size, so the list reads identically on both surfaces.
///
/// ── THE FALLBACK IS THE POINT ──────────────────────────────────────────────
///
/// 284 of the board's 293 listings have a logo, so about one row in thirty has
/// none — plus every row on a session where the proxy cannot be reached. A
/// missing logo has to look like a DECISION rather than a broken image, which
/// is the rule every price path here already keeps: «—» for a quote that did
/// not arrive, never a 0.
///
/// So the fallback is a MONOGRAM of the company name, at the same size the
/// logo occupies. Nothing shifts when one loads late and nothing looks wrong
/// when one never loads — including under `flutter test`, where no image ever
/// resolves.
///
/// The first draft put the TICKER in that tile, and the widget tests caught it:
/// the row's own title is the ticker, so the fallback repeated the word sitting
/// two millimetres away. A placeholder that duplicates its neighbour is noise
/// wearing the costume of information.
class StockLogo extends StatelessWidget {
  final String? logoId;

  /// The company name the monogram is taken from. The ticker is a poor
  /// fallback here — see the note above.
  final String name;

  final double size;

  const StockLogo({
    super.key,
    required this.logoId,
    required this.name,
    this.size = 36,
  });

  @override
  Widget build(BuildContext context) {
    final url = EgxMarketService.logoUrl(logoId);
    if (url == null) return _Monogram(name: name, size: size);

    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: Container(
        width: size,
        height: size,
        // White beneath a transparent logo ON PURPOSE: these are brand marks
        // drawn for a light background, and several are dark-on-transparent —
        // on the dark theme they would be a black shape on a near-black tile.
        //
        // NO PADDING: the art is a square that already carries its own light
        // background, so an inset just drew a white frame around a smaller logo.
        color: Colors.white,
        child: SvgPicture.network(
          url,
          fit: BoxFit.contain,
          // Both of these render the chip, and both are ordinary: a listing
          // with no logo file 404s, and an offline phone never connects.
          placeholderBuilder: (_) => _Monogram(name: name, size: size),
          errorBuilder: (_, _, _) => _Monogram(name: name, size: size),
        ),
      ),
    );
  }
}

class _Monogram extends StatelessWidget {
  final String name;
  final double size;

  const _Monogram({required this.name, required this.size});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      // `characters`, not `substring(0, 1)`: an Arabic name can open with a
      // combining mark and an emoji-bearing one with a surrogate pair, and
      // either would be cut in half by an index.
      child: Text(
        name.characters.isEmpty ? '—' : name.characters.first,
        style: theme.textTheme.titleSmall?.copyWith(
          fontWeight: FontWeight.bold,
          color: theme.colorScheme.onSurfaceVariant,
        ),
      ),
    );
  }
}
