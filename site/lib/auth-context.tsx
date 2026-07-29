'use client';

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
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
    }),
    [user, loading, isAdmin, adminChecked, signIn, signUp, signInWithGoogle, logout]
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
