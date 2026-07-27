import { ClosingCta } from '@/components/closing-cta';
import { Discipline } from '@/components/discipline';
import { Faq, faq } from '@/components/faq';
import { Features } from '@/components/features';
import { Hero } from '@/components/hero';
import { Problem } from '@/components/problem';
import { disclaimer, site } from '@/lib/site';

/**
 * Structured data for the page.
 *
 * The FAQ entries are generated from the same array the visible section
 * renders, so the two can never drift — and search engines treat marked-up
 * answers that differ from the on-page text as cloaking.
 *
 * `offers` is stated at price 0 rather than omitted: without it the listing can
 * be shown with no price at all, and "free" is the single most load-bearing
 * claim on this page.
 */
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: site.name,
      description: site.description,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Android',
      inLanguage: 'ar',
      url: site.url,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'EGP',
      },
      disclaimer,
    },
    {
      '@type': 'FAQPage',
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
      <Problem />
      <Features />
      <Discipline />
      <Faq />
      <ClosingCta />
    </>
  );
}
