import { ClosingCta } from '@/components/closing-cta';
import { Discipline } from '@/components/discipline';
import { Features } from '@/components/features';
import { GoalPlanner } from '@/components/goal-planner';
import { Hero } from '@/components/hero';
import { Market } from '@/components/market';
import { Pricing } from '@/components/pricing';
import { Problem } from '@/components/problem';
import { StatsStrip } from '@/components/stats-strip';
import { Tools } from '@/components/tools';
import { disclaimer, site } from '@/lib/site';

/**
 * Structured data for the page.
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
      <ClosingCta />
    </>
  );
}
