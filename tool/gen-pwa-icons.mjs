#!/usr/bin/env node
/**
 * Generates EVERY image derived from assets/logo.png — web and Android both.
 *
 *   node tool/gen-pwa-icons.mjs           write them
 *   node tool/gen-pwa-icons.mjs --check   verify they are current, write nothing
 *
 * WHY EVERYTHING AND NOT JUST THE PWA ICONS
 * It used to emit only the three manifest icons and apple-icon.png. The site's
 * header logo and the favicon were hand-exported once and never again, so when
 * the artwork was redrawn they silently kept the OLD mark — the header on every
 * page served a logo the app no longer used, and nothing anywhere reported it.
 * A derived image that is not derived by this script is an image that will go
 * stale. So all of them are here, and `--check` covers all of them.
 *
 * Outputs into site/public/icons/, so the manifest points at stable, un-hashed
 * URLs:
 *
 *   icon-192.png            the small `any` icon
 *   icon-512.png            the large `any` icon, also what install prompts show
 *   icon-maskable-512.png   `any` is NOT enough on Android — see below
 *
 * and elsewhere:
 *
 *   site/public/logo-96.png            the site header mark
 *   site/app/icon.png                  the favicon (a Next metadata file)
 *   site/app/apple-icon.png            flattened, for the reason under APPLE
 *   android/.../drawable-*dpi/splash_logo.png   the launch screen mark
 *
 * THE ANDROID SPLASH IS HERE ON PURPOSE. It used to be a hand-drawn vector of a
 * radar scope, written before this artwork existed and never reconciled with
 * it, so the launch screen showed one mark and the launcher icon another. It is
 * the glyph lifted onto transparency now — the same glyph the maskable icon
 * uses — which means the splash cannot drift from the icon again.
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
const ANDROID_RES = join(ROOT, 'android/app/src/main/res');

/**
 * Where each output lands. Anything not listed here goes to OUT_DIR.
 *
 * apple-icon.png and icon.png are Next metadata files and must sit in app/;
 * logo-96.png is referenced by <Image src="/logo-96.png"> so it must be at the
 * public root, not under icons/.
 */
const PATHS = {
  'apple-icon.png': join(ROOT, 'site/app/apple-icon.png'),
  'icon.png': join(ROOT, 'site/app/icon.png'),
  'logo-96.png': join(ROOT, 'site/public/logo-96.png'),
};

/**
 * The launch mark, one PNG per density.
 *
 * drawable/launch_background.xml draws it at 160dp, so each file is 160dp at
 * that bucket's scale factor. Android 12+ asks for a 240dp canvas and masks the
 * inner 160dp circle, but it accepts and scales this same asset — one mark for
 * both paths is the point, since the two splash implementations drifting apart
 * is the failure that produced the hand-drawn vector this replaces.
 */
const SPLASH_DENSITIES = {
  mdpi: 160,
  hdpi: 240,
  xhdpi: 320,
  xxhdpi: 480,
  xxxhdpi: 640,
};

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

    // The favicon. Kept at 96 rather than 32: browsers downscale for the tab
    // but reuse this for bookmarks, history and the Windows taskbar, where 32
    // is visibly soft. Alpha is preserved — unlike Apple, every browser that
    // reads this honours it, and a tab strip is not always dark.
    'icon.png': await sharp(SOURCE).resize(96, 96).png().toBuffer(),

    // The site header mark, rendered at 2x its 28px display size for retina.
    'logo-96.png': await sharp(SOURCE).resize(96, 96).png().toBuffer(),

    ...Object.fromEntries(
      await Promise.all(
        Object.entries(SPLASH_DENSITIES).map(async ([bucket, px]) => [
          `splash-${bucket}.png`,
          // The glyph alone. The splash paints its own background, so shipping
          // the mark's rounded square on top of it would show as a faintly
          // different dark panel — the exact seam glyphOf exists to avoid.
          await glyphOf(SOURCE, px),
        ])
      )
    ),
  };
}

const files = await build();

/** Splash frames are Android resources; the rest are web assets. */
function pathOf(name) {
  const splash = name.match(/^splash-(\w+)\.png$/);
  if (splash) {
    return join(ANDROID_RES, `drawable-${splash[1]}`, 'splash_logo.png');
  }
  return PATHS[name] ?? join(OUT_DIR, name);
}

if (CHECK_ONLY) {
  const stale = [];
  for (const [name, bytes] of Object.entries(files)) {
    const path = pathOf(name);
    if (!existsSync(path) || !readFileSync(path).equals(bytes)) stale.push(name);
  }
  if (stale.length > 0) {
    console.error('\n\x1b[31m✖ generated images are stale:\x1b[0m');
    for (const name of stale) console.error(`  • ${name} → ${pathOf(name)}`);
    console.error('\nRun `node tool/gen-pwa-icons.mjs` and commit the result.\n');
    process.exit(1);
  }
  console.log('\x1b[32m✔\x1b[0m every generated image matches assets/logo.png');
} else {
  for (const [name, bytes] of Object.entries(files)) {
    const path = pathOf(name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, bytes);
    console.log(`wrote ${path.slice(ROOT.length + 1)}`);
  }
}
