#!/usr/bin/env node
/**
 * Generates every colour definition in the product from design/palettes.json.
 *
 *   node tool/gen-theme.mjs           write the generated files
 *   node tool/gen-theme.mjs --check   verify they are up to date, write nothing
 *
 * Outputs:
 *   lib/core/theme/palettes/generated_palettes.dart   (Flutter)
 *   site/app/tokens.css                               (web)
 *
 * WHY THIS EXISTS
 * The app and the site each had their own hand-written copy of the same 37
 * colours. Two copies of one design decision drift the first time somebody
 * edits one and forgets the other, and the drift is invisible until a
 * screenshot looks wrong. One source, two emitted files, and `--check` in the
 * test suite so a stale copy fails loudly.
 *
 * The project deliberately avoids build_runner and Dart codegen. This is a
 * different animal: it runs on demand, its output is committed and readable,
 * and nothing in the Flutter build depends on it. Editing colours without
 * running it is caught by --check rather than producing a broken build.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK_ONLY = process.argv.includes('--check');

/** Exactly the fields on PaletteScheme, in declaration order. */
const TOKENS = [
  'brand', 'onBrand', 'brandContainer', 'onBrandContainer', 'accent', 'onAccent',
  'background', 'surface', 'surfaceLow', 'surfaceHigh', 'surfaceHighest',
  'onSurface', 'onSurfaceVariant', 'outline', 'outlineVariant',
  'inverseSurface', 'onInverseSurface',
  'error', 'onError', 'errorContainer', 'onErrorContainer',
  'win', 'loss', 'open', 'breakeven',
  'winSurface', 'lossSurface', 'openSurface', 'breakevenSurface',
  'winBorder', 'lossBorder', 'openBorder', 'breakevenBorder',
  'aiAccent', 'shadow', 'headerFrom', 'headerTo',
];

/**
 * Text/background pairs that must clear WCAG AA.
 *
 * `min` is 4.5 for anything rendered at normal size. The two entries at 3.0
 * are non-text: `outlineVariant` is a hairline border and `shadow` never
 * carries meaning, so the 3:1 non-text floor applies instead.
 */
const CONTRAST_RULES = [
  ['onSurface', 'surface', 4.5], ['onSurface', 'background', 4.5],
  ['onSurface', 'surfaceLow', 4.5], ['onSurface', 'surfaceHigh', 4.5],
  ['onSurfaceVariant', 'surface', 4.5], ['onSurfaceVariant', 'background', 4.5],
  ['onSurfaceVariant', 'surfaceLow', 4.5], ['onSurfaceVariant', 'surfaceHigh', 4.5],
  ['outline', 'surface', 4.5], ['outline', 'background', 4.5],
  ['onBrand', 'brand', 4.5],
  ['onBrandContainer', 'brandContainer', 4.5],
  // `accent` carries a double contract, so it is checked both ways: readable
  // ON a surface (it is what brand-coloured text resolves to, and what
  // Material's ColorScheme.primary maps to) AND able to host `onAccent`.
  // Material uses `primary` as a fill and as a foreground interchangeably, so
  // one of the brand tokens has to satisfy both — this is that token.
  ['onAccent', 'accent', 4.5],
  ['accent', 'surface', 4.5], ['accent', 'background', 4.5],
  ['onInverseSurface', 'inverseSurface', 4.5],
  ['onError', 'error', 4.5],
  ['onErrorContainer', 'errorContainer', 4.5],
  // The money colours, both on their own tinted chip and on a plain card.
  ['win', 'winSurface', 4.5], ['win', 'surface', 4.5],
  ['loss', 'lossSurface', 4.5], ['loss', 'surface', 4.5],
  ['breakeven', 'breakevenSurface', 4.5], ['breakeven', 'surface', 4.5],
  ['open', 'openSurface', 4.5], ['open', 'surface', 4.5],
  ['aiAccent', 'surface', 4.5],
  // `brand` is a FILL — a button background, a header. It is deliberately not
  // required to be legible as text, because a vivid light accent (acid lime at
  // 1.15:1 on white) cannot be. Brand-coloured TEXT uses `onBrandContainer`
  // instead, which Material's own model defines as the readable, darkened form
  // of the hue. That is the pair checked here.
  ['onBrandContainer', 'surface', 4.5], ['onBrandContainer', 'background', 4.5],
  ['outlineVariant', 'surface', 1.0],
];

/** CSS aliases the site's components already use, mapped to canonical tokens. */
const CSS_ALIASES = {
  bg: 'background',
  fg: 'onSurface',
  'fg-muted': 'onSurfaceVariant',
  'fg-subtle': 'outline',
  border: 'outlineVariant',
  'border-strong': 'outline',
  // Brand-coloured TEXT. Never `--brand`: that is a fill, and in a palette
  // built on a light accent it is invisible as type. Same token the Flutter
  // side maps to ColorScheme.primary, so the two surfaces agree on what
  // "the brand colour, used as ink" means.
  'brand-ink': 'accent',
};

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

/** "#RRGGBB" or "#AARRGGBB" -> { a, r, g, b }. ARGB order matches Dart's. */
function parseColor(hex, where) {
  const raw = String(hex).trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(raw) && !/^[0-9a-fA-F]{8}$/.test(raw)) {
    throw new Error(`${where}: "${hex}" is not #RRGGBB or #AARRGGBB`);
  }
  const v = raw.length === 6 ? `FF${raw}` : raw;
  return {
    a: parseInt(v.slice(0, 2), 16),
    r: parseInt(v.slice(2, 4), 16),
    g: parseInt(v.slice(4, 6), 16),
    b: parseInt(v.slice(6, 8), 16),
  };
}

const toDartHex = (c) =>
  '0x' + [c.a, c.r, c.g, c.b].map((n) => n.toString(16).padStart(2, '0').toUpperCase()).join('');

/** CSS wants #RRGGBBAA, and omits the alpha when the colour is opaque. */
function toCssHex(c) {
  const hex = (n) => n.toString(16).padStart(2, '0');
  const rgb = `#${hex(c.r)}${hex(c.g)}${hex(c.b)}`;
  return c.a === 255 ? rgb : `${rgb}${hex(c.a)}`;
}

function relativeLuminance({ r, g, b }) {
  const f = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(fg, bg) {
  const [hi, lo] = [relativeLuminance(fg), relativeLuminance(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

// ---------------------------------------------------------------------------
// Load, merge, validate
// ---------------------------------------------------------------------------

const source = JSON.parse(readFileSync(join(ROOT, 'design/palettes.json'), 'utf8'));
const problems = [];

/** Semantics are merged in last so a palette cannot accidentally shadow them. */
/**
 * Drops `//`- and `$`-prefixed keys. JSON has no comment syntax, and the
 * rationale for a colour is worth keeping next to the colour rather than in a
 * README nobody opens while editing.
 */
const stripComments = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(([k]) => !k.startsWith('//') && !k.startsWith('$'))
  );

function resolveScheme(paletteName, brightness) {
  const palette = stripComments(source.palettes[paletteName][brightness]);
  const semantics = stripComments(source.semantics[brightness]);

  const overlap = Object.keys(palette).filter((k) => k in semantics);
  if (overlap.length) {
    problems.push(
      `${paletteName}.${brightness}: redefines protected semantic token(s) ` +
        `${overlap.join(', ')}. Money colours are shared on purpose — move the ` +
        `change to "semantics" if it is really meant to apply everywhere.`
    );
  }

  const merged = { ...palette, ...semantics };

  const missing = TOKENS.filter((t) => !(t in merged));
  const extra = Object.keys(merged).filter((k) => !TOKENS.includes(k));
  if (missing.length) problems.push(`${paletteName}.${brightness}: missing ${missing.join(', ')}`);
  if (extra.length) problems.push(`${paletteName}.${brightness}: unknown token ${extra.join(', ')}`);

  const parsed = {};
  for (const token of TOKENS) {
    if (token in merged) parsed[token] = parseColor(merged[token], `${paletteName}.${brightness}.${token}`);
  }
  return parsed;
}

const resolved = {};
for (const name of Object.keys(source.palettes)) {
  resolved[name] = {
    light: resolveScheme(name, 'light'),
    dark: resolveScheme(name, 'dark'),
  };
}

if (!source.palettes[source.active]) {
  problems.push(`"active" is "${source.active}", which is not a defined palette.`);
}

// Contrast gate. This is the part that makes recolouring safe: a palette that
// fails AA never reaches either output.
for (const [name, brightnesses] of Object.entries(resolved)) {
  for (const [brightness, scheme] of Object.entries(brightnesses)) {
    for (const [fgToken, bgToken, min] of CONTRAST_RULES) {
      const fg = scheme[fgToken];
      const bg = scheme[bgToken];
      if (!fg || !bg) continue;
      const ratio = contrast(fg, bg);
      if (ratio < min) {
        problems.push(
          `${name}.${brightness}: ${fgToken} on ${bgToken} is ${ratio.toFixed(2)}:1, ` +
            `needs ${min}:1`
        );
      }
    }
  }
}

if (problems.length) {
  console.error('\n\x1b[31m✖ design/palettes.json is not shippable:\x1b[0m\n');
  for (const p of problems) console.error(`  • ${p}`);
  console.error('');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Emit
// ---------------------------------------------------------------------------

const BANNER = (tool) =>
  `// GENERATED FILE — DO NOT EDIT.\n` +
  `//\n` +
  `// Source:    design/palettes.json\n` +
  `// Generator: ${tool}\n` +
  `// Regenerate: npm --prefix site run theme\n` +
  `//\n` +
  `// Hand edits here are erased on the next run, and \`npm --prefix site run\n` +
  `// theme:check\` fails the moment this file stops matching the source.\n`;

function dartFile() {
  const schemeLiteral = (scheme, indent) => {
    const pad = ' '.repeat(indent);
    const lines = TOKENS.map((t) => `${pad}  ${t}: Color(${toDartHex(scheme[t])}),`);
    return `PaletteScheme(\n${lines.join('\n')}\n${pad})`;
  };

  const palettes = Object.entries(resolved)
    .map(([name, b]) => {
      const description = source.palettes[name].description ?? '';
      return (
        `/// ${description}\n` +
        `const Palette ${name}Palette = Palette(\n` +
        `  name: '${name}',\n` +
        `  light: ${schemeLiteral(b.light, 2)},\n` +
        `  dark: ${schemeLiteral(b.dark, 2)},\n` +
        `);`
      );
    })
    .join('\n\n');

  return (
    `${BANNER('tool/gen-theme.mjs')}\n` +
    `import 'package:flutter/material.dart';\n\n` +
    `import '../palette_scheme.dart';\n\n` +
    `${palettes}\n\n` +
    `/// The palette the product ships with, chosen by "active" in the source.\n` +
    `const Palette activePaletteData = ${source.active}Palette;\n`
  );
}

function cssFile() {
  const active = resolved[source.active];

  const block = (scheme, indent) => {
    const pad = ' '.repeat(indent);
    const lines = TOKENS.map((t) => `${pad}--${kebab(t)}: ${toCssHex(scheme[t])};`);
    const aliases = Object.entries(CSS_ALIASES).map(
      ([alias, token]) => `${pad}--${alias}: ${toCssHex(scheme[token])};`
    );
    return [...lines, '', `${pad}/* Short aliases the components read. */`, ...aliases].join('\n');
  };

  return (
    `/* GENERATED FILE — DO NOT EDIT.\n` +
    ` *\n` +
    ` * Source:     design/palettes.json  (active palette: "${source.active}")\n` +
    ` * Generator:  tool/gen-theme.mjs\n` +
    ` * Regenerate: npm run theme\n` +
    ` *\n` +
    ` * Every value here is also emitted into the Flutter app, from the same\n` +
    ` * source, in the same run. The two cannot drift.\n` +
    ` */\n\n` +
    `:root {\n  color-scheme: light;\n\n${block(active.light, 2)}\n}\n\n` +
    `/* System preference, but only while the visitor has not chosen explicitly. */\n` +
    `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme='light']) {\n` +
    `    color-scheme: dark;\n\n${block(active.dark, 4)}\n  }\n}\n\n` +
    `/* An explicit choice always wins, in both directions. */\n` +
    `:root[data-theme='dark'] {\n  color-scheme: dark;\n\n${block(active.dark, 2)}\n}\n`
  );
}

const outputs = [
  ['lib/core/theme/palettes/generated_palettes.dart', dartFile()],
  ['site/app/tokens.css', cssFile()],
];

let stale = false;
for (const [relPath, content] of outputs) {
  const abs = join(ROOT, relPath);
  let existing = null;
  try {
    existing = readFileSync(abs, 'utf8');
  } catch {
    /* first run */
  }

  // Compare with line endings normalised: git may check these out as CRLF on
  // Windows, and a whole-file diff on that alone would be a false alarm.
  const same = existing !== null && existing.replace(/\r\n/g, '\n') === content;

  if (CHECK_ONLY) {
    if (!same) {
      stale = true;
      console.error(`\x1b[31m✖ stale:\x1b[0m ${relPath}`);
    }
  } else if (same) {
    console.log(`  unchanged  ${relPath}`);
  } else {
    writeFileSync(abs, content, 'utf8');
    console.log(`\x1b[32m  written    \x1b[0m${relPath}`);
  }
}

if (CHECK_ONLY) {
  if (stale) {
    console.error('\nRun `npm --prefix site run theme` and commit the result.\n');
    process.exit(1);
  }
  console.log('\x1b[32m✔\x1b[0m generated theme files match design/palettes.json');
} else {
  const count = Object.keys(resolved).length;
  console.log(
    `\n\x1b[32m✔\x1b[0m ${count} palettes validated, ` +
      `active = "${source.active}". ${CONTRAST_RULES.length} contrast rules passed per palette.`
  );
}
