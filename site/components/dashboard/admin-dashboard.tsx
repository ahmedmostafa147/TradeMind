'use client';

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { SignInPanel } from '@/components/dashboard/sign-in-panel';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { firestore } from '@/lib/firebase';

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

type Tab = 'users' | 'announcements' | 'signals';

function Console() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('users');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'users', label: 'المستخدمين' },
    { id: 'announcements', label: 'الإعلانات' },
    { id: 'signals', label: 'الصفقات' },
  ];

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 lg:py-14">
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
        </div>
      </header>

      <nav aria-label="أقسام الإدارة" className="mt-6">
        <ul className="flex flex-wrap gap-2">
          {tabs.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setTab(item.id)}
                aria-current={tab === item.id ? 'page' : undefined}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                  tab === item.id
                    ? 'bg-brand text-on-brand'
                    : 'border border-border-default text-fg-muted hover:bg-surface-high'
                }`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-8">
        {tab === 'users' && <UsersPanel />}
        {tab === 'announcements' && <AnnouncementsPanel />}
        {tab === 'signals' && <SignalsPanel />}
      </div>
    </div>
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
          };
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
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                <Th>النسخة</Th>
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
                  <Td className="num text-fg-muted">{row.appVersion ?? '—'}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
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
// Announcements and signals — same shape, different collection
// ---------------------------------------------------------------------------

type Post = {
  id: string;
  title: string;
  body: string;
  createdAt: Date | null;
};

function useCollection(name: 'announcements' | 'signals') {
  const [items, setItems] = useState<Post[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const snap = await getDocs(
        query(collection(firestore(), name), orderBy('createdAt', 'desc'))
      );
      setItems(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: typeof data.title === 'string' ? data.title : '',
            body: typeof data.body === 'string' ? data.body : '',
            createdAt: toDate(data.createdAt),
          };
        })
      );
    } catch {
      setFailed(true);
    }
  }, [name]);

  useEffect(() => {
    void load();
  }, [load]);

  return { items, failed, reload: load };
}

function AnnouncementsPanel() {
  return (
    <PostsPanel
      name="announcements"
      heading="إعلان جديد"
      titleLabel="العنوان"
      bodyLabel="النص"
      hint="بيظهر لكل مستخدم مسجّل دخول."
    />
  );
}

function SignalsPanel() {
  return (
    <PostsPanel
      name="signals"
      heading="نزّل صفقة"
      titleLabel="السهم أو العنوان"
      bodyLabel="التفاصيل"
      hint="بيظهر لكل مستخدم مسجّل دخول. اكتب التفاصيل كاملة — الأسعار والاستوب والسبب."
    />
  );
}

function PostsPanel({
  name,
  heading,
  titleLabel,
  bodyLabel,
  hint,
}: {
  name: 'announcements' | 'signals';
  heading: string;
  titleLabel: string;
  bodyLabel: string;
  hint: string;
}) {
  const { items, failed, reload } = useCollection(name);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit(item: Post) {
    setEditingId(item.id);
    setTitle(item.title);
    setBody(item.body);
    setError(null);
    // The form is above the list on a narrow screen, so without this the page
    // appears not to have reacted to the click at all.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setTitle('');
    setBody('');
    setError(null);
  }

  async function publish() {
    if (!title.trim() || !body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      if (editingId === null) {
        await addDoc(collection(firestore(), name), {
          title: title.trim(),
          body: body.trim(),
          createdAt: serverTimestamp(),
        });
      } else {
        // merge, and `createdAt` deliberately not resent: an edit must not
        // repost the item. Overwriting it would jump a months-old announcement
        // back to the top of every reader's feed for a fixed typo.
        await setDoc(
          doc(firestore(), name, editingId),
          {
            title: title.trim(),
            body: body.trim(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
      cancelEdit();
      await reload();
    } catch {
      setError(
        editingId === null
          ? 'تعذّر النشر. اتأكد إن حسابك مصرّح له.'
          : 'تعذّر حفظ التعديل. اتأكد إن حسابك مصرّح له.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    // Deleting published content is not undoable and there is no trash, so it
    // asks first. The browser dialog is deliberate — a custom modal here would
    // be more code guarding a rarer action than the confirm it replaces.
    if (!window.confirm('تمسح ده نهائيًا؟')) return;
    try {
      await deleteDoc(doc(firestore(), name, id));
      await reload();
    } catch {
      setError('تعذّر الحذف.');
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <div
        className={`h-fit rounded-lg border bg-surface p-6 lg:sticky lg:top-6 ${
          editingId === null ? 'border-border-default' : 'border-brand-ink'
        }`}
      >
        <h2 className="font-bold">
          {editingId === null ? heading : 'تعديل منشور'}
        </h2>
        <p className="mt-1 text-xs text-fg-muted">
          {editingId === null
            ? hint
            : 'التعديل مش بيغيّر تاريخ النشر، فالمنشور مش هيرجع لأول القايمة تاني.'}
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor={`${name}-title`} className="text-sm font-semibold">
              {titleLabel}
            </label>
            <input
              id={`${name}-title`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-2 w-full rounded-md border border-border-default bg-surface-low px-3 py-2 outline-none focus:border-brand-ink"
            />
          </div>
          <div>
            <label htmlFor={`${name}-body`} className="text-sm font-semibold">
              {bodyLabel}
            </label>
            <textarea
              id={`${name}-body`}
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="mt-2 w-full rounded-md border border-border-default bg-surface-low px-3 py-2 outline-none focus:border-brand-ink"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm font-semibold text-loss">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || !title.trim() || !body.trim()}
              onClick={() => void publish()}
              className="flex-1 rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? '...' : editingId === null ? 'نشر' : 'احفظ التعديل'}
            </button>
            {editingId !== null && (
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-md border border-border-strong px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-surface-high"
              >
                إلغاء
              </button>
            )}
          </div>
        </div>
      </div>

      <div>
        {failed && <ErrorNote>تعذّر التحميل.</ErrorNote>}
        {!failed && items === null && <Loading />}
        {items !== null && items.length === 0 && (
          <p className="text-sm text-fg-muted">مفيش حاجة منشورة لسه.</p>
        )}
        {items?.map((item) => (
          <article
            key={item.id}
            className={`mb-3 rounded-lg border bg-surface p-5 ${
              editingId === item.id ? 'border-brand-ink' : 'border-border-default'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-bold">{item.title}</h3>
              <div className="flex shrink-0 gap-3">
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  className="text-xs font-semibold text-brand-ink underline-offset-4 hover:underline"
                >
                  تعديل
                </button>
                <button
                  type="button"
                  onClick={() => void remove(item.id)}
                  className="text-xs font-semibold text-loss underline-offset-4 hover:underline"
                >
                  حذف
                </button>
              </div>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-fg-muted">
              {item.body}
            </p>
            <p className="num mt-3 text-xs text-fg-subtle">
              {fmtDate(item.createdAt)}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
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
    <div className="rounded-lg border border-border-default bg-surface p-5">
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
