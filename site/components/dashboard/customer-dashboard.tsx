'use client';

import { collection, getDocs } from 'firebase/firestore';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { SignInPanel } from '@/components/dashboard/sign-in-panel';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { firestore } from '@/lib/firebase';
import { dateLabel, money, percent, rMultiple, signedMoney } from '@/lib/format';
import {
  decodeTrade,
  metricsOf,
  summarise,
  type JournalSummary,
  type Trade,
} from '@/lib/trade';

export function CustomerDashboard() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

function Gate() {
  const { user, loading } = useAuth();

  if (loading) return <Loading />;

  if (!user) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
        <SignInPanel
          title="دفترك على المتصفح"
          subtitle="سجّل دخول بنفس الحساب اللي على التطبيق، وصفقاتك هتظهر هنا على شاشة أكبر."
        />
      </div>
    );
  }

  return <Journal />;
}

function Journal() {
  const { user, logout, isAdmin } = useAuth();
  const [trades, setTrades] = useState<Trade[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const snap = await getDocs(
          collection(firestore(), 'users', user.uid, 'trades')
        );
        // One malformed document must not empty the whole journal, so decoding
        // is per-record and a failure drops just that record — the same rule
        // the app's own restore path follows.
        const decoded = snap.docs
          .map((d) => decodeTrade(d.data()))
          .filter((t): t is Trade => t !== null)
          .sort((a, b) => b.entryDate.getTime() - a.entryDate.getTime());
        if (!cancelled) setTrades(decoded);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Capital lives in the app's local settings and is never synced, so risk
  // percent cannot be computed here. Every figure shown below is capital-free
  // — P&L, R and win rate all are — rather than rendered against a guess.
  const summary: JournalSummary | null = trades ? summarise(trades, 0) : null;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 lg:py-14">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border-default pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">دفتر صفقاتك</h1>
          <p className="num mt-1 text-sm text-fg-muted" dir="ltr">
            {user?.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-md border border-border-strong px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface-high"
            >
              لوحة الإدارة
            </Link>
          )}
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-md border border-border-default px-4 py-2 text-sm font-semibold text-fg-muted transition-colors hover:bg-surface-high hover:text-fg"
          >
            تسجيل الخروج
          </button>
        </div>
      </header>

      {failed && (
        <p
          role="alert"
          className="mt-8 rounded-md border border-loss-border bg-loss-surface p-4 text-sm font-semibold text-loss"
        >
          تعذّر تحميل صفقاتك. جرّب تحدّث الصفحة.
        </p>
      )}

      {!failed && trades === null && <Loading />}

      {trades !== null && trades.length === 0 && (
        <div className="mt-16 text-center">
          <h2 className="text-lg font-bold">مفيش صفقات لسه</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">
            سجّل صفقاتك من التطبيق على تليفونك، وهتلاقيها هنا على طول. الصفحة دي
            بتقرا نفس الحساب.
          </p>
        </div>
      )}

      {summary && trades !== null && trades.length > 0 && (
        <>
          <dl className="mt-8 grid gap-px overflow-hidden rounded-lg border border-border-default bg-border-default sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="صافي الربح/الخسارة"
              value={signedMoney(summary.totalPnl)}
              tone={summary.totalPnl > 0 ? 'win' : summary.totalPnl < 0 ? 'loss' : undefined}
            />
            <Stat label="نسبة النجاح" value={percent(summary.winRate)} />
            <Stat label="متوسط R" value={rMultiple(summary.averageR)} />
            <Stat
              label="معامل الربح"
              value={
                summary.profitFactor === null
                  ? '—'
                  : summary.profitFactor.toFixed(2)
              }
            />
          </dl>

          <p className="mt-3 text-xs text-fg-subtle">
            <span className="num">{summary.closedCount}</span> مقفولة ·{' '}
            <span className="num">{summary.openCount}</span> مفتوحة ·{' '}
            <span className="num">{summary.plannedCount}</span> مخططة
          </p>

          <TradesTable trades={trades} />
        </>
      )}
    </div>
  );
}

function TradesTable({ trades }: { trades: Trade[] }) {
  const statusLabel: Record<Trade['status'], string> = {
    planned: 'مخططة',
    open: 'مفتوحة',
    closed: 'مغلقة',
    cancelled: 'ملغاة',
  };

  return (
    // The table is the one block here that can exceed a narrow viewport, so it
    // scrolls inside its own wrapper and the page body never does.
    <div className="mt-8 overflow-x-auto rounded-lg border border-border-default">
      <table className="w-full min-w-[46rem] border-collapse text-sm">
        <thead>
          <tr className="bg-surface-high text-start">
            <Th>السهم</Th>
            <Th>الحالة</Th>
            <Th>الدخول</Th>
            <Th>الاستوب</Th>
            <Th>الكمية</Th>
            <Th>الربح/الخسارة</Th>
            <Th>R</Th>
            <Th>التاريخ</Th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => {
            const m = metricsOf(trade, 0);
            const tone =
              m.result === 'win'
                ? 'text-win'
                : m.result === 'loss'
                  ? 'text-loss'
                  : '';
            return (
              <tr key={trade.id} className="border-t border-border-default">
                <Td className="num font-bold">{trade.ticker || '—'}</Td>
                <Td className="text-fg-muted">{statusLabel[trade.status]}</Td>
                <Td className="num">{money(trade.entryPrice)}</Td>
                <Td className="num">{money(trade.stopPrice)}</Td>
                <Td className="num">{trade.quantity || '—'}</Td>
                <Td className={`num font-bold ${tone}`}>{signedMoney(m.pnl)}</Td>
                <Td className={`num font-bold ${tone}`}>
                  {rMultiple(m.rMultiple)}
                </Td>
                <Td className="num text-fg-muted">{dateLabel(trade.entryDate)}</Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

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
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'win' | 'loss';
}) {
  return (
    <div className="bg-surface p-5">
      <dt className="text-sm text-fg-muted">{label}</dt>
      <dd
        className={`num mt-1 text-xl font-bold ${
          tone === 'win' ? 'text-win' : tone === 'loss' ? 'text-loss' : ''
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function Loading() {
  return (
    <div
      className="mt-10 space-y-3"
      role="status"
      aria-busy="true"
      aria-label="جاري التحميل"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-md bg-surface-high"
        />
      ))}
    </div>
  );
}
