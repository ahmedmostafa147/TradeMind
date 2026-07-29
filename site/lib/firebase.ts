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
const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??
    'AIzaSyA4vBu8r2qD-nVs3Nd1l2-SMoSI7frtB9M',
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    'trademind-6222c.firebaseapp.com',
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
 * The site is a static export: every page is rendered at BUILD time in Node,
 * where there is no browser and no signed-in user. Calling initializeApp at
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
