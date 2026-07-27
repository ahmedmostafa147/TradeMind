import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ImageResponse } from 'next/og';

import { site } from '@/lib/site';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Metadata routes need this under `output: 'export'` — see app/robots.ts. */
export const dynamic = 'force-static';

export const alt = `${site.name} — ${site.tagline}`;

/**
 * Lays out one line of Arabic as explicit flex items, one per word.
 *
 * This exists because satori — the renderer behind ImageResponse — shapes
 * Arabic letters correctly but gets the bidi WORD order wrong: it emits
 * "ده السهم اشتريت فاكر" for "فاكر اشتريت السهم ده". Setting `direction: rtl`
 * changes nothing; it reverses either way.
 *
 * Reversing the source string to cancel that out is the obvious hack and the
 * wrong one — it silently produces a scrambled share card the day satori fixes
 * its bug. Instead each word becomes its own flex child, so ordering comes
 * from `row-reverse` (plain, deterministic layout) rather than from bidi
 * resolution. Single words shape correctly on their own, which is the part
 * satori does get right.
 */
function ArabicLine({
  text,
  style,
  gap = 18,
}: {
  text: string;
  style?: React.CSSProperties;
  gap?: number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row-reverse',
        // No flex-wrap: every line here is authored short enough to fit, and
        // wrapping made satori stretch the row and ignore the gap entirely.
        // First child lands rightmost under row-reverse, so words are passed
        // in normal reading order and need no pre-processing.
        justifyContent: 'flex-start',
        ...style,
      }}
    >
      {text.split(' ').map((word, index) => (
        <div
          key={`${word}-${index}`}
          style={{
            display: 'flex',
            flexShrink: 0,
            // Word spacing as an explicit margin, not the container's `gap`:
            // on a row-reverse row satori ignored gap entirely (8, 18 and -34
            // all rendered pixel-identical) while margin applies normally.
            //
            // The values at the call sites are tuned per line and look odd —
            // negative on the large text, positive on the small. That is real:
            // satori pads each word box by an amount that does not scale with
            // font size, so the correction is empirical and was set by
            // inspecting the generated PNG. Re-check the image after changing
            // any font size or string here; it will not be right by default.
            marginLeft: index === text.split(' ').length - 1 ? 0 : `${gap}px`,
          }}
        >
          {word}
        </div>
      ))}
    </div>
  );
}

export default async function OpengraphImage() {
  // TTF, not the woff2 the browser gets: satori cannot decompress woff2, so
  // the uncompressed originals stay in assets/ for this build step alone. They
  // live outside public/ so `output: export` does not also publish 480KB of
  // fonts nobody downloads.
  const [cairo700, cairo400] = await Promise.all([
    readFile(join(process.cwd(), 'assets/fonts/Cairo-700.ttf')),
    readFile(join(process.cwd(), 'assets/fonts/Cairo-400.ttf')),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          // The card is Arabic, so every block hangs off the right edge — the
          // Latin wordmark included. Leaving the brand top-left while the copy
          // sat right read as a layout bug rather than a deliberate contrast.
          alignItems: 'flex-end',
          background: '#000000',
          color: '#ffffff',
          padding: '68px 72px',
          fontFamily: 'Cairo',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          {/* The one spot of colour on the card, and it is the win green —
              the same rule the app's palette states: colour is for money. */}
          <div
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '8px',
              background: '#3ddc84',
            }}
          />
          <div style={{ fontSize: '32px', fontWeight: 700 }}>{site.name}</div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '4px',
          }}
        >
          {/* Broken into two explicit lines rather than left to flex-wrap.
              Wrapping put "ليه؟" alone on the second line, which orphans the
              question mark and wrecks the balance — and the break point would
              shift with any font or size change. */}
          <ArabicLine
            text="فاكر اشتريت السهم"
            gap={-30}
            style={{ fontSize: '84px', fontWeight: 700, lineHeight: 1.15 }}
          />
          <ArabicLine
            text="ده ليه؟"
            gap={-30}
            style={{ fontSize: '84px', fontWeight: 700, lineHeight: 1.15 }}
          />
          <ArabicLine
            text="دفتر صفقات البورصة المصرية"
            gap={-14}
            style={{
              fontSize: '33px',
              fontWeight: 400,
              color: '#a8a8a8',
              marginTop: '14px',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'row-reverse',
            justifyContent: 'flex-start',
            gap: '40px',
            fontSize: '26px',
            color: '#a8a8a8',
          }}
        >
          {['حاسبة مخاطرة', 'تحليل أداء', 'مجاني بالكامل'].map((item) => (
            <ArabicLine key={item} text={item} gap={10} />
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Cairo', data: cairo700, weight: 700, style: 'normal' },
        { name: 'Cairo', data: cairo400, weight: 400, style: 'normal' },
      ],
    }
  );
}
