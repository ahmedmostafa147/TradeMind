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
    'رايح على فين. من المتصفح، وبتجربة مجانية 14 يومًا.',

  /**
   * Set once the listing is live. Every download call-to-action reads this and
   * degrades to «قريبًا» while it is null, so the site never ships a dead
   * store link — a 404 from a shared post costs more than an honest "not yet".
   */
  playStoreUrl: null as string | null,

  /**
   * Registered users, once there are any.
   *
   * Null until the number is real, and the social-proof line is hidden
   * entirely while it is. A launch-day page claiming subscribers it does not
   * have is a fabricated statistic on a public site — and it is the one claim
   * a visitor can check against the Play listing's own install count.
   *
   * Set it to the real figure after launch and the line appears by itself.
   */
  userCount: null as number | null,


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
   *  else. Widened, never narrowed. */
  legalUpdatedAt: '6 أغسطس 2026',
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
