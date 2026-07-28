/**
 * Single source of truth for everything the site says about itself.
 *
 * Copy that appears in more than one place lives here, not duplicated across
 * components — the app name and the contact address in particular also appear
 * in the privacy policy, and two drifting copies of a legal contact is a real
 * problem rather than a cosmetic one.
 */

export const site = {
  name: 'TradePilot',

  /**
   * The Arabic name is a description, not a transliteration. `TradePilot` stays
   * Latin everywhere it is the product's name — RELEASE.md fixes it as the
   * Play display name, and a second Arabic brand would split the search term.
   */
  tagline: 'دفتر صفقات البورصة المصرية',

  description:
    'سجّل كل صفقة بسببها وحجمها المحسوب، وارجع لها بعد شهور تعرف غلطت فين. ' +
    'حاسبة مخاطرة، تحليل أداء، ونسخة احتياطية اختيارية — والتطبيق شغّال من غير حساب.',

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

  /** Kept in sync with the «آخر تحديث» line inside the privacy policy. */
  legalUpdatedAt: '27 يوليو 2026',
} as const;

export const nav = [
  { href: '#why', label: 'المشكلة' },
  { href: '#tools', label: 'الأدوات' },
  { href: '#discipline', label: 'الانضباط' },
  { href: '#pricing', label: 'السعر' },
  { href: '#faq', label: 'أسئلة' },
] as const;

/**
 * The disclaimer is not optional polish. RELEASE.md requires it stated
 * outright so Play does not classify the app under its restricted financial
 * categories, and the privacy policy makes the same promise — so the site has
 * to make it too, in the same words.
 */
export const disclaimer =
  'TradePilot أداة لتسجيل الصفقات وحساب المخاطرة. التطبيق لا يقدّم نصائح أو ' +
  'توصيات استثمارية، ولا ينفّذ أي عمليات بيع أو شراء، ولا يتصل بأي وسيط أو ' +
  'حساب تداول. كل القرارات مسؤوليتك وحدك.';
