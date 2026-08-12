import { ClosingCta } from '@/components/closing-cta';
import { Discipline } from '@/components/discipline';
import { Faq, faq } from '@/components/faq';
import { Features } from '@/components/features';
import { GoalPlanner } from '@/components/goal-planner';
import { Hero } from '@/components/hero';
import { Market } from '@/components/market';
import { Pricing } from '@/components/pricing';
import { Problem } from '@/components/problem';
import { StatsStrip } from '@/components/stats-strip';
import { Tools } from '@/components/tools';
import { disclaimer, site } from '@/lib/site';
import { EVERYTHING_FREE, PLAN_PRICES } from '@/lib/subscription';

/**
 * Structured data for the page.
 *
 * THIS IS A MACHINE-READABLE CLAIM TO SEARCH ENGINES, so it is held to the same
 * standard as the visible copy — every number on this page is counted from the
 * code, and this block was the one place that had stopped being.
 *
 * TWO THINGS WERE WRONG:
 *
 *   * `offers: { price: '0' }` — it said the product is FREE while `pricing.tsx`
 *     sells three plans at 99, 499 and 799 EGP. Google surfaces price in rich
 *     results, so this published a false price to anybody searching. It is now an
 *     AggregateOffer spanning the real range: the journal and the calculators ARE
 *     free forever, which is the 0, and Pro's annual plan is the ceiling. Both
 *     figures come from PLAN_PRICES so they cannot drift from the pricing table.
 *
 *   * `operatingSystem: 'Android'` — the Android app is not published
 *     (`site.playStoreUrl` is null, which is why every download button reads
 *     «قريبًا»). Declaring an unshipped platform and omitting the one that
 *     actually works described a product nobody could use. It now follows
 *     `playStoreUrl`, the same switch the download buttons read, so shipping the
 *     app updates this by itself.
 */
const paidPlans = Object.values(PLAN_PRICES).map((plan) => plan.price);

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: site.name,
      description: site.description,
      applicationCategory: 'FinanceApplication',
      operatingSystem: site.playStoreUrl === null ? 'Web' : 'Web, Android',
      inLanguage: 'ar',
      url: site.url,
      // PRICE FOLLOWS THE SWITCH, because a search result is the one place this
      // must not lag. While `EVERYTHING_FREE` is on there is nothing to buy, so a
      // published AggregateOffer of 0–799 EGP would put a price Google shows in
      // results next to a page that says «كل حاجة مجانية دلوقتي» — the same
      // mismatch that made this block wrong in the other direction a day ago,
      // when it said 0 while three plans were on sale.
      offers: EVERYTHING_FREE
        ? { '@type': 'Offer', price: '0', priceCurrency: 'EGP' }
        : {
            '@type': 'AggregateOffer',
            priceCurrency: 'EGP',
            // The free plan is real and permanent — the journal, the trade
            // calculator and the goal calculator never lock. See `Feature` in
            // entitlements.dart, which has no entry for recording a trade.
            lowPrice: '0',
            highPrice: String(Math.max(...paidPlans)),
            offerCount: paidPlans.length + 1,
          },
      disclaimer,
    },
    // FAQPage, built from the SAME array the section renders.
    //
    // Generated rather than hand-written so the two can never disagree — a
    // structured answer that differs from the visible one is the kind of mismatch
    // Google penalises, and hand-copying eight Q&A pairs guarantees it eventually.
    //
    // Honest about the benefit: since 2023 Google shows FAQ rich results only for
    // government and health sites, so this is not a snippet play. It stays because
    // the markup is correct, costs one JSON block, and states plainly to any
    // crawler that this product answers «رادار بيقولي أشتري إيه؟» with "no".
    {
      '@type': 'FAQPage',
      inLanguage: 'ar',
      mainEntity: faq.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Hero />
      <StatsStrip />
      <Market />
      <Problem />
      <Features />
      <GoalPlanner />
      <Tools />
      <Discipline />
      <Pricing />
      {/* AFTER the price, before the final call to action.
          Every question in it is an objection — what is free, where the market
          data comes from, whether we tell you what to buy — and an objection
          answered before the price has been seen is answered to nobody. */}
      <Faq />
      <ClosingCta />
    </>
  );
}
