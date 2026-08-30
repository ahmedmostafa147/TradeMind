/**
 * Single source of truth for everything the site says about itself.
 *
 * Copy that appears in more than one place lives here, not duplicated across
 * components — the app name and the contact address in particular also appear
 * in the privacy policy, and two drifting copies of a legal contact is a real
 * problem rather than a cosmetic one.
 */

export const site = {
  /**
   * The wordmark — the logo, the browser title, the Play listing. Latin, and
   * the same string Android's `android:label` carries.
   */
  name: 'Radar',

  /**
   * The same name inside Arabic prose. Two fields rather than one because
   * «Radar بيخلّي لكل صفقة سبب» sets a Latin word mid-sentence in an RTL
   * paragraph, which breaks the line's rhythm and reads as a typo. The
   * wordmark stays Latin where it acts as a mark; sentences use this.
   */
  nameAr: 'رادار',

  /**
   * THE POSITIONING, IN THE OWNER'S OWN WORDS.
   *
   * It was «دفتر صفقات البورصة المصرية» — which described half the product and
   * the half that is not the reason to choose it. Any journal records what you
   * did; what Radar adds is what the MARKET did on the same day, split by who
   * was actually moving the money. The two halves are deliberately parallel:
   * one sentence, one shape, two subjects.
   *
   * Everything downstream reads this — the browser title, the manifest, the
   * Open Graph card and the footer — so the wording is changed here and nowhere
   * else. The OG image is the one consumer that needs a second look after any
   * edit: its Arabic word spacing is hand-measured per word pair.
   */
  tagline: 'اقرأ حركة السيولة، واحسب مخاطرتك قبل كل صفقة.',

  description:
    'شوف مين بيشتري ومين بيبيع في البورصة المصرية — مؤسسات ولا أفراد، ' +
    'مصريين ولا أجانب. وسجّل صفقاتك بأسبابها وحجمها المحسوب، واعرف أداءك ' +
    'رايح على فين. من المتصفح، ومجاني بالكامل دلوقتي.',

  /**
   * Set once the listing is live. Every download call-to-action reads this and
   * degrades to «قريبًا» while it is null, so the site never ships a dead
   * store link — a 404 from a shared post costs more than an honest "not yet".
   */
  playStoreUrl: null as string | null,

  /**
   * ── THE USER COUNT USED TO BE A NUMBER TYPED HERE. IT IS LIVE NOW. ─────────
   *
   * It was `userCount: null as number | null`, with a note saying to set it to
   * the real figure after launch. The flaw in that is not the typing, it is
   * that a hand-set figure is only correct on the day it is set: it goes stale
   * silently, in the direction that flatters, on a public page.
   *
   * It now comes from `publicStats/counts` — see lib/public-stats.ts for how it
   * is read and firestore.rules for who may write it. The line stays hidden
   * when that document is missing or unreadable, which is exactly what `null`
   * used to buy.
   *
   * `launchedAt` and `statsSince` lived here too, and the published figure was
   * filtered to accounts created on or after that date so pre-launch test
   * accounts stayed out of it. Both are gone: the owner's call is that the
   * number is simply how many people are on Radar, and the filter was in
   * practice hiding REAL traders — people had signed up the day before the
   * recorded launch date. The launch date itself is still recorded, in
   * CLAUDE.md, where a fact with no code reading it belongs.
   */

  contactEmail: 'ahmed14mostafa17@gmail.com',

  /**
   * Absolute origin, needed for canonical URLs, the sitemap, and Open Graph —
   * social scrapers do not resolve relative image paths.
   *
   * MUST be set at build time: `NEXT_PUBLIC_SITE_URL=https://… npm run build`.
   *
   * The fallback is localhost on purpose. Defaulting to a real-looking domain
   * is the dangerous option — the build succeeds, the pages carry canonical
   * tags and a sitemap pointing at a host that is not this site, and nobody
   * notices until search engines have indexed the wrong origin. localhost
   * fails visibly instead, and next.config.ts warns during the build.
   */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(
    /\/$/,
    ''
  ),

  /** Kept in sync with the «آخر تحديث» line inside the privacy policy. Bumped
   *  when the policy's substance changes, not when its wording is tidied.
   *
   *  4 أغسطس added risk settings to the stored-data table, because capital
   *  stopped being device-only and started syncing through the account.
   *
   *  5 أغسطس is a substance change twice over: the product started DISPLAYING
   *  third-party market data, which needed its own clause in both documents,
   *  and both documents stopped saying «التطبيق» when they meant Radar — a
   *  reader on the website was being governed by terms that named something
   *  else. Widened, never narrowed.
   *
   *  26 أغسطس is three substance changes at once, and each one is a correction
   *  rather than a new practice:
   *
   *    · §6 of the Terms still sold «رادار Pro» — a tier switched off months
   *      earlier — and linked to a pricing anchor that no longer renders. It
   *      also told the reader to send a payment request «من داخل رادار», the
   *      exact instruction removed from the Android app for Play's sake, on a
   *      page the app links to from its settings.
   *    · §4 of the policy said market requests leave the phone straight for the
   *      source. They have gone through our server since the app moved onto
   *      /api/quote, and now /api/stocks too. That sentence exists to tell the
   *      reader whose server sees their IP, so backwards was the worst state.
   *    · §5 listed two third parties. The TradingView chart is an embed, so
   *      opening one puts the reader's browser in touch with TradingView
   *      directly — a third, and the only one that is the reader's own traffic.
   *
   *  The stored-data table also now admits that a manual activation writes the
   *  amount, method and transfer reference into the billing document.
   *  Widened, never narrowed.
   *
   *  31 أغسطس is the first time this document has had to REMOVE a promise
   *  rather than widen one. It said «مفيش أدوات تتبّع» in the callout, «مفيش
   *  أدوات تتبّع تحليلية» in §1 and «مفيش حاجة بتتسجّل عنك وانت بتتفرّج» in §4
   *  — three wordings of one claim, and the site now counts aggregate page
   *  views (see app/layout.tsx). All three were rewritten in the same commit
   *  that added the counter, because the alternative is a published policy
   *  describing a product that no longer exists.
   *
   *  The narrowing is bounded and the document says where: web only, no
   *  cookies, no profile, never joined to an account or a journal, and the
   *  Android app collects nothing at all. */
  legalUpdatedAt: '31 أغسطس 2026',
} as const;

/**
 * «السوق» leads, because it is the half a visitor cannot get anywhere else and
 * the half the page used to omit entirely.
 */
export const nav = [
  { href: '#market', label: 'السوق' },
  { href: '#why', label: 'صفقاتك' },
  { href: '#goal', label: 'حاسبة الهدف' },
  { href: '#tools', label: 'الأدوات' },
  { href: '#pricing', label: 'السعر' },
] as const;

/**
 * The disclaimer is not optional polish. RELEASE.md requires it stated
 * outright so Play does not classify the app under its restricted financial
 * categories, and the privacy policy makes the same promise — so the site has
 * to make it too, in the same words.
 */
export const disclaimer =
  'رادار أداة لتسجيل الصفقات وحساب المخاطرة، ولعرض بيانات تداولات منشورة من ' +
  'البورصة المصرية. هو لا يقدّم نصائح أو توصيات استثمارية، ولا ينفّذ أي ' +
  'عمليات بيع أو شراء، ولا يتصل بأي وسيط أو حساب تداول. كل القرارات ' +
  'مسؤوليتك وحدك.';
