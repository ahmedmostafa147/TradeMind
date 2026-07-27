import type { NextConfig } from 'next';

// A production build with no origin configured would still succeed and emit
// canonical tags, a sitemap and an og:image all pointing at localhost. That is
// silent and expensive to discover later, so it is shouted about here.
if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_SITE_URL) {
  console.warn(
    '\n\x1b[33m⚠  NEXT_PUBLIC_SITE_URL is not set.\x1b[0m\n' +
      '   Canonical URLs, sitemap.xml and og:image will point at http://localhost:3000.\n' +
      '   Rebuild with:  NEXT_PUBLIC_SITE_URL=https://your-domain.com npm run build\n'
  );
}

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // The site is a static marketing surface — no server rendering of user data,
  // no API routes. Exporting to plain HTML means it can be hosted anywhere
  // (Vercel, Firebase Hosting, GitHub Pages, any static bucket) without a Node
  // runtime, and there is no server to keep patched.
  output: 'export',

  // `output: 'export'` has no image optimisation server, so the loader must be
  // disabled explicitly or next/image throws at build time.
  images: { unoptimized: true },

  // Static export writes /privacy/index.html rather than /privacy.html, so the
  // canonical URLs the sitemap advertises resolve on hosts that do not rewrite
  // extensionless paths.
  trailingSlash: true,
};

export default nextConfig;
