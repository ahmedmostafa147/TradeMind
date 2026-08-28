import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

/**
 * Firebase client for the dashboard.
 *
 * THESE VALUES ARE NOT SECRETS, and hiding them would be cargo-culting. A web
 * Firebase config is shipped inside the JavaScript bundle to every visitor by
 * design — it identifies the project, it does not authorise anything. What
 * actually protects the data is firestore.rules, which is why the admin model
 * there is enforced by a Console-only collection rather than by a flag any
 * client could set.
 *
 * They are still readable from the environment so a staging project can be
 * pointed at without a code change, with the production values as defaults so
 * a fresh clone builds and runs with no setup.
 */
/**
 * The origin that serves the sign-in helper.
 *
 * ── WHY THIS IS NOT `trademind-6222c.firebaseapp.com` ANY MORE ──────────────
 *
 * It was, and Google sign-in looped because of it: choose an account, land back
 * signed out, choose again. `signInWithRedirect` stores the pending request
 * under the authDomain's origin and reads it back when Google returns, and
 * Chrome partitions storage belonging to another origin — so the write and the
 * read landed in different buckets and the returning user looked, to the SDK,
 * like someone who had never pressed anything. Silent by construction: nothing
 * failed, a record was simply not found.
 *
 * Whatever host is serving this page also serves `/__/auth/*`, proxied in
 * next.config.ts. Reading the host here rather than naming one keeps the two
 * in step everywhere the app runs — localhost, a Vercel preview, production,
 * and the custom domain later — with nothing to remember to change.
 *
 * THE HOST MUST STILL BE IN Firebase → Authentication → Authorized domains.
 * The proxy decides where the helper is served from; that list decides whether
 * Firebase will talk to the page at all.
 *
 * The build-time fallback is never used at runtime — every caller below runs in
 * the browser — but prerendering evaluates this module in Node, where there is
 * no `window`.
 */
const FIREBASE_AUTH_DOMAIN = 'trademind-6222c.firebaseapp.com';

function authDomain(): string {
  const configured = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  if (configured) return configured;

  // Prerendering. Never reached at runtime — every caller below runs in the
  // browser — but the module is evaluated in Node during the build.
  if (typeof window === 'undefined') return FIREBASE_AUTH_DOMAIN;

  // ── PLAIN HTTP CANNOT USE THE PROXY, SO IT DOES NOT TRY ───────────────────
  //
  // The SDK builds the helper URL as `https://{authDomain}/__/auth/handler` —
  // the scheme is fixed, not copied from the page. Handing it `localhost:3000`
  // while `next start` is serving http therefore points it at an https origin
  // that does not exist, and the sign-in dies on a browser connection error
  // before any of our code runs. Measured in exactly that setup.
  //
  // So local development keeps the original cross-origin helper. That is not a
  // hole: the popup route works there regardless, and the storage partitioning
  // this whole change exists to defeat only bites the redirect route on a real
  // https site. Anywhere it matters, this returns our own host.
  if (window.location.protocol !== 'https:') return FIREBASE_AUTH_DOMAIN;

  return window.location.host;
}

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??
    'AIzaSyA4vBu8r2qD-nVs3Nd1l2-SMoSI7frtB9M',
  authDomain: authDomain(),
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'trademind-6222c',
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    'trademind-6222c.firebasestorage.app',
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '680175215',
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??
    '1:680175215:web:8b6e864c17b9e012394f9a',
};

/**
 * Initialised lazily and only in the browser.
 *
 * Every page here is prerendered at BUILD time in Node — that stayed true when
 * the site moved off `output: 'export'` onto Vercel, because these pages are
 * still client components with no server data. There is no browser and no
 * signed-in user during that render. Calling initializeApp at
 * module scope would run during that build, and getAuth would throw on a
 * missing `window`. Every caller goes through these functions, so nothing
 * Firebase-shaped exists until a component actually mounts.
 *
 * getApps() is checked because Next's dev server re-executes modules on hot
 * reload, and a second initializeApp with the same name throws.
 */
function app(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function firebaseAuth(): Auth {
  return getAuth(app());
}

export function firestore(): Firestore {
  return getFirestore(app());
}
