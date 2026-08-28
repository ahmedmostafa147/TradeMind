'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
  UserIcon,
} from '@/components/icons';
import { authErrorMessage, useAuth } from '@/lib/auth-context';

/**
 * The sign-in / sign-up / reset panel shared by both dashboards.
 *
 * One panel with a mode switch rather than three routes: the forms differ by a
 * field or two, and separate pages would triple the copy that has to stay in
 * step with the app's own auth screen.
 *
 * Firebase's own minimum. Stated up front on the sign-up form rather than left
 * for the server to reject after a round trip.
 */
const MIN_PASSWORD = 6;

type Mode = 'in' | 'up' | 'reset';

export function SignInPanel({ title, subtitle }: { title: string; subtitle: string }) {
  const { signIn, signUp, signInWithGoogle, resetPassword, redirectError } =
    useAuth();

  const [mode, setMode] = useState<Mode>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /**
   * «ابدأ مجانًا» on the landing page should land on the sign-UP form, not on
   * sign-in with an extra click in the way.
   *
   * Read from the hash in an effect rather than from useSearchParams: a query
   * param would force this subtree into a Suspense boundary for a value that is
   * only ever present on first paint. The hash is client-only by definition,
   * which is exactly what this is.
   */
  useEffect(() => {
    if (window.location.hash === '#signup') setMode('up');
  }, []);

  function switchTo(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
    // Never carry a typed password across a mode change — on the way to the
    // reset form there is nothing to carry it to, and leaving it in state means
    // it survives in memory for no reason.
    setPassword('');
    setShowPassword(false);
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setNotice(null);
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

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    if (mode === 'reset') {
      void run(async () => {
        await resetPassword(email);
        // Deliberately the same message whether or not the address has an
        // account. Firebase does not say which, and neither should this — a
        // form that distinguishes them is an account-enumeration oracle.
        setNotice(
          'لو فيه حساب بالبريد ده، هيوصله رابط لتغيير كلمة السر. بُص في الوارد وفي الـ Spam.'
        );
      });
      return;
    }

    void run(() =>
      mode === 'in' ? signIn(email, password) : signUp(name, email, password)
    );
  }

  const heading =
    mode === 'reset' ? 'نسيت كلمة السر؟' : title;

  const sub =
    mode === 'reset'
      ? 'اكتب بريدك المسجّل وهنبعتلك رابط تعمل بيه كلمة سر جديدة.'
      : mode === 'up'
        ? 'اعمل حساب مجاني، وابدأ تسجّل صفقاتك من المتصفح ومن التطبيق بنفس الحساب.'
        : subtitle;

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="text-2xl font-bold tracking-tight">{heading}</h1>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">{sub}</p>

      <form className="mt-8 space-y-4" onSubmit={submit}>
        {mode === 'up' && (
          <Field
            id="name"
            label="الاسم"
            type="text"
            autoComplete="name"
            Icon={UserIcon}
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
          Icon={MailIcon}
          value={email}
          onChange={setEmail}
          required
        />

        {mode !== 'reset' && (
          <Field
            id="password"
            label="كلمة السر"
            type={showPassword ? 'text' : 'password'}
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            dir="ltr"
            Icon={LockIcon}
            value={password}
            onChange={setPassword}
            required
            minLength={mode === 'up' ? MIN_PASSWORD : undefined}
            hint={
              mode === 'up' ? `${MIN_PASSWORD} حروف على الأقل` : undefined
            }
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                // aria-pressed, not a label that flips: a screen reader should
                // hear one control whose state changed, not two controls.
                aria-pressed={showPassword}
                aria-label="إظهار كلمة السر"
                title={showPassword ? 'إخفاء كلمة السر' : 'إظهار كلمة السر'}
                className="grid w-11 place-items-center text-fg-subtle transition-colors hover:text-fg"
              >
                {showPassword ? (
                  <EyeOffIcon className="size-4" />
                ) : (
                  <EyeIcon className="size-4" />
                )}
              </button>
            }
            action={
              mode === 'in' ? (
                <button
                  type="button"
                  onClick={() => switchTo('reset')}
                  className="text-xs font-semibold text-brand-ink underline-offset-4 hover:underline"
                >
                  نسيت كلمة السر؟
                </button>
              ) : undefined
            }
          />
        )}

        {/* role=alert so a screen reader announces the failure instead of
            leaving the user to wonder why nothing happened.
            
            `redirectError` is the same alert for a failure that happened on
            another page load — the Google route sends the browser away, so a
            rejection comes back here rather than to whoever pressed the
            button. Without it the user returns to a form that looks untouched. */}
        {(error ?? redirectError) != null && (
          <p
            role="alert"
            className="rounded-md border border-loss-border bg-loss-surface p-3 text-sm font-semibold text-loss"
          >
            {error ?? authErrorMessage(redirectError)}
          </p>
        )}

        {/* Not win-green: that colour is reserved for money everywhere else in
            the product, and spending it on a form confirmation would blunt it
            where it actually carries meaning. */}
        {notice && (
          <p
            role="status"
            className="rounded-md border border-border-strong bg-surface-high p-3 text-sm leading-relaxed"
          >
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-brand px-5 py-3 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy
            ? '...'
            : mode === 'in'
              ? 'تسجيل الدخول'
              : mode === 'up'
                ? 'إنشاء حساب'
                : 'ابعتلي الرابط'}
        </button>
      </form>

      {mode === 'reset' ? (
        <p className="mt-6 text-center text-sm text-fg-muted">
          <button
            type="button"
            onClick={() => switchTo('in')}
            className="font-semibold text-brand-ink underline-offset-4 hover:underline"
          >
            ارجع لتسجيل الدخول
          </button>
        </p>
      ) : (
        <>
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border-default" />
            <span className="text-xs text-fg-subtle">أو</span>
            <span className="h-px flex-1 bg-border-default" />
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => void run(signInWithGoogle)}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-border-strong px-5 py-3 text-sm font-semibold transition-colors hover:bg-surface-high disabled:opacity-60"
          >
            <GoogleMark />
            المتابعة بحساب Google
          </button>

          {/* Consent, on the account-CREATION mode only, and placed after the
              Google button so it covers both routes into a new account rather
              than just the email form.

              The signed-in shell has no marketing footer, so before this line
              existed there was no path from any authenticated surface to the
              privacy policy or the terms at all — a visitor could create an
              account having never been offered either document. Both are
              published legal pages that the app's own store listing depends on
              (RELEASE.md), which makes their absence at the one moment consent
              is actually given the wrong kind of gap. */}
          {mode === 'up' && (
            <p className="mt-5 text-center text-xs leading-relaxed text-fg-subtle">
              بإنشائك حساب انت موافق على{' '}
              <Link
                href="/terms"
                className="font-semibold text-fg-muted underline underline-offset-4 hover:text-fg"
              >
                شروط الاستخدام
              </Link>{' '}
              و
              <Link
                href="/privacy"
                className="font-semibold text-fg-muted underline underline-offset-4 hover:text-fg"
              >
                سياسة الخصوصية
              </Link>
              .
            </p>
          )}

          <p className="mt-6 text-center text-sm text-fg-muted">
            {mode === 'in' ? 'لسه معندكش حساب؟' : 'عندك حساب بالفعل؟'}{' '}
            <button
              type="button"
              onClick={() => switchTo(mode === 'in' ? 'up' : 'in')}
              className="font-semibold text-brand-ink underline-offset-4 hover:underline"
            >
              {mode === 'in' ? 'اعمل واحد' : 'سجّل دخول'}
            </button>
          </p>
        </>
      )}
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
  minLength,
  hint,
  Icon,
  trailing,
  action,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  dir?: 'ltr';
  required?: boolean;
  minLength?: number;
  hint?: string;
  Icon: (props: { className?: string }) => React.ReactElement;
  /** A control inside the field, at the inline end — the reveal toggle. */
  trailing?: React.ReactNode;
  /** A link beside the label — «نسيت كلمة السر؟». */
  action?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold">
          {label}
        </label>
        {action}
      </div>

      {/* focus-within on the wrapper, not :focus on the input: the border has
          to light up even when the caret is in the input and the eye button is
          the thing being hovered. */}
      <div className="mt-2 flex items-center rounded-md border border-border-default bg-surface-low transition-colors focus-within:border-brand-ink">
        <span
          className="pointer-events-none grid w-11 shrink-0 place-items-center text-fg-subtle"
          aria-hidden
        >
          <Icon className="size-4" />
        </span>
        <input
          id={id}
          type={type}
          dir={dir}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="w-full bg-transparent py-3 pe-3 text-start outline-none"
        />
        {trailing}
      </div>

      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-fg-subtle">
          {hint}
        </p>
      )}
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
