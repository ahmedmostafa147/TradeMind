#!/usr/bin/env node
/**
 * Compiles the app's calculation layer to JavaScript so the site can run it
 * instead of keeping a second hand-written copy.
 *
 *   node tool/gen-calc-js.mjs           compile and write the bundle
 *   node tool/gen-calc-js.mjs --check   verify it is up to date, write nothing
 *
 * Output:
 *   site/lib/generated/radar-calc.js
 *
 * WHY THIS EXISTS
 * Every formula in this product was written twice — once in lib/core/calc/ and
 * once in site/lib/ — and only the Dart half has tests. The rule that kept them
 * together was "change both in the same commit", written in CLAUDE.md and
 * enforced by nobody. That rule survives one person who wrote both halves. It
 * does not survive a second.
 *
 * lib/core/calc/ is already forbidden from importing Flutter, which is the hard
 * part of making a layer portable, and Dart compiles to JavaScript. So the
 * shared core other projects pay for with a C++ or Rust rewrite is available
 * here for the price of this file.
 *
 * ── WHY --check HASHES SOURCES INSTEAD OF RE-COMPILING ─────────────────────
 *
 * gen-theme.mjs regenerates its output and diffs it, because everything it
 * needs is a JSON file and Node. This cannot do that: it needs the Dart SDK,
 * and the Vercel build host does not have one — the whole reason the bundle is
 * committed rather than built on deploy.
 *
 * So the generated file carries the SHA-256 of every source that feeds it, and
 * --check recomputes that hash from the working tree. Editing a formula in Dart
 * without regenerating changes the hash and fails the build, with no Dart
 * installed anywhere near it. What it deliberately cannot catch is a bundle
 * hand-edited to disagree with a hash that still matches — hence DO NOT EDIT,
 * and hence tool/calc_js/verify.* proving the bundle's arithmetic separately.
 *
 * ── WHY THE SOURCE LIST IS A GLOB AND NOT A LIST ───────────────────────────
 *
 * lib/core/calc/ is globbed rather than enumerated, so a formula added in a new
 * file is covered the day it lands. An explicit list would silently exclude it
 * — the failure mode this file exists to prevent, reintroduced by the file
 * itself.
 */

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK_ONLY = process.argv.includes('--check');

const ENTRY = 'tool/calc_js/radar_calc.dart';
const OUT = 'site/lib/generated/radar-calc.js';

/** Everything whose contents can change the bundle. Paths are repo-relative. */
function sourceFiles() {
  const calcDir = join(ROOT, 'lib/core/calc');
  const calc = readdirSync(calcDir)
    .filter((f) => f.endsWith('.dart'))
    .map((f) => 'lib/core/calc/' + f);

  return [
    'tool/calc_js/calc_api.dart',
    ENTRY,
    ...calc,
    'lib/billing/entitlements.dart',
    'lib/trades/trade.dart',
    'lib/trades/trade_status.dart',
    'lib/trades/timeline_entry.dart',
    'lib/trades/checklist.dart',
  ].sort();
}

/**
 * One hash over every source, path included.
 *
 * The path goes into the digest as well as the bytes: renaming a file changes
 * what the bundle imports, so it has to change the hash too. Line endings are
 * normalised because git hands these out as CRLF on Windows and LF elsewhere,
 * and a hash that depends on the checkout would fail --check on one machine and
 * pass on another.
 */
function hashSources() {
  const hash = createHash('sha256');
  for (const rel of sourceFiles()) {
    const path = join(ROOT, rel);
    if (!existsSync(path)) {
      console.error(`✖ source is missing: ${rel}`);
      process.exit(1);
    }
    hash.update(rel);
    hash.update('\0');
    hash.update(readFileSync(path, 'utf8').replace(/\r\n/g, '\n'));
    hash.update('\0');
  }
  return hash.digest('hex');
}

const HASH_MARKER = '// SOURCES_SHA256: ';

function header(hash) {
  return (
    `// GENERATED FILE — DO NOT EDIT.\n` +
    `//\n` +
    `// Produced by tool/gen-calc-js.mjs from the Dart calculation layer:\n` +
    `//   lib/core/calc/  ·  lib/billing/entitlements.dart  ·  lib/trades/\n` +
    `//\n` +
    `// This is the SAME arithmetic the Android app runs, compiled to\n` +
    `// JavaScript — not a port of it. Editing this file by hand puts the two\n` +
    `// surfaces back out of step, which is the exact problem it removes.\n` +
    `//\n` +
    `// Regenerate:  npm --prefix site run calc     (needs the Dart SDK)\n` +
    `// Verify:      node tool/gen-calc-js.mjs --check\n` +
    `//\n` +
    `${HASH_MARKER}${hash}\n` +
    `/* eslint-disable */\n` +
    `// @ts-nocheck\n`
  );
}

/**
 * The dart2js output is a self-executing script that assigns
 * globalThis.radarCalc. Appending one export turns it into an ES module the
 * bundler can follow, and re-exporting the global is enough because the
 * assignment has already happened by the time the module body finishes.
 */
const FOOTER =
  `\n` +
  `// The bundle above ran its main() during module evaluation and put the API\n` +
  `// on globalThis. Re-exported here so importers get a value rather than\n` +
  `// reaching for a global — and so the bundler keeps the file.\n` +
  `export const radarCalc = globalThis.radarCalc;\n`;

function compile() {
  const dir = mkdtempSync(join(tmpdir(), 'radar-calc-'));
  const out = join(dir, 'calc.js');
  try {
    execFileSync(
      'dart',
      [
        'compile',
        'js',
        '-O4',
        // No source map: it would be a second generated artefact to commit,
        // and nobody debugs into this — the Dart is the thing you read.
        '--no-source-maps',
        '-o',
        out,
        ENTRY,
      ],
      {
        cwd: ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
        // On Windows the SDK ships `dart.bat`, and execFile does not resolve
        // PATHEXT — it looks for a file literally called `dart` and reports
        // ENOENT, which reads as "no Dart installed" on a machine that has it.
        shell: process.platform === 'win32',
      }
    );
    return readFileSync(out, 'utf8');
  } catch (error) {
    console.error('✖ dart compile js failed.\n');
    console.error(String(error.stderr ?? error.message));
    console.error(
      '\n  The Dart SDK has to be on PATH to REGENERATE the bundle. It is not\n' +
        '  needed to build the site — that is why the output is committed.\n'
    );
    process.exit(1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ── run ────────────────────────────────────────────────────────────────────

const hash = hashSources();
const outPath = join(ROOT, OUT);

if (CHECK_ONLY) {
  if (!existsSync(outPath)) {
    console.error(`✖ ${OUT} is missing. Run: npm --prefix site run calc`);
    process.exit(1);
  }

  const existing = readFileSync(outPath, 'utf8');
  const line = existing
    .split('\n')
    .find((l) => l.startsWith(HASH_MARKER));

  if (!line) {
    console.error(`✖ ${OUT} carries no source hash. Regenerate it.`);
    process.exit(1);
  }

  const recorded = line.slice(HASH_MARKER.length).trim();
  if (recorded !== hash) {
    console.error(
      `✖ ${OUT} is stale.\n\n` +
        `  The Dart calculation layer changed since it was generated, so the\n` +
        `  site would be running the OLD formulas while the app runs the new\n` +
        `  ones — which is the drift this file exists to make impossible.\n\n` +
        `  recorded ${recorded}\n` +
        `  sources  ${hash}\n\n` +
        `  Fix:  npm --prefix site run calc     (then commit the result)\n`
    );
    process.exit(1);
  }

  console.log(`[32m✔[0m ${OUT} matches the Dart sources`);
  process.exit(0);
}

const bundle = compile();
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, header(hash) + bundle + FOOTER, 'utf8');

const kb = (n) => (n / 1024).toFixed(1) + ' KB';
console.log(
  `[32m✔[0m wrote ${OUT}  (${kb(bundle.length)} raw, from ` +
    `${sourceFiles().length} Dart sources)`
);
