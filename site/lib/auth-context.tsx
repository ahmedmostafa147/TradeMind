'use client';

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { firebaseAuth, firestore } from '@/lib/firebase';

type AuthState = {
  user: User | null;
  /** True until the first onAuthStateChanged fires. */
  loading: boolean;
  /**
   * Whether `admins/{uid}` exists.
   *
   * This is a HINT FOR THE UI ONLY — it decides what to render, never what is
   * allowed. The real check runs in firestore.rules on every read and write,
   * where the same collection is consulted server-side. Someone who flips this
   * in a debugger gets to look at an empty admin screen whose every query the
   * server refuses.
   */
  isAdmin: boolean;
  adminChecked: boolean;
  /**
   * A failure carried back from the redirect sign-in route.
   *
   * The popup reports its own errors to whoever awaited it. The redirect
   * cannot: it navigates away mid-call, and the browser comes back to a fresh
   * page where that promise no longer exists. Without this the user lands back
   * on the sign-in form with no account and no explanation — which looks
   * exactly like a button that does nothing.
   */
  redirectError: unknown;
};

type AuthActions = {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  /**
   * Sends the reset link.
   *
   * Until this existed a user who forgot their password had no way back into
   * their own journal from the web at all — the panel offered sign-in, sign-up
   * and Google, and nothing else.
   */
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<(AuthState & AuthActions) | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);
  const [redirectError, setRedirectError] = useState<unknown>(null);

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth(), (next) => {
      setUser(next);
      setLoading(false);
    });
  }, []);

  /**
   * Completes a sign-in that went the redirect route.
   *
   * `onAuthStateChanged` above already picks up the session, so this is not
   * what signs the user in — it is what catches the FAILURES. A redirect that
   * comes back rejected (an unauthorised domain, storage the browser refuses,
   * a cancelled consent screen) resolves here and nowhere else; skipping this
   * call throws the reason away and returns the user to the form as though
   * they had never pressed anything.
   *
   * Harmless on a normal page load: with no pending redirect it resolves null.
   */
  useEffect(() => {
    let cancelled = false;
    getRedirectResult(firebaseAuth()).catch((error: unknown) => {
      if (!cancelled) setRedirectError(error);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setIsAdmin(false);
      setAdminChecked(false);
      return;
    }

    (async () => {
      try {
        const snap = await getDoc(doc(firestore(), 'admins', user.uid));
        if (!cancelled) setIsAdmin(snap.exists());
      } catch {
        // The rules deny reading anyone else's admin document, and a denial
        // for your own simply means you are not one. Either way: not an admin.
        if (!cancelled) setIsAdmin(false);
      } finally {
        if (!cancelled) setAdminChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(firebaseAuth(), email.trim(), password);
  }, []);

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const credential = await createUserWithEmailAndPassword(
        firebaseAuth(),
        email.trim(),
        password
      );
      const trimmed = name.trim();
      if (trimmed) await updateProfile(credential.user, { displayName: trimmed });
    },
    []
  );

  const signInWithGoogle = useCallback(async () => {
    const auth = firebaseAuth();
    const provider = new GoogleAuthProvider();

    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      if (!POPUP_UNAVAILABLE.has(errorCode(error))) throw error;

      // ── WHY THERE IS A SECOND ROUTE AT ALL ────────────────────────────────
      //
      // The popup is the better experience — the user never leaves the page —
      // but it is the fragile one, and it fails for reasons that have nothing
      // to do with the user: a popup blocker set once and forgotten, an
      // installed PWA where `window.open` on another origin is not a thing the
      // platform does, an in-app browser inside another app.
      //
      // Until now every one of those ended at «اسمح بالنوافذ المنبثقة وجرّب
      // تاني» — advice that asks a person to go and change a browser setting
      // they may not be able to find, on a device where it may not exist, to
      // reach a screen we could simply have taken them to. `signInWithRedirect`
      // is the route Firebase ships for exactly this, and it needs no
      // permission from anyone.
      //
      // This navigates away. Nothing after it runs.
      await signInWithRedirect(auth, provider);
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(firebaseAuth());
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(firebaseAuth(), email.trim());
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAdmin,
      adminChecked,
      redirectError,
      signIn,
      signUp,
      signInWithGoogle,
      logout,
      resetPassword,
    }),
    [
      user,
      loading,
      isAdmin,
      adminChecked,
      redirectError,
      signIn,
      signUp,
      signInWithGoogle,
      logout,
      resetPassword,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
}

function errorCode(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : '';
}

/**
 * The codes that mean "this browser will not give you a popup", as opposed to
 * "this sign-in failed".
 *
 * `auth/cancelled-popup-request` is deliberately NOT here. It fires when a
 * second popup supersedes a first — a double-click — and answering a
 * double-click by navigating the whole page away is worse than doing nothing.
 * `auth/popup-closed-by-user` is not here either: that is a person deciding
 * not to sign in, and re-asking them through another route ignores the answer
 * they just gave.
 */
const POPUP_UNAVAILABLE = new Set([
  'auth/popup-blocked',
  // Installed PWAs, in-app browsers, and anything else without a real
  // window-opening model.
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
]);

/** Maps Firebase's error codes to something a person can act on. */
export function authErrorMessage(error: unknown): string {
  const code = errorCode(error);

  switch (code) {
    case 'auth/invalid-email':
      return 'البريد الإلكتروني مش مظبوط.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'البريد أو كلمة السر غلط.';
    case 'auth/email-already-in-use':
      return 'البريد ده مسجّل بالفعل. جرّب تسجيل الدخول.';
    case 'auth/weak-password':
      return 'كلمة السر ضعيفة — خليها 6 حروف على الأقل.';
    case 'auth/missing-email':
      return 'اكتب البريد الإلكتروني الأول.';
    // Raised when an address was created through Google and has no password to
    // sign in with. Telling the user to "try again" here would be a dead end.
    case 'auth/account-exists-with-different-credential':
      return 'البريد ده متسجّل بحساب Google. استخدم زرار «المتابعة بحساب Google».';
    // Reaching this now means the popup was blocked AND the redirect fallback
    // could not start either, so «اسمح بالنوافذ المنبثقة» is no longer the
    // whole answer — the browser is refusing both routes, which in practice is
    // blocked site data.
    case 'auth/popup-blocked':
      return 'المتصفح مانع الدخول بجوجل. جرّب تسمح بالكوكيز لموقعنا، أو ادخل بالبريد وكلمة السر.';
    case 'auth/unauthorized-domain':
      return 'الدومين ده مش مصرّح له في إعدادات Firebase.';
    case 'auth/operation-not-allowed':
      return 'طريقة الدخول دي مش مفعّلة في إعدادات المشروع.';
    case 'auth/too-many-requests':
      return 'محاولات كتير. استنى شوية وجرّب تاني.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'قفلت نافذة جوجل قبل ما تخلص.';
    case 'auth/network-request-failed':
      return 'مفيش اتصال بالإنترنت.';
    default:
      return 'حصلت مشكلة. جرّب تاني.';
  }
}
