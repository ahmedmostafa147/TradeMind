'use client';

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
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

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth(), (next) => {
      setUser(next);
      setLoading(false);
    });
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
    await signInWithPopup(firebaseAuth(), new GoogleAuthProvider());
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

/** Maps Firebase's error codes to something a person can act on. */
export function authErrorMessage(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';

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
    // The popup flow is the one place a browser setting, not the user, is at
    // fault — so it gets its own message instead of the generic one.
    case 'auth/popup-blocked':
      return 'المتصفح منع النافذة المنبثقة. اسمح بيها وجرّب تاني.';
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
