import type { MetadataRoute } from 'next';

import { site } from '@/lib/site';

/**
 * `trailingSlash: true` in next.config.ts makes the exported files
 * /privacy/index.html rather than /privacy.html, so the URLs advertised here
 * carry the same trailing slash. A sitemap that lists a URL the host answers
 * with a redirect wastes the crawl and splits the signal across two addresses.
 */
/** See the note in robots.ts — required for metadata routes under static export. */
export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: '/', priority: 1, changeFrequency: 'monthly' as const },
    { path: '/privacy/', priority: 0.4, changeFrequency: 'yearly' as const },
    { path: '/terms/', priority: 0.4, changeFrequency: 'yearly' as const },
    { path: '/delete/', priority: 0.3, changeFrequency: 'yearly' as const },
  ];

  return routes.map((route) => ({
    url: `${site.url}${route.path}`,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
