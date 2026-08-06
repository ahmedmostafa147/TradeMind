#!/usr/bin/env node
/**
 * Generates the PWA icon set from assets/logo.png.
 *
 *   node tool/gen-pwa-icons.mjs           write the icons
 *   node tool/gen-pwa-icons.mjs --check   verify they are current, write nothing
 *
 * Outputs, all into site/public/icons/ so the manifest can point at stable,
 * un-hashed URLs:
 *
 *   icon-192.png            the small `any` icon
 *   icon-512.png            the large `any` icon, also what install prompts show
 *   icon-maskable-512.png   `any` is NOT enough on Android — see below
 *
 * and it flattens site/app/apple-icon.png, for the reason under APPLE below.
 *
 * WHY MASKABLE IS A SEPARATE FILE
 * The source mark is a rounded square with TRANSPARENT corners. Android applies
 * its own mask to an icon declared `maskable` — a circle, a squircle, a rounded
 * square, whatever the launcher uses — and it masks the full bleed of the image.
 * Feed it the source as-is and the transparent corners become transparent
 * wedges around a shape that is already rounded: a visibly wrong, double-rounded
 * icon on the home screen. So the maskable variant is drawn full-bleed on solid
 * background with the mark inset inside the safe zone, and the plain `any`
 * icons keep the transparency for the platforms that do not mask.
 *
 * The safe zone is the centre circle of 80% diameter; anything outside it can be
 * cropped. The mark is placed at MASKABLE_INSET of the canvas, which keeps its
 * corners inside that circle with room to spare.
 *
 * APPLE
 * iOS ignores the manifest's icons entirely and uses `apple-touch-icon`. It also
 * composites it onto BLACK rather than honouring alpha, so a transparent-cornered
 * source gets black wedges. Flattening it onto the mark's own background makes
 * the seam invisible instead.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from '../site/node_modules/sharp/lib/index.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK_ONLY = process.argv.includes('--check');

const SOURCE = join(ROOT, 'assets/logo.png');
const OUT_DIR = join(ROOT, 'site/public/icons');
const APPLE_ICON = join(ROOT, 'site/app/apple-icon.png');
const APP_ICON = join(ROOT, 'site/app/icon.png');
const LOGO_96 = join(ROOT, 'site/public/logo-96.png');

/**
 * The mark's own background, sampled from the source rather than typed in, so
 * the flattened edges cannot drift from the artwork.
 */
async function backgroundOf(source) {
  const { width, height } = await sharp(source).metadata();

  // TOP-CENTRE, and the position matters. The first version of this sampled
  // near a corner and picked up the transparent bleed instead of the mark's
  // fill — which produced a maskable icon with the source's rounded square
  // clearly visible as a lighter panel floating on a darker field. Dead centre
  // horizontally is inside the rounded square on every corner radius, and a few
  // percent down from the top is above the glyph.
  const { data } = await sharp(source)
    .extract({
      left: Math.round(width / 2),
      top: Math.round(height * 0.06),
      width: 1,
      height: 1,
    })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { r: data[0], g: data[1], b: data[2], alpha: 1 };
}

const MASKABLE_SIZE = 512;
/** 62.5% of the canvas. The corners of a square this size sit inside the 80%
 *  safe-zone circle once the mark's own internal padding is accounted for. */
const MASKABLE_INSET = 320;

/**
 * The lemon glyph alone, on a transparent canvas.
 *
 * THE SOURCE HAS NO ALPHA CHANNEL. Its "rounded square" is painted onto solid
 * black corners, and its own fill is rgb(12,13,17) — close to black but not
 * equal to it. Inset that image onto any flat background and one of the two
 * shows as a seam: match the fill and the black corners appear as wedges, match
 * the corners and the rounded panel appears as a lighter square. Both were
 * tried and both are visible.
 *
 * So the glyph is lifted out by luminance instead. Background and corners sit
 * near 13; the lemon sits near 230. The ramp between them becomes the alpha
 * channel, which keeps the artwork's anti-aliased edges instead of producing a
 * hard-cut stencil.
 */
async function glyphOf(source, size) {
  const { data, info } = await sharp(source)
    .resize(size, size)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgba = Buffer.alloc(size * size * 4);
  for (let i = 0, o = 0; i < data.length; i += info.channels, o += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    // Fully transparent at or below the dark field, fully opaque well before
    // the lemon's own luminance, so the glyph keeps its density.
    const alpha = Math.max(0, Math.min(1, (luminance - 25) / (110 - 25)));
    rgba[o] = r;
    rgba[o + 1] = g;
    rgba[o + 2] = b;
    rgba[o + 3] = Math.round(alpha * 255);
  }

  return sharp(rgba, { raw: { width: size, height: size, channels: 4 } })
    .png()
    .toBuffer();
}

async function build() {
  const background = await backgroundOf(SOURCE);
  const mark = await glyphOf(SOURCE, MASKABLE_INSET);

  return {
    'logo-96.png': await sharp(SOURCE).resize(96, 96).png().toBuffer(),
    'icon.png': await sharp(SOURCE).resize(512, 512).png().toBuffer(),
    'icon-192.png': await sharp(SOURCE).resize(192, 192).png().toBuffer(),
    'icon-512.png': await sharp(SOURCE).resize(512, 512).png().toBuffer(),
    'icon-maskable-512.png': await sharp({
      create: {
        width: MASKABLE_SIZE,
        height: MASKABLE_SIZE,
        channels: 4,
        background,
      },
    })
      .composite([{ input: mark, gravity: 'centre' }])
      .png()
      .toBuffer(),
    // Flattened, not resized-with-alpha — see APPLE above.
    'apple-icon.png': await sharp(SOURCE)
      .resize(180, 180)
      .flatten({ background })
      .png()
      .toBuffer(),
  };
}

const files = await build();

/** Metadata and asset files in app/ and public/. */
function pathOf(name) {
  if (name === 'apple-icon.png') return APPLE_ICON;
  if (name === 'icon.png') return APP_ICON;
  if (name === 'logo-96.png') return LOGO_96;
  return join(OUT_DIR, name);
}

if (CHECK_ONLY) {
  const stale = [];
  for (const [name, bytes] of Object.entries(files)) {
    const path = pathOf(name);
    if (!existsSync(path) || !readFileSync(path).equals(bytes)) stale.push(name);
  }
  if (stale.length > 0) {
    console.error('\n\x1b[31m✖ PWA icons are stale:\x1b[0m');
    for (const name of stale) console.error(`  • ${name}`);
    console.error('\nRun `node tool/gen-pwa-icons.mjs` and commit the result.\n');
    process.exit(1);
  }
  console.log('\x1b[32m✔\x1b[0m PWA icons match assets/logo.png');
} else {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const [name, bytes] of Object.entries(files)) {
    writeFileSync(pathOf(name), bytes);
    console.log(`wrote ${name}`);
  }
}
