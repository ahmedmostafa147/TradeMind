'use client';

import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ManualFlowsForm } from '@/components/dashboard/manual-flows-form';
import { SignInPanel } from '@/components/dashboard/sign-in-panel';
import { InstallButton } from '@/components/pwa';
import { ThemeToggle } from '@/components/theme-toggle';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { firestore } from '@/lib/firebase';
import { fetchFlowsFromApi, saveFlows } from '@/lib/market-flows-store';
import { site } from '@/lib/site';
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
 * THE SCHEDULED COLLECTOR IS NOT THIS BUTTON — IT IS `worker/`.
 *
 * This panel was the only way to get a session in, and the note here used to say
 * a cron could be pointed at the same route "once it is known to work". It is now
 * known NOT to work: egx.com.eg sits behind F5 Shape Bot Defense, which answers
 * any HTTP client with an obfuscated JavaScript challenge that has to be
 * EXECUTED. No header and no copied cookie gets past it, by design — that is what
 * the product is for. It was tried from two networks and failed differently in
 * each (403 locally, 200-with-challenge from Vercel).
 *
 * `worker/` does it with a real browser (Playwright, on Cloud Run) and writes the
 * same document through the Admin SDK. See worker/README.md.
 *
 * THE BUTTON AND THE MANUAL FORM BOTH STAY. The button because if EGX ever drops
 * Shape it starts working again and the failure message is a useful probe either
 * way; the form because a scraper against a site that does not want to be scraped
 * is one layout change from silence, and «السوق» is a paid surface that cannot go
 * blank for a week while someone fixes a selector.
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
            السحب اليومي بيشتغل لوحده من الوركر بعد الجلسة. الزرار ده محاولة سحب
            من المتصفح — البورصة وراها حماية بوت فغالبًا بيفشل، وتحته الإدخال
            اليدوي. لو اتحفظت أكتر من مرة في نفس اليوم، آخر مرة هي اللي بتفضل.
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
   *
   * ── `merge: true`, AND `trialStartedAt` IS NEVER SENT ──────────────────────
   *
   * THIS WRITE USED TO FAIL FOR EVERY REAL USER, and the catch below blamed the
   * wrong thing for it.
   *
   * It sent `merge: false` with `trialStartedAt` read back out of state. The
   * rule requires that field to be unchanged —
   * `request.resource.data.trialStartedAt == resource.data.trialStartedAt` — and
   * the stored value is `request.time`, a server stamp carrying SUB-MILLISECOND
   * precision. State held it as a JavaScript `Date`, which cannot: `toDate()`
   * truncates to whole milliseconds. Writing that back produced a timestamp a
   * few hundred microseconds off the stored one, the equality failed, and
   * Firestore returned permission-denied — for roughly 999 accounts in 1000,
   * every one that had ever started a trial. Nobody could be made a paying
   * customer at all.
   *
   * Merging and omitting the field is the fix, not re-reading it with better
   * precision: `request.resource.data` under a merge is the document as it will
   * be AFTER the write, so an omitted field still satisfies the equality using
   * the value already on the server. The client never has to reproduce a
   * timestamp it cannot represent.
   *
   * `proUntil` is then explicitly deleted when stopping a subscription, because
   * a merge would otherwise leave a future date sitting on a `free` plan.
   */
  async function activate(row: UserRow, input: ActivationInput) {
    setBusyUid(row.uid);
    try {
      const until = new Date();
      until.setMonth(until.getMonth() + input.months);

      const stopping = input.months === 0;
      const stamp = new Date().toISOString().slice(0, 10);
      const note = stopping
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

      // `row.subscription === null` means the read found no document, so this
      // write is a CREATE and the admin-create rule applies — which requires
      // `trialStartedAt` and requires it to be the server's own clock. Sending
      // it only in that branch is what keeps the update branch omitting it.
      const opening = row.subscription === null;

      await setDoc(
        doc(firestore(), 'users', row.uid, 'billing', 'subscription'),
        {
          plan: stopping ? 'free' : 'pro',
          proUntil: stopping ? deleteField() : until,
          note,
          ...(opening ? { trialStartedAt: serverTimestamp() } : {}),
        },
        { merge: true }
      );

      setRows(
        (current) =>
          current?.map((r) =>
            r.uid === row.uid
              ? {
                  ...r,
                  subscription: {
                    plan: stopping ? 'free' : 'pro',
                    // On a create the server stamped it just now; the exact
                    // value only matters to the rules, and the next page load
                    // reads the real one.
                    trialStartedAt:
                      r.subscription?.trialStartedAt ??
                      (opening ? new Date() : null),
                    proUntil: stopping ? null : until,
                    note,
                  },
                }
              : r
          ) ?? null
      );
      setActivating(null);
    } catch {
      // The old copy here guessed at a cause — «لو المستخدم ده لسه ما فتحش رادار
      // ولا مرة» — and that guess was wrong for the failure that was actually
      // happening on every attempt. Say what is known and nothing more.
      window.alert(
        'مقدرش يحفظ الاشتراك. اتأكد إن حسابك أدمن وإن النت شغّال، وجرّب تاني.'
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

      {/* EVERY ACCOUNT, not a window on one.
          It was filtered to accounts created on or after a launch date, to keep
          pre-launch development accounts out of a public figure. The owner's
          call is that the published number is simply how many people are on
          Radar — and the filter was worse than useless in practice, because
          real users had signed up the day BEFORE the recorded launch date, so
          it was hiding traders rather than hiding us. */}
      <PublishedCount value={rows.length} />

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
                {/* «اشترك» before this, which in a table that also has a
                    «الباقة» column reads as the date they started PAYING. It is
                    `createdAt` — when the account was made. */}
                <Th>سجّل</Th>
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
                  {/* `.num` GOES ON A SPAN, NEVER ON THE CELL — see the note on
                      Td below. It used to be on all four of these and it took
                      the table apart. */}
                  <Td>
                    <span className="num">{row.email}</span>
                  </Td>
                  <Td className="text-fg-muted">
                    <span className="num">{fmtDate(row.createdAt)}</span>
                  </Td>
                  <Td className="text-fg-muted">
                    <span className="num">{fmtDate(row.lastSeenAt)}</span>
                  </Td>
                  <Td>
                    <span className="num">{row.tradeCount ?? '—'}</span>
                  </Td>
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
      <span className="inline-block whitespace-nowrap rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-on-brand">
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
      /* WHITESPACE-NOWRAP IS WHAT KEEPS THIS A PILL. The `.num` span inside is
         its own bidi-isolated box, so the text after it is a separate wrap
         opportunity — and in a narrow column the line broke there, leaving the
         last character alone on a second line with the rounded border drawn
         around the wreckage.

         And it said «ي», not «يوم». One letter is not an abbreviation of
         anything a reader can recover; «تجربة · 14 ي» reads as a typo. */
      <span className="inline-block whitespace-nowrap rounded-full border border-border-strong px-2 py-0.5 text-[11px] font-semibold">
        تجربة · <span className="num">{e.trialDaysLeft}</span> يوم
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

/**
 * A table cell.
 *
 * ── NEVER PASS `num` IN `className`. ────────────────────────────────────────
 *
 * `.num` in globals.css sets `display: inline-block` along with the LTR
 * direction, and that lands HERE, on the `<td>` — which stops the cell being a
 * `table-cell` and takes it out of the table's column layout entirely.
 *
 * MEASURED, because the symptom does not look like a display bug. With `.num`
 * on four of the seven cells, `getComputedStyle` reported
 * `table-cell, inline-block, inline-block, inline-block, inline-block,
 * table-cell, table-cell`, the header cells' right edges were
 * [1184, 1030, 507, 392, 303, …] while the first row's were
 * [1184, 1030, 877, 767, 657, …], and — the giveaway — THE SAME COLUMN LANDED
 * AT A DIFFERENT X ON EVERY ROW (877, 819, 830), because each escaped cell was
 * sized by its own content instead of by the column. It reads as "the table is
 * a bit off" rather than "these cells are not cells".
 *
 * CLAUDE.md §7 already said to put `.num` on the number alone inside a
 * `<span>`. It was said in prose, and it was broken here, in the tag stats
 * table on the customer dashboard, and in the market flows table — three
 * places. `test/site_copy_guard_test.dart` enforces it now.
 */
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

/**
 * Publishes the since-launch account count to the landing page.
 *
 * ── WHY THIS WRITES BY ITSELF INSTEAD OF BEHIND A BUTTON ────────────────────
 *
 * The figure used to be a constant in site.ts with a comment asking somebody to
 * come back and update it after launch. Nobody was ever going to, and that is
 * not a discipline problem — a number that needs a human to remember it is a
 * number that is wrong most of the time, in whichever direction happens to
 * flatter. A button would have exactly the same defect with an extra click.
 *
 * So opening this page republishes. The write is one document, it costs one
 * operation per admin visit, and the count it publishes was already computed
 * from rows the page had loaded anyway.
 *
 * ── WHAT IT COSTS, STATED RATHER THAN HIDDEN ────────────────────────────────
 *
 * The landing page is therefore as fresh as the last time an admin looked at
 * this screen. That is a real limitation and the line below says so out loud,
 * with the published number and its date, so a stale figure is visible HERE —
 * on the one screen whose visitor can fix it — rather than only on the public
 * page where nobody would notice.
 *
 * The alternatives were a Cloud Function (needs the Blaze plan) or a server
 * route with firebase-admin and a service account (a dependency this project
 * has deliberately not taken on — firestore.rules says so in as many words).
 * Neither is worth taking on for a marketing line.
 *
 * A FAILED WRITE IS SHOWN, NOT SWALLOWED. It is not worth an alert and it
 * blocks nothing, but a publish that silently stops working would leave the
 * public number frozen at whatever it was — which is the failure mode this
 * whole mechanism exists to end.
 */
function PublishedCount({ value }: { value: number }) {
  const [state, setState] = useState<'saving' | 'done' | 'failed'>('saving');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await setDoc(doc(firestore(), 'publicStats', 'counts'), {
          userCount: value,
          // The server's clock. firestore.rules REQUIRES this to equal
          // request.time, so a client-supplied date is refused outright —
          // deliberately, because this stamp is the only thing telling a reader
          // whether the number beside it is current.
          //
          // `since` is no longer written. The rule still PERMITS the key —
          // `hasOnly` is a whitelist, not a requirement — and it is left
          // permitted rather than tightened in the same breath, because
          // narrowing the rule before this code is live would make the
          // production build's publish fail instead.
          updatedAt: serverTimestamp(),
        });
        if (!cancelled) setState('done');
      } catch {
        if (!cancelled) setState('failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <p className="mt-3 text-xs text-fg-subtle">
      {state === 'failed' ? (
        <span className="text-loss">
          مقدرش ينشر العدد على الصفحة الرئيسية. الرقم القديم لسه معروض هناك.
        </span>
      ) : (
        <>
          منشور على الصفحة الرئيسية:{' '}
          <span className="num font-bold text-fg">{value}</span> متداول
          {state === 'saving' ? ' — بيتحدّث…' : ' — اتحدّث دلوقتي'}
        </>
      )}
      {'. '}
      بيتحدّث كل مرة تفتح الصفحة دي.
    </p>
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
