'use client';

import { useState } from 'react';

import { authErrorMessage, useAuth } from '@/lib/auth-context';

/**
 * The sign-in / sign-up form shared by both dashboards.
 *
 * One panel with a mode toggle rather than two routes: the two forms differ by
 * a single field, and a separate page would double the copy that has to stay
 * in step with the app's own auth screen.
 */
export function SignInPanel({ title, subtitle }: { title: string; subtitle: string }) {
  const { signIn, signUp, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      // The component may already be unmounted here, on success — React 18+
      // no longer warns about that, and the alternative (an isMounted ref)
      // exists only to silence a warning that is gone.
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-fg-muted">{subtitle}</p>

      <form
        className="mt-8 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (busy) return;
          void run(() =>
            mode === 'in' ? signIn(email, password) : signUp(name, email, password)
          );
        }}
      >
        {mode === 'up' && (
          <Field
            id="name"
            label="الاسم"
            type="text"
            autoComplete="name"
            value={name}
            onChange={setName}
          />
        )}

        <Field
          id="email"
          label="البريد الإلكتروني"
          type="email"
          autoComplete="email"
          dir="ltr"
          value={email}
          onChange={setEmail}
          required
        />

        <Field
          id="password"
          label="كلمة السر"
          type="password"
          autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
          dir="ltr"
          value={password}
          onChange={setPassword}
          required
        />

        {/* role=alert so a screen reader announces the failure instead of
            leaving the user to wonder why nothing happened. */}
        {error && (
          <p
            role="alert"
            className="rounded-md border border-loss-border bg-loss-surface p-3 text-sm font-semibold text-loss"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy ? '...' : mode === 'in' ? 'تسجيل الدخول' : 'إنشاء حساب'}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-border-default" />
        <span className="text-xs text-fg-subtle">أو</span>
        <span className="h-px flex-1 bg-border-default" />
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => void run(signInWithGoogle)}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-border-strong px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-surface-high disabled:opacity-60"
      >
        <GoogleMark />
        المتابعة بحساب Google
      </button>

      <p className="mt-6 text-center text-sm text-fg-muted">
        {mode === 'in' ? 'لسه معندكش حساب؟' : 'عندك حساب بالفعل؟'}{' '}
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'in' ? 'up' : 'in');
            setError(null);
          }}
          className="font-semibold text-brand-ink underline-offset-4 hover:underline"
        >
          {mode === 'in' ? 'اعمل واحد' : 'سجّل دخول'}
        </button>
      </p>
    </div>
  );
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
  dir,
  required,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  dir?: 'ltr';
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        type={type}
        dir={dir}
        required={required}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-md border border-border-default bg-surface-low px-3 py-2 text-start outline-none focus:border-brand-ink"
      />
    </div>
  );
}

/** Google's mark, which their branding terms require to be full-colour. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M45.1 24.5c0-1.6-.1-2.8-.4-4H24v7.3h12.1c-.2 2-1.6 5-4.5 7l6.9 5.4c4.1-3.8 6.6-9.4 6.6-15.7Z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.4c-1.9 1.3-4.4 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-7.1 5.5C8.1 41.1 15.4 46 24 46Z"
      />
      <path
        fill="#FBBC05"
        d="M11.5 28.4c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4l-7.1-5.5C2.9 17 2 20.4 2 24s.9 7 2.4 9.9l7.1-5.5Z"
      />
      <path
        fill="#EA4335"
        d="M24 10.3c4.1 0 6.9 1.8 8.5 3.3l6.1-6C34.9 4.1 29.9 2 24 2 15.4 2 8.1 6.9 4.4 14.1l7.1 5.5c1.8-5.3 6.7-9.3 12.5-9.3Z"
      />
    </svg>
  );
}
