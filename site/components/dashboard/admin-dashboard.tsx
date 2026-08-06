'use client';

import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ManualFlowsForm } from '@/components/dashboard/manual-flows-form';
import { SignInPanel } from '@/components/dashboard/sign-in-panel';
import { InstallButton } from '@/components/pwa';
import { ThemeToggle } from '@/components/theme-toggle';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { firestore } from '@/lib/firebase';
import { fetchFlowsFromApi, saveFlows } from '@/lib/market-flows-store';
import { entitlementOf } from '@/lib/subscription';
import type { Subscription } from '@/lib/use-subscription';

export function AdminDashboard() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

function Gate() {
  const { user, loading, isAdmin, adminChecked } = useAuth();

  if (loading || (user && !adminChecked)) return <Loading />;

  if (!user) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
        <SignInPanel
          title="لوحة الإدارة"
          subtitle="سجّل دخول بحساب مصرّح له."
        />
      </div>
    );
  }

  // The screen is hidden, but that is presentation only. Every query below is
  // refused server-side by firestore.rules for a non-admin, so a user who
  // forces this branch open in a debugger gets an empty page and a wall of
  // permission errors — which is the intended outcome.
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <h1 className="text-xl font-bold">الصفحة دي مش ليك</h1>
        <p className="mt-2 text-sm text-fg-muted">
          الحساب ده مش مصرّح له بالدخول على لوحة الإدارة.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand"
        >
          روح لدفترك
        </Link>
      </div>
    );
  }

  return <Console />;
}

/**
 * THIS CONSOLE HAD THREE TABS AND NOW HAS NONE — it is one panel.
 *
 * «الصفقات» published a ticker with an entry price and a stop to every
 * signed-in user. That is a recommendation whatever the badge says, and the
 * product states the opposite in three published places: the footer
 * disclaimer, the terms, and the FAQ.
 *
 * «الإعلانات» went next, by the owner's call — a broadcast feed was never what
 * this product is for, and nothing had been published through it. Both
 * collections are denied in firestore.rules; see the note there.
 *
 * The tab bar went with them rather than being left as a single tab labelling
 * the only thing on the page.
 */
function Console() {
  const { user, logout } = useAuth();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-5 lg:py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border-default pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">لوحة الإدارة</h1>
          <p className="num mt-1 text-sm text-fg-muted" dir="ltr">
            {user?.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="rounded-md border border-border-strong px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface-high"
          >
            دفتري
          </Link>
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-md border border-border-default px-4 py-2 text-sm font-semibold text-fg-muted transition-colors hover:bg-surface-high hover:text-fg"
          >
            خروج
          </button>
          {/* Moved here when the shell's own header was removed — it stacked a
              second bar on top of this one and said the app's name twice. */}
          <InstallButton />
          <ThemeToggle />
        </div>
      </header>

      <div className="mt-8 space-y-5">
        <MarketRefreshPanel />
        <UsersPanel />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Market flows
// ---------------------------------------------------------------------------

/**
 * Pulls today's EGX investor flows and stores them.
 *
 * THE FETCH IS SERVER-SIDE, THE WRITE IS NOT. /api/egx-flows exists only
 * because egx.com.eg sends no CORS headers, so the browser cannot read it
 * directly; the route hands back parsed JSON and this component writes it to
 * Firestore under the admin's own credentials. That is why there is no service
 * account anywhere in this project — see the note on the route.
 *
 * A BUTTON RATHER THAN A CRON, FOR NOW, AND DELIBERATELY. EGX answers
 * automated requests with 403 from at least some networks, and whether it
 * answers Vercel is unknown until this is deployed and pressed. A cron that
 * silently 502s every evening would look exactly like a market with no data.
 * One button, one visible error message, and the failure is legible on the
 * first try — then the same route can be put behind a schedule once it is known
 * to work.
 */
function MarketRefreshPanel() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const flows = await fetchFlowsFromApi('Securities');
      await saveFlows(flows, 'Securities');
      setResult(
        `اتخزّنت جلسة ${flows.date} — ` +
          `مصريين ${Math.round(flows.all.egyptian.net).toLocaleString('en-US')}، ` +
          `عرب ${Math.round(flows.all.arab.net).toLocaleString('en-US')}، ` +
          `أجانب ${Math.round(flows.all.foreign.net).toLocaleString('en-US')}`
      );
    } catch (e) {
      // The route's own reason is shown verbatim rather than replaced with
      // «حصل خطأ»: "EGX refused the request (403)" and "could not read three
      // tables" need completely different responses, and only one of them is
      // worth retrying.
      setError(e instanceof Error ? e.message : 'تعذّر التحديث.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-border-default bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-bold">بيانات السوق</h2>
          <p className="mt-1 text-xs leading-relaxed text-fg-muted">
            بيسحب تداولات المستثمرين من البورصة المصرية ويخزّنها لليوم ده. لو
            اتضغط أكتر من مرة في نفس اليوم، آخر مرة هي اللي بتفضل.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={busy}
          className="shrink-0 rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? 'جاري السحب...' : 'اسحب جلسة النهاردة'}
        </button>
      </div>

      {result && (
        <p
          role="status"
          className="mt-4 rounded-md border border-border-strong bg-surface-high p-3 text-sm leading-relaxed"
        >
          {result}
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-md border border-loss-border bg-loss-surface p-3"
        >
          <p className="text-sm font-semibold text-loss">{error}</p>
          <p className="mt-2 text-xs leading-relaxed text-fg-muted">
            البورصة وراها حماية بوت تجارية (F5 Shape) بترد بتحدي JavaScript، فالسحب
            الآلي غالبًا مش هينفع منها. استخدم الإدخال اليدوي تحت.
          </p>
        </div>
      )}

      <ManualFlowsForm onSave={(flows) => saveFlows(flows, 'Securities')} />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

type UserRow = {
  uid: string;
  email: string;
  displayName: string;
  createdAt: Date | null;
  lastSeenAt: Date | null;
  tradeCount: number | null;
  platform: string | null;
  appVersion: string | null;
  /** From users/{uid}/billing/subscription. Null until that read lands. */
  subscription: Subscription | null;
};

/** Firestore hands back a Timestamp; the app's own dates are ISO strings. */
function toDate(value: unknown): Date | null {
  if (value && typeof value === 'object' && 'toDate' in value) {
    try {
      return (value as { toDate: () => Date }).toDate();
    } catch {
      return null;
    }
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function UsersPanel() {
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [activating, setActivating] = useState<UserRow | null>(null);

  /**
   * Activates or ends a subscription by hand.
   *
   * THIS IS THE ONLY WAY TO BECOME A PAYING CUSTOMER RIGHT NOW, and it is
   * deliberate rather than a stopgap that leaked into production: there is no
   * payment gateway wired up, and a checkout button that cannot take money is
   * worse than none. The rules already say only an admin may write this
   * document, so the manual path and the eventual automated one land in exactly
   * the same place through exactly the same check.
   */
  /**
   * Activates or ends a subscription by hand, and RECORDS WHAT WAS PAID.
   *
   * This is the whole payment system right now, and deliberately so: no gateway
   * is wired up, and on Android a digital subscription has to go through Play
   * Billing rather than a card form of ours. The user asks by email, pays
   * however was agreed, and this flips the plan.
   *
   * The note is not decoration. A manual process with no record of the amount,
   * the method or the reference is one that cannot answer «أنا دفعت» three
   * months later — and the rules already reserve a 500-character field for
   * exactly this.
   */
  async function activate(row: UserRow, input: ActivationInput) {
    setBusyUid(row.uid);
    try {
      const until = new Date();
      until.setMonth(until.getMonth() + input.months);

      const stamp = new Date().toISOString().slice(0, 10);
      const note =
        input.months === 0
          ? `أُوقف يدويًا · ${stamp}`
          : [
              `${input.months} شهر`,
              input.amount > 0 ? `${input.amount} ج.م` : null,
              input.method,
              input.reference.trim() === '' ? null : input.reference.trim(),
              stamp,
            ]
              .filter((part) => part !== null)
              .join(' · ')
              .slice(0, 500);

      await setDoc(
        doc(firestore(), 'users', row.uid, 'billing', 'subscription'),
        {
          plan: input.months === 0 ? 'free' : 'pro',
          // The trial's start is immutable and the rules enforce it, so it has
          // to go back exactly as it came.
          trialStartedAt: row.subscription?.trialStartedAt ?? null,
          ...(input.months === 0 ? {} : { proUntil: until }),
          note,
        },
        { merge: false }
      );

      setRows(
        (current) =>
          current?.map((r) =>
            r.uid === row.uid
              ? {
                  ...r,
                  subscription: {
                    plan: input.months === 0 ? 'free' : 'pro',
                    trialStartedAt: r.subscription?.trialStartedAt ?? null,
                    proUntil: input.months === 0 ? null : until,
                    note,
                  },
                }
              : r
          ) ?? null
      );
      setActivating(null);
    } catch {
      window.alert(
        'مقدرش يحفظ. لو المستخدم ده لسه ما فتحش رادار ولا مرة، مفيش مستند اشتراك يتعدّل.'
      );
    } finally {
      setBusyUid(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(firestore(), 'users'));
        const list: UserRow[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            uid: d.id,
            email: typeof data.email === 'string' ? data.email : '—',
            displayName:
              typeof data.displayName === 'string' ? data.displayName : '—',
            createdAt: toDate(data.createdAt),
            lastSeenAt: toDate(data.lastSeenAt),
            tradeCount:
              typeof data.tradeCount === 'number' ? data.tradeCount : null,
            platform: typeof data.platform === 'string' ? data.platform : null,
            appVersion:
              typeof data.appVersion === 'string' ? data.appVersion : null,
            subscription: null,
          };
        });

        // One read per user, in parallel. Fine at this size and honest about
        // it: if the roster ever gets long enough for this to hurt, the answer
        // is a collectionGroup query, not a cache.
        const subs = await Promise.all(
          list.map(async (row) => {
            try {
              const sub = await getDoc(
                doc(firestore(), 'users', row.uid, 'billing', 'subscription')
              );
              if (!sub.exists()) return null;
              const data = sub.data();
              return {
                plan: typeof data.plan === 'string' ? data.plan : null,
                trialStartedAt: toDate(data.trialStartedAt),
                proUntil: toDate(data.proUntil),
                note: typeof data.note === 'string' ? data.note : null,
              } satisfies Subscription;
            } catch {
              return null;
            }
          })
        );
        subs.forEach((sub, i) => {
          list[i].subscription = sub;
        });
        list.sort(
          (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
        );
        if (!cancelled) setRows(list);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) return <ErrorNote>تعذّر تحميل المستخدمين.</ErrorNote>;
  if (rows === null) return <Loading />;

  // Computed here rather than stored: any counter the clients maintain can
  // drift, and these are cheap over a list the page already has in memory.
  const now = Date.now();
  const WEEK = 7 * 86_400_000;
  const since = (date: Date | null, ms: number) =>
    date !== null && now - date.getTime() <= ms;

  const newThisWeek = rows.filter((r) => since(r.createdAt, WEEK)).length;
  const activeThisWeek = rows.filter((r) => since(r.lastSeenAt, WEEK)).length;
  const withTrades = rows.filter((r) => (r.tradeCount ?? 0) > 0).length;

  return (
    <>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="مستخدم مسجّل" value={rows.length} />
        <Metric label="جديد آخر 7 أيام" value={newThisWeek} />
        <Metric label="نشط آخر 7 أيام" value={activeThisWeek} />
        <Metric
          label="سجّل صفقة واحدة على الأقل"
          value={withTrades}
          note={
            withTrades === 0 && rows.length > 0
              ? 'العدّاد بيتحدّث لما المستخدم يفتح الدفتر على المتصفح'
              : undefined
          }
        />
      </dl>

      {/* Profiles only. The rules do not grant an admin read on anybody's
          trades — the count below is a counter the app maintains, not a
          window into the journal. The privacy policy says so in as many
          words, and changing that needs the policy changed first. */}
      <p className="mt-5 text-xs text-fg-subtle">
        بيانات الحسابات بس — صفقات المستخدمين نفسها مقفولة عليهم، وقواعد
        السيرفر مش بتدي الأدمن صلاحية قراءتها.
      </p>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-fg-muted">
          مفيش مستخدمين لسه. أول ما حد يسجّل دخول من التطبيق هيظهر هنا.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border-default">
          <table className="w-full min-w-[46rem] border-collapse text-sm">
            <thead>
              <tr className="bg-surface-high">
                <Th>الاسم</Th>
                <Th>البريد</Th>
                <Th>اشترك</Th>
                <Th>آخر ظهور</Th>
                <Th>صفقات</Th>
                <Th>الباقة</Th>
                <Th>تفعيل</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.uid} className="border-t border-border-default">
                  <Td className="font-semibold">{row.displayName}</Td>
                  <Td className="num" dir="ltr">
                    {row.email}
                  </Td>
                  <Td className="num text-fg-muted">{fmtDate(row.createdAt)}</Td>
                  <Td className="num text-fg-muted">{fmtDate(row.lastSeenAt)}</Td>
                  <Td className="num">{row.tradeCount ?? '—'}</Td>
                  <Td>
                    <PlanBadge subscription={row.subscription} />
                  </Td>
                  <Td>
                    <button
                      type="button"
                      disabled={busyUid === row.uid}
                      onClick={() => setActivating(row)}
                      className="rounded border border-border-strong px-3 py-1 text-xs font-semibold transition-colors hover:bg-surface-high disabled:opacity-40"
                    >
                      فعّل
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activating !== null && (
        <ActivationDialog
          row={activating}
          busy={busyUid === activating.uid}
          onCancel={() => setActivating(null)}
          onConfirm={(input) => void activate(activating, input)}
        />
      )}
    </>
  );
}

type ActivationInput = {
  months: number;
  amount: number;
  method: string;
  reference: string;
};

/** The published prices, so the amount field starts at the right number. */
const PERIOD_OPTIONS = [
  { months: 1, amount: 99, label: 'شهر' },
  { months: 6, amount: 499, label: '6 شهور' },
  { months: 12, amount: 799, label: 'سنة' },
];

const METHODS = ['إنستاباي', 'محفظة موبايل', 'تحويل بنكي', 'كاش', 'أخرى'];

function ActivationDialog({
  row,
  busy,
  onCancel,
  onConfirm,
}: {
  row: UserRow;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (input: ActivationInput) => void;
}) {
  const [months, setMonths] = useState(12);
  const [amount, setAmount] = useState('799');
  const [method, setMethod] = useState(METHODS[0]);
  const [reference, setReference] = useState('');

  const until = new Date();
  until.setMonth(until.getMonth() + months);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-5"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border-default bg-surface p-4 shadow-2xl sm:rounded-2xl sm:p-5"
      >
        <h2 className="text-lg font-bold">تفعيل اشتراك</h2>
        <p className="num mt-1 text-xs text-fg-muted" dir="ltr">
          {row.email}
        </p>

        <fieldset className="mt-4">
          <legend className="text-xs font-semibold text-fg-muted">المدة</legend>
          <div className="mt-2 flex gap-2">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.months}
                type="button"
                onClick={() => {
                  setMonths(option.months);
                  setAmount(String(option.amount));
                }}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
                  months === option.months
                    ? 'border-brand-ink bg-surface-high'
                    : 'border-border-default hover:bg-surface-high'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="mt-4 block text-xs font-semibold text-fg-muted">
          المبلغ المدفوع (ج.م)
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            dir="ltr"
            className="num mt-1.5 w-full rounded-md border border-border-default bg-surface-low px-3 py-2 text-sm outline-none focus:border-brand-ink"
          />
        </label>

        <label className="mt-3 block text-xs font-semibold text-fg-muted">
          طريقة الدفع
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-border-default bg-surface-low px-3 py-2 text-sm outline-none focus:border-brand-ink"
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 block text-xs font-semibold text-fg-muted">
          مرجع التحويل (اختياري)
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            dir="ltr"
            placeholder="رقم العملية"
            className="num mt-1.5 w-full rounded-md border border-border-default bg-surface-low px-3 py-2 text-sm outline-none focus:border-brand-ink"
          />
        </label>

        <p className="mt-4 rounded-md bg-surface-low px-3 py-2 text-xs text-fg-muted">
          هيشتغل لحد{' '}
          <span className="num font-bold text-fg">{fmtDate(until)}</span>
        </p>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border-default px-4 py-2 text-sm font-semibold text-fg-muted transition-colors hover:bg-surface-high hover:text-fg"
          >
            رجوع
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              onConfirm({ months: 0, amount: 0, method: '', reference: '' })
            }
            className="rounded-md border border-loss-border px-4 py-2 text-sm font-semibold text-loss transition-colors hover:bg-loss-surface disabled:opacity-40"
          >
            أوقف الاشتراك
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              onConfirm({
                months,
                amount: Number(amount.replace(/,/g, '')) || 0,
                method,
                reference,
              })
            }
            className="rounded-md bg-brand px-5 py-2 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy ? 'بيتحفظ…' : 'فعّل'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** What the account is on right now, computed the same way both clients do. */
function PlanBadge({ subscription }: { subscription: Subscription | null }) {
  const e = entitlementOf({
    storedPlan: subscription?.plan ?? null,
    trialStartedAt: subscription?.trialStartedAt ?? null,
    proUntil: subscription?.proUntil ?? null,
    now: new Date(),
  });

  if (e.plan === 'pro') {
    return (
      <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-on-brand">
        Pro
        {subscription?.proUntil && (
          <span className="num ps-1 font-normal opacity-80">
            {fmtDate(subscription.proUntil)}
          </span>
        )}
      </span>
    );
  }
  if (e.plan === 'trial') {
    return (
      <span className="rounded-full border border-border-strong px-2 py-0.5 text-[11px] font-semibold">
        تجربة · <span className="num">{e.trialDaysLeft}</span>ي
      </span>
    );
  }
  return (
    <span className="text-[11px] text-fg-subtle">
      {e.trialExpired ? 'انتهت التجربة' : 'مجاني'}
    </span>
  );
}

function fmtDate(value: Date | null): string {
  if (!value) return '—';
  const y = String(value.getFullYear()).padStart(4, '0');
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
}

// ---------------------------------------------------------------------------

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th scope="col" className="px-4 py-3 text-start font-semibold">
      {children}
    </th>
  );
}

function Td({
  children,
  className = '',
  dir,
}: {
  children: React.ReactNode;
  className?: string;
  dir?: 'ltr';
}) {
  return (
    <td dir={dir} className={`px-4 py-3 ${className}`}>
      {children}
    </td>
  );
}

function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note?: string;
}) {
  return (
    <div className="rounded-lg border border-border-default bg-surface p-4 sm:p-5">
      <dt className="text-sm text-fg-muted">{label}</dt>
      <dd className="num mt-1.5 text-2xl font-bold">{value}</dd>
      {note && <p className="mt-1.5 text-xs text-fg-subtle">{note}</p>}
    </div>
  );
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-md border border-loss-border bg-loss-surface p-4 text-sm font-semibold text-loss"
    >
      {children}
    </p>
  );
}

function Loading() {
  return (
    <div className="space-y-3" role="status" aria-busy="true" aria-label="جاري التحميل">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-14 animate-pulse rounded-md bg-surface-high" />
      ))}
    </div>
  );
}
