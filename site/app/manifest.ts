import type { MetadataRoute } from 'next';

import { site } from '@/lib/site';

/**
 * The web app manifest, served at /manifest.webmanifest.
 *
 * Chrome will only fire `beforeinstallprompt` — the event the install button in
 * site-header.tsx waits for — when ALL of these hold: HTTPS, a manifest with
 * `name`, `short_name`, a `start_url`, a `display` of standalone/fullscreen/
 * minimal-ui, icons at 192 AND 512, and a registered service worker that has a
 * fetch handler. Miss any one and the button simply never appears, with no
 * error anywhere. sw.js exists for that last requirement as much as for offline.
 *
 * Written as a route rather than a static public/manifest.json so the name,
 * description and colours come from the same `site` object the pages use, and
 * cannot drift from them.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name} — ${site.tagline}`,
    // Home screens truncate at roughly 12 characters. The Arabic wordmark fits
    // where «Radar — دفتر صفقات البورصة المصرية» would be cut mid-word.
    short_name: site.nameAr,
    description: site.description,
    lang: 'ar-EG',
    dir: 'rtl',

    // The journal, not the landing page. Someone who installed this to their
    // home screen has already read the pitch; opening the marketing site every
    // time would be a worse app than the browser tab they replaced.
    start_url: '/dashboard/',
    // Wider than start_url on purpose, so the legal pages and the calculator on
    // the landing page open INSIDE the installed window instead of kicking the
    // user out to a browser tab.
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',

    // Must match the `themeColor` in app/layout.tsx and the `--background`
    // token. background_color is what the OS paints during the launch splash,
    // so a mismatch shows as a flash of the wrong colour before first paint.
    background_color: '#0a0b0d',
    theme_color: '#0a0b0d',

    categories: ['finance', 'productivity', 'business'],

    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        // Separate file, not the same one re-declared. Android masks a
        // `maskable` icon to the launcher's own shape and crops everything
        // outside the centre 80% circle — the `any` icons are a rounded square
        // with dark corners and would come out double-rounded.
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],

    shortcuts: [
      {
        name: 'قرار اليوم',
        short_name: 'النهاردة',
        description: 'إيه اللي وصل لسعره، وإيه اللي محتاج قرار',
        url: '/dashboard/',
      },
      {
        name: 'حاسبة حجم المركز',
        short_name: 'الحاسبة',
        description: 'احسب أقصى كمية مسموح بيها قبل ما تشتري',
        url: '/#tools',
      },
    ],
  };
}
