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
 * So the fallback is a MONOGRAM of the company name, in the same circle the
 * logo occupies, which means the layout is identical whether or not the image
 * resolves. Nothing shifts when one loads late, and nothing looks wrong when
 * one never loads.
 *
 * ── AND IT IS A CIRCLE BECAUSE THE ART IS ─────────────────────────────────
 *
 * MEASURED over all 280 files: 274 carry their own full 18×18 background rect,
 * 241 of those the same pale `#F0F3FA`. These are not bare marks — they are
 * self-contained avatars, drawn with their own padding, which is why the
 * source renders them as circles. In a rounded SQUARE the handful with a
 * saturated background (COMI's blue, Fawry's yellow) read as loud colour
 * blocks beside pale ones; the circle gives every row the same silhouette and
 * clips nothing, since the corners it removes are background by construction.
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
        className={`flex shrink-0 items-center justify-center rounded-full bg-surface-high text-sm font-extrabold text-fg-muted ${className}`}
      >
        {first}
      </span>
    );
  }

  return (
    <img
      // OUR OWN FILE, downloaded once by tool/fetch-logos.mjs. It used to be a
      // proxy route; the file is better on all three counts — nothing of ours
      // relays somebody else's asset, nothing breaks when their CDN stops
      // answering, and a static asset is the cheapest thing a server does.
      src={`/logos/${encodeURIComponent(logoId)}.svg`}
      alt=""
      aria-hidden
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      // NO PADDING: the art already carries its own background and inset, so a
      // second one just drew a frame around a smaller logo. `bg-white` stays
      // under it for the six files that are transparent — on the dark theme
      // those would be a black shape on a near-black card.
      className={`shrink-0 rounded-full bg-white object-contain ${className}`}
    />
  );
}
