/*
 * Radar's service worker.
 *
 * TWO JOBS, AND THE SECOND ONE IS THE REASON IT EXISTS AT ALL:
 *
 *   1. Keep the app usable offline, or on the kind of connection that resolves
 *      DNS and then stalls.
 *   2. Make the app installable. Chrome refuses to fire `beforeinstallprompt`
 *      unless a service worker with a `fetch` handler is registered — a
 *      manifest alone is not enough, and there is no warning when it is
 *      missing. The install button just never appears.
 *
 * NOT a generated Workbox bundle. The whole policy is thirty lines of routing
 * and it is worth being able to read it, because a caching mistake here is
 * invisible in development and permanent in a user's browser.
 *
 * WHAT IS DELIBERATELY NEVER CACHED
 * Anything cross-origin. Firestore, Identity Toolkit and the secure-token
 * endpoint all go through `fetch`, and a stale trade or a replayed auth
 * response is far worse than an offline error. They are not passed to
 * `respondWith` at all, so the browser handles them exactly as it would with no
 * service worker installed.
 */

// Bumping this string is what retires every previous cache — see `activate`.
// Change it whenever the caching RULES change; the content itself is handled by
// the strategies below.
const VERSION = 'radar-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;

const OFFLINE_URL = '/offline/';

/** Content-hashed by the build, so a hit can never be stale. */
const IMMUTABLE = /^\/_next\/static\//;
/** Stable URLs whose content does change — revalidated, not trusted forever. */
const ASSETS = /^\/(icons|fonts)\/|\.(png|jpg|jpeg|svg|ico|woff2)$/;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL]))
      // Take over without waiting for every old tab to close. Safe here because
      // the worker holds no state a previous version could disagree with.
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => !name.startsWith(VERSION))
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

/**
 * Stores a response without making the caller wait for the write.
 *
 * `event.waitUntil` is the part that matters. A bare, un-awaited `cache.put`
 * looks equivalent and is not: the browser is free to kill an idle service
 * worker the moment `respondWith` settles, and the pending write dies with it.
 * That failure is invisible — the page works, the cache is just emptier than it
 * should be, and only shows up as an offline load that misses. Awaiting the put
 * before returning would fix it too, at the cost of delaying every response by a
 * disk write. This does neither.
 */
function store(event, cacheName, request, response) {
  const copy = response.clone();
  event.waitUntil(caches.open(cacheName).then((cache) => cache.put(request, copy)));
}

/** Cache-first. For content-hashed URLs only, where the name IS the version. */
async function cacheFirst(event, request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) store(event, cacheName, request, response);
  return response;
}

/**
 * Network-first, cache as fallback.
 *
 * This is the rule for every HTML document, and it is not negotiable: /privacy
 * and /terms are published legal documents that Play reviewers read, and a
 * cache-first worker would keep serving a superseded version of one to a user
 * who is perfectly online. The cache is only ever consulted when the network
 * actually fails.
 */
async function networkFirst(event, request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) store(event, cacheName, request, response);
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const offline = await caches.match(OFFLINE_URL);
      if (offline) return offline;
    }
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Cross-origin (Firebase, Google) and non-GET (every write) are left alone.
  // Returning without calling respondWith is what "leave alone" means — the
  // browser then does exactly what it would with no worker registered.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (IMMUTABLE.test(url.pathname)) {
    event.respondWith(cacheFirst(event, request, ASSET_CACHE));
    return;
  }

  if (ASSETS.test(url.pathname)) {
    event.respondWith(networkFirst(event, request, ASSET_CACHE));
    return;
  }

  // Documents, and the RSC payloads the router prefetches.
  event.respondWith(networkFirst(event, request, SHELL_CACHE));
});
