// Downloads the EGX company logos into site/public/logos/, once, so the
// product SERVES them instead of relaying them.
//
// ── WHY THIS EXISTS AT ALL ─────────────────────────────────────────────────
//
// The first version of this feature proxied `/api/logo` straight through to
// TradingView's CDN on every request. That solved the privacy question — the
// reader's browser never talked to a third party — but it left two others:
// their CDN is not a distribution channel we are entitled to lean on, and it
// can stop answering at any time, taking every logo in the product with it.
//
// A file we hold is a file we control. It also costs nothing at runtime: the
// logos become static assets on our own origin, which is the cheapest thing a
// web server does.
//
// ── AND WHY IT IS A SCRIPT, NOT A BUILD STEP ───────────────────────────────
//
// Same reasoning as `npm run icons` (see site/package.json): the board changes
// a few times a year, Vercel's build machine should not depend on an
// undocumented endpoint answering, and a network failure must never be able to
// fail a deploy. Run it by hand when the board gains listings; the monogram
// fallback covers anything missing in the meantime.
//
//   node tool/fetch-logos.mjs           # refresh
//   node tool/fetch-logos.mjs --check   # report drift, write nothing
//
// Usage note: it OVERWRITES what it downloads and never deletes. A slug that
// leaves the board keeps its file, which is right — an old trade in someone's
// journal still names that company.

import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'site', 'public', 'logos');

const SCANNER = 'https://scanner.tradingview.com/egypt/scan';
const CDN = 'https://s3-symbol-logo.tradingview.com';

/** Mirrors LOGO_ID in site/lib/tradingview.ts. Measured against the board. */
const LOGO_ID = /^[a-z0-9][a-z0-9-]{0,79}$/;

/**
 * An SVG is a DOCUMENT, and these come from someone else's server. Everything
 * below is a way for one to execute or to phone home, and a logo needs none of
 * them: the files observed are paths, gradients and a background rect.
 *
 * A file that trips this is not written at all. Refusing beats sanitising —
 * a rewritten file is one nobody has read, which is how a subtle allowance
 * survives review.
 */
const FORBIDDEN = [
  /<script/i,
  /<foreignObject/i,
  /\son\w+\s*=/i, // onload=, onclick=, …
  /javascript:/i,
  /<!ENTITY/i,
  /xlink:href\s*=\s*["']\s*(?!#)/i, // any external reference; #fragments are fine
  /\bhref\s*=\s*["']\s*(?!#)/i,
];

const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');

async function board() {
  const response = await fetch(SCANNER, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://www.tradingview.com',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    },
    body: JSON.stringify({
      filter: [{ left: 'market', operation: 'equal', right: 'egypt' }],
      markets: ['egypt'],
      options: { lang: 'ar' },
      columns: ['name', 'logoid'],
      sort: { sortBy: 'volume', sortOrder: 'desc' },
      range: [0, 300],
    }),
  });

  if (!response.ok) throw new Error(`scanner answered ${response.status}`);

  const body = await response.json();
  const ids = new Set();
  for (const row of body.data ?? []) {
    const id = row?.d?.[1];
    if (typeof id === 'string' && LOGO_ID.test(id)) ids.add(id);
  }
  return [...ids].sort();
}

const ids = await board();
await mkdir(OUT, { recursive: true });
const have = new Set(
  (await readdir(OUT).catch(() => [])).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4))
);

const missing = ids.filter((id) => !have.has(id));

if (checkOnly) {
  console.log(`board: ${ids.length} logos · on disk: ${have.size} · missing: ${missing.length}`);
  if (missing.length) console.log(`  ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? ' …' : ''}`);
  // NOT an error: a missing logo renders the monogram, which is a supported
  // state. This is a report, so it can run anywhere without failing a build.
  process.exit(0);
}

let written = 0;
let refused = 0;
let failed = 0;

// Ten at a time: polite to the CDN, and fast enough that the whole board takes
// seconds. Measured: 28 parallel requests answered 200, so this is not a limit
// being worked around, just restraint.
const queue = [...ids];
await Promise.all(
  Array.from({ length: 10 }, async () => {
    for (let id = queue.pop(); id !== undefined; id = queue.pop()) {
      try {
        const response = await fetch(`${CDN}/${id}.svg`);
        if (!response.ok) {
          // 403 is how a missing key looks from behind this CDN, not an error.
          if (response.status !== 403 && response.status !== 404) failed++;
          continue;
        }
        const svg = await response.text();
        const tripped = FORBIDDEN.find((p) => p.test(svg));
        if (tripped) {
          console.warn(`refused ${id}.svg — matched ${tripped}`);
          refused++;
          continue;
        }
        await writeFile(join(OUT, `${id}.svg`), svg, 'utf8');
        written++;
      } catch {
        failed++;
      }
    }
  })
);

console.log(
  `wrote ${written} of ${ids.length} logos to site/public/logos` +
    (refused ? ` · refused ${refused}` : '') +
    (failed ? ` · failed ${failed}` : '')
);
