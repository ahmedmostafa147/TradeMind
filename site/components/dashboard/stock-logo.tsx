'use client';

import { useState } from 'react';

/**
 * A company's logo, with the ticker chip as its fallback.
 *
 * ── THE FALLBACK IS THE POINT, NOT AN AFTERTHOUGHT ─────────────────────────
 *
 * 284 of the board's 293 listings have a logo, so roughly one card in thirty
 * has none — plus every card on a session where the proxy cannot be reached.
 * A missing logo therefore has to look like a DECISION rather than a broken
 * image, which is the same rule the price paths keep: «—» for a quote that did
 * not arrive, never a 0.
 *
 * So the fallback is a MONOGRAM of the company name, at the same size the logo
 * occupies, which means the layout is identical whether or not the image
 * resolves. Nothing shifts when one loads late, and nothing looks wrong when
 * one never loads.
 *
 * NOT the ticker: the card shows that in the chip immediately beside this tile,
 * and the app's widget tests caught the first draft doing exactly that — two
 * «COMI»s two millimetres apart. A placeholder that repeats its neighbour is
 * noise wearing the costume of information.
 *
 * `onError` is why this is a client component and an `<img>` rather than
 * `next/image`: the fallback needs the load to actually fail, and the file is a
 * remote SVG that the image optimiser would neither resize nor cache usefully.
 */
export function StockLogo({
  logoId,
  name,
  className = 'size-9',
}: {
  logoId: string | null;
  /** The company name the monogram is taken from — never the ticker. */
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!logoId || failed) {
    // `Intl.Segmenter`, not `name[0]`: an Arabic name can open with a combining
    // mark and an index would cut it in half. Mirrors `characters.first` in
    // lib/features/market/widgets/stock_logo.dart.
    const first = [...new Intl.Segmenter().segment(name.trim())][0]?.segment ?? '—';
    return (
      <span
        aria-hidden
        className={`flex shrink-0 items-center justify-center rounded-lg bg-surface-high text-sm font-extrabold text-fg-muted ${className}`}
      >
        {first}
      </span>
    );
  }

  return (
    <img
      // SLASHED. `trailingSlash: true` answers 308 to the unslashed form, and
      // `<img>` follows it — but that is one wasted round trip per logo on a
      // 293-row board. Same reason use-board.ts calls `/api/stocks/`.
      src={`/api/logo/?id=${encodeURIComponent(logoId)}`}
      alt=""
      aria-hidden
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      // `bg-white` under a transparent logo on purpose: these are brand marks
      // drawn for a light background, and several are dark-on-transparent — on
      // the dark theme they would be a black shape on a near-black card.
      className={`shrink-0 rounded-lg bg-white object-contain p-1 ${className}`}
    />
  );
}
