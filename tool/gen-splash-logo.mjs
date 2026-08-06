import { createRequire } from 'node:module';

/**
 * The Android launch mark, generated from the one brand asset.
 *
 * WHY THIS EXISTS. The splash used to be a hand-drawn vector radar scope while
 * the launcher icon was the real lime R — two different logos, one shown a
 * second before the other. The comment justifying that claimed assets/logo.png
 * still said "TradeMind" and had no alpha; by the time anyone looked, the file
 * was the correct mark and the claim was simply stale.
 *
 * Generating it removes the chance of that drifting again: change the logo and
 * re-run this, exactly like `npm --prefix site run icons` does for the PWA.
 *
 *   node tool/gen-splash-logo.mjs
 *
 * sharp is reached through site/node_modules deliberately — the same path the
 * PWA icon generator uses, so this repo keeps one copy of it.
 */
const require = createRequire(import.meta.url);
const sharp = require('../site/node_modules/sharp');
import { mkdir, writeFile } from 'node:fs/promises';

// Keep the lime mark, drop the dark plate it sits on, so the splash logo can
// live on the charcoal splash field without a visible square around it.
const root = new URL('..', import.meta.url).pathname;
const src = sharp(`${root}assets/logo.png`);
const { data, info } = await src.raw().toBuffer({ resolveWithObject: true });
const out = Buffer.alloc(info.width * info.height * 4);

let kept = 0;
for (let i = 0, o = 0; i < data.length; i += info.channels, o += 4) {
  const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
  // The mark is lime (#D9FF30-ish): green dominant and bright. Everything else
  // — the plate, its rounded corners, the transparent-looking black — goes.
  const isMark = g > 90 && g > b + 40 && r > 60;
  out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = isMark ? 255 : 0;
  if (isMark) kept++;
}
console.log('mark pixels kept:', kept, `(${((kept / (info.width * info.height)) * 100).toFixed(1)}%)`);

const base = sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
  .trim();

// mdpi..xxxhdpi at the 160dp box the layer-list asks for.
const densities = { mdpi: 160, hdpi: 240, xhdpi: 320, xxhdpi: 480, xxxhdpi: 640 };
for (const [name, size] of Object.entries(densities)) {
  const dir = `${root}android/app/src/main/res/drawable-${name}`;
  await mkdir(dir, { recursive: true });
  // Android 12 draws the icon on a 240dp canvas and MASKS it to the inner
  // 160dp circle, so a mark that fills its canvas loses its corners. Scaling
  // the artwork to 62% and centring it keeps the whole thing inside the safe
  // circle — the same constraint the vector this replaces was drawn against.
  const inner = Math.round(size * 0.62);
  const art = await base
    .clone()
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const png = await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: art, gravity: 'center' }])
    .png()
    .toBuffer();
  await writeFile(`${dir}/splash_logo.png`, png);
  console.log(name, size, png.length, 'bytes');
}
