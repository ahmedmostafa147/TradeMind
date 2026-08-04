import type { NextConfig } from 'next';

// A production build with no origin configured would still succeed and emit
// canonical tags, a sitemap and an og:image all pointing at localhost. That is
// silent and expensive to discover later, so it is shouted about here.
//
// On Vercel the variable is set in Project Settings → Environment Variables,
// not on the command line, so a missing one means somebody deleted it there.
if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_SITE_URL) {
  console.warn(
    '\n\x1b[33m⚠  NEXT_PUBLIC_SITE_URL is not set.\x1b[0m\n' +
      '   Canonical URLs, sitemap.xml and og:image will point at http://localhost:3000.\n' +
      '   Set it in the Vercel project, or for a local build:\n' +
      '   NEXT_PUBLIC_SITE_URL=https://your-domain.com npm run build\n'
  );
}

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // NO `output: 'export'`.
  //
  // The site ran as a static export while it was on Firebase Hosting, and that
  // combination had one defect nothing could fix from inside the app: Next's
  // router prefetches a route by requesting a path with a dot in it, while the
  // export writes a directory — so every prefetch 404'd and each navigation
  // fell back to a full page load. On Vercel the Next runtime answers those
  // requests, so client-side navigation works and the prefetch noise is gone.
  //
  // Every page here is still a client component with no server data, so they
  // are prerendered at build time exactly as before. What changed is who
  // serves them, not how they are produced.

  // One 4.7 KB logo at ~28 CSS pixels is the only next/image on the site.
  // Optimising it would trade a few hundred bytes for a per-request image
  // transform, so the loader stays off — this is now a choice, not the
  // constraint `output: 'export'` used to impose.
  images: { unoptimized: true },

  // Kept from the export era on purpose: the canonical URLs, the sitemap and
  // every internal link already carry the trailing slash, and changing the
  // shape of a URL is a redirect chain nobody asked for.
  trailingSlash: true,
};

export default nextConfig;
