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
  gaps,
}: {
  text: string;
  style?: React.CSSProperties;
  /** One correction for every join in the line. */
  gap?: number;
  /**
   * Per-join corrections, index i sitting between word i and word i+1.
   *
   * A single `gap` cannot straighten a line, and the reason is measurable:
   * satori sizes each word box by the font's ADVANCE, which for a word ending
   * in a swooping letter (ر, ه) runs far past the last inked pixel. Under IBM
   * Plex Sans Arabic at 84px, one uniform -30 produced an 85px hole after
   * «فاكر» and a 24px one after «اشتريت» in the same line — a 61px spread from
   * an identical margin.
   *
   * So the correction belongs to the JOIN, not to the line. Values were set by
   * measuring ink-to-ink distances in the generated PNG and solving for an even
   * optical gap; re-measure after changing any word, size or font here.
   */
  gaps?: number[];
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
            marginLeft:
              index === text.split(' ').length - 1
                ? 0
                : `${gaps?.[index] ?? gap}px`,
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
  const [plex700, plex400] = await Promise.all([
    readFile(join(process.cwd(), 'assets/fonts/IBMPlexSansArabic-700.ttf')),
    readFile(join(process.cwd(), 'assets/fonts/IBMPlexSansArabic-400.ttf')),
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
          fontFamily: 'IBMPlexSansArabic',
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
          {/* The two halves stack, one per line — the parallel IS the message,
              and splitting it anywhere else would break the rhythm the sentence
              is built on. Gaps re-measured for these words: every value below
              belongs to the specific pair of letters that meet at that join. */}
          <ArabicLine
            text="السوق ماشي فين"
            gaps={[-40, -60]}
            style={{ fontSize: '84px', fontWeight: 700, lineHeight: 1.15 }}
          />
          <ArabicLine
            text="ودفترك ماشي فين"
            gaps={[-40, -60]}
            style={{ fontSize: '84px', fontWeight: 700, lineHeight: 1.15 }}
          />
          <ArabicLine
            text="البورصة المصرية"
            gaps={[-33]}
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
          {/* Same measured-not-guessed treatment as the headline. «مجاني»
              ends in ي, whose advance overshoots its ink far more than ة or ء,
              so a shared gap put 45px inside that pair against 12px inside the
              other two. `lead` then evens the space BETWEEN the three claims,
              which the container's own 40px gap could not do for the same
              reason. */}
          {[
            { text: 'تداولات المستثمرين', gaps: [-22], lead: -15 },
            { text: 'دفتر صفقات', gaps: [-24], lead: 0 },
            { text: 'مجاني بالكامل', gaps: [-23], lead: 0 },
          ].map(({ text, gaps, lead }) => (
            <ArabicLine
              key={text}
              text={text}
              gaps={gaps}
              style={{ marginLeft: `${lead}px` }}
            />
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'IBMPlexSansArabic', data: plex700, weight: 700, style: 'normal' },
        { name: 'IBMPlexSansArabic', data: plex400, weight: 400, style: 'normal' },
      ],
    }
  );
}
