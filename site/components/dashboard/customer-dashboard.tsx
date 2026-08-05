'use client';

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { EquityChart, MonthlyBars } from '@/components/dashboard/charts';
import { SignInPanel } from '@/components/dashboard/sign-in-panel';
import { TodayPanel } from '@/components/dashboard/today-panel';
import { TradeForm, type TradeDraft } from '@/components/dashboard/trade-form';
import { UpdatesPanel } from '@/components/dashboard/updates-panel';
import { WatchlistPanel } from '@/components/dashboard/watchlist-panel';
import {
  analyse,
  MONTH_NAMES,
  WEEKDAY_NAMES,
  type Analytics,
  type TagStat,
} from '@/lib/analytics';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { checklistCompletion } from '@/lib/checklist';
import { firestore } from '@/lib/firebase';
import { dateLabel, money, percent, rMultiple, signedMoney } from '@/lib/format';
import { useAccountSettings, type SettingsSource } from '@/lib/account-settings';
import { decodePost, sortPosts, type Post } from '@/lib/posts';
import { parseNumber } from '@/lib/risk-math';
import {
  averageRiskScore,
  GRADE_LABELS,
  riskScoreOf,
  SCORE_COMPONENTS,
} from '@/lib/risk-score';
import { decodeTrade, encodeTrade, metricsOf, type Trade } from '@/lib/trade';
import { updateCounts, upsertProfile } from '@/lib/user-profile';
import {
  decodeWatchlistItem,
  encodeWatchlistItem,
  toPlannedTrade,
  type WatchlistItem,
} from '@/lib/watchlist';

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

type Tab =
  | 'today'
  | 'overview'
  | 'analytics'
  | 'trades'
  | 'watchlist'
  | 'updates';
type View = { kind: 'list' } | { kind: 'new'; seed?: Trade } | { kind: 'edit'; trade: Trade };

function Journal() {
  const { user, logout, isAdmin } = useAuth();
  const { settings, update, source: settingsSource } = useAccountSettings(user);

  const [trades, setTrades] = useState<Trade[] | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<View>({ kind: 'list' });
  const [tab, setTab] = useState<Tab>('today');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [tradeSnap, watchSnap] = await Promise.all([
        getDocs(collection(firestore(), 'users', user.uid, 'trades')),
        getDocs(collection(firestore(), 'users', user.uid, 'watchlist')),
      ]);
      // One malformed document must not empty the whole journal, so decoding
      // is per-record and a failure drops just that record — the same rule the
      // app's own restore path follows.
      const decodedTrades = tradeSnap.docs
        .map((d) => decodeTrade(d.data()))
        .filter((t): t is Trade => t !== null)
        .sort((a, b) => b.entryDate.getTime() - a.entryDate.getTime());
      const decodedWatch = watchSnap.docs
        .map((d) => decodeWatchlistItem(d.data()))
        .filter((w): w is WatchlistItem => w !== null);

      setTrades(decodedTrades);
      setWatchlist(decodedWatch);

      // Recomputed from the full collections on every load, so the admin's
      // counters self-correct even for trades that were added on the phone —
      // which is what finally makes that column show a number instead of «—».
      // Not awaited: it is telemetry for the operator, not the user's request.
      void updateCounts(
        user.uid,
        user,
        decodedTrades.length,
        decodedWatch.length
      );
    } catch {
      setFailed(true);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Registers the account, once per session.
   *
   * Separate from `load` because it must run even if the journal read fails —
   * a user whose trades could not be fetched still exists and still belongs in
   * the operator's list.
   */
  useEffect(() => {
    if (user) void upsertProfile(user);
  }, [user]);

  /**
   * The operator's feed. Read separately and failure-tolerantly: a denied or
   * empty announcements collection must not blank out the journal, which is the
   * thing the user actually came for.
   */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const ann = await getDocs(collection(firestore(), 'announcements'));
        if (cancelled) return;
        setPosts(sortPosts(ann.docs.map((d) => decodePost(d.id, d.data()))));
      } catch {
        // Nothing published, or the rules said no. Either way the tab shows
        // its empty state rather than an error the user cannot act on.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  /**
   * Writes one trade the way the app writes it.
   *
   * `merge: true` and the document keyed by the trade's own id, both matching
   * FirestoreSyncService.pushTrades — so a trade saved here and the same trade
   * saved from the phone land on the same document instead of forking into two.
   * Merge also means the fields this form does not touch (timeline entries,
   * screenshot paths) survive an edit made from the browser.
   */
  async function saveTrade(draft: TradeDraft) {
    if (!user) return;
    await setDoc(
      doc(firestore(), 'users', user.uid, 'trades', draft.id),
      { ...encodeTrade(draft), updatedAt: serverTimestamp() },
      { merge: true }
    );
    await load();
    setView({ kind: 'list' });
  }

  async function saveWatch(item: WatchlistItem) {
    if (!user) return;
    await setDoc(
      doc(firestore(), 'users', user.uid, 'watchlist', item.id),
      { ...encodeWatchlistItem(item), updatedAt: serverTimestamp() },
      { merge: true }
    );
    await load();
  }

  async function removeDoc(
    kind: 'trades' | 'watchlist',
    id: string,
    label: string
  ) {
    if (!user) return;
    // Not undoable and there is no trash, so it asks first.
    if (!window.confirm(`تمسح ${label} نهائيًا؟ مش هينفع ترجعها.`)) return;
    setBusyId(id);
    try {
      await deleteDoc(doc(firestore(), 'users', user.uid, kind, id));
      await load();
    } catch {
      setFailed(true);
    } finally {
      setBusyId(null);
    }
  }

  const stats: Analytics | null = useMemo(
    () => (trades ? analyse(trades, settings.capital, checklistCompletion) : null),
    [trades, settings.capital]
  );

  const avgDiscipline = useMemo(
    () =>
      trades === null
        ? null
        : averageRiskScore(trades, settings.capital, settings.maxRiskPercent),
    [trades, settings.capital, settings.maxRiskPercent]
  );

  if (view.kind !== 'list') {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10 lg:py-14">
        <h1 className="text-2xl font-bold tracking-tight">
          {view.kind === 'new' ? 'صفقة جديدة' : `تعديل ${view.trade.ticker}`}
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          بتتحفظ على حسابك، وهتلاقيها على التطبيق كمان.
        </p>
        <div className="mt-8">
          <TradeForm
            // Same reason as the settings panel's key: the form seeds its
            // calculator from these once, in useState, and they arrive from the
            // account asynchronously. Opening the form in the first moments
            // after load would otherwise size the position against the 17,000
            // default. Remounting cannot interrupt anyone — this view and the
            // settings bar are never on screen together, so the only time these
            // values change while the form exists is that initial read.
            key={`${settings.capital}-${settings.maxRiskPercent}`}
            initial={view.kind === 'edit' ? view.trade : (view.seed ?? null)}
            isEdit={view.kind === 'edit'}
            accountCapital={settings.capital}
            accountMaxRisk={settings.maxRiskPercent}
            onCancel={() => setView({ kind: 'list' })}
            onSave={saveTrade}
          />
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'today', label: 'قرار اليوم' },
    { id: 'overview', label: 'نظرة عامة' },
    { id: 'analytics', label: 'التحليلات' },
    { id: 'trades', label: 'الصفقات', badge: trades?.length },
    { id: 'watchlist', label: 'قائمة المراقبة', badge: watchlist.length },
    { id: 'updates', label: 'المستجدات', badge: posts.length },
  ];

  const hasTrades = trades !== null && trades.length > 0;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 lg:py-14">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border-default pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">دفتر صفقاتك</h1>
          <p className="num mt-1 text-sm text-fg-muted" dir="ltr">
            {user?.email}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setView({ kind: 'new' })}
            className="rounded-md bg-brand px-5 py-2 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90"
          >
            + صفقة جديدة
          </button>
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
            خروج
          </button>
        </div>
      </header>

      <SettingsBar
        settings={settings}
        onChange={update}
        source={settingsSource}
      />

      {failed && (
        <p
          role="alert"
          className="mt-6 rounded-md border border-loss-border bg-loss-surface p-4 text-sm font-semibold text-loss"
        >
          تعذّر تحميل بياناتك. جرّب تحدّث الصفحة.
        </p>
      )}

      {!failed && trades === null && <Loading />}

      {trades !== null && (
        <>
          <nav aria-label="أقسام الدفتر" className="mt-6">
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
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="num ms-1.5 opacity-70">{item.badge}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-8">
            {tab === 'today' && (
              <TodayPanel
                trades={trades}
                capital={settings.capital}
                maxRiskPercent={settings.maxRiskPercent}
                waitingThresholdDays={settings.waitingThresholdDays}
                onEdit={(trade) => setView({ kind: 'edit', trade })}
              />
            )}

            {tab === 'overview' &&
              (hasTrades && stats ? (
                <Overview stats={stats} avgDiscipline={avgDiscipline} />
              ) : (
                <EmptyJournal onAdd={() => setView({ kind: 'new' })} />
              ))}

            {tab === 'analytics' &&
              (hasTrades && stats ? (
                <AnalyticsTab stats={stats} avgDiscipline={avgDiscipline} />
              ) : (
                <EmptyJournal onAdd={() => setView({ kind: 'new' })} />
              ))}

            {tab === 'trades' &&
              (hasTrades ? (
                <TradesTable
                  trades={trades}
                  capital={settings.capital}
                  maxRiskPercent={settings.maxRiskPercent}
                  busyId={busyId}
                  onEdit={(trade) => setView({ kind: 'edit', trade })}
                  onDelete={(trade) =>
                    void removeDoc('trades', trade.id, `صفقة ${trade.ticker}`)
                  }
                />
              ) : (
                <EmptyJournal onAdd={() => setView({ kind: 'new' })} />
              ))}

            {tab === 'updates' && <UpdatesPanel posts={posts} />}

            {tab === 'watchlist' && (
              <WatchlistPanel
                items={watchlist}
                busyId={busyId}
                onSave={saveWatch}
                onDelete={(item) =>
                  void removeDoc('watchlist', item.id, `${item.ticker} من المراقبة`)
                }
                onConvert={(item) =>
                  setView({ kind: 'new', seed: toPlannedTrade(item) })
                }
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Capital and the risk limit — the account's, and labelled with where the
 * numbers on screen actually came from.
 *
 * These are stored on the account now (`users/{uid}/settings/risk`) and the app
 * reads and writes the same document, so a change here reaches the phone and a
 * change on the phone reaches here. The label still matters: until the read
 * lands, or when it fails offline, what is displayed is this browser's cached
 * copy — and presenting a cache as the account's rule is the exact thing that
 * made the old browser-only version misleading.
 */
function SettingsBar({
  settings,
  onChange,
  source,
}: {
  settings: ReturnType<typeof useAccountSettings>['settings'];
  onChange: (next: Partial<typeof settings>) => void;
  source: SettingsSource;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-5 rounded-lg border border-border-default bg-surface-low px-5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">
          رأس المال{' '}
          <span className="num font-bold text-fg">{money(settings.capital)}</span>
          {' · '}أقصى مخاطرة{' '}
          <span className="num font-bold text-fg">
            {percent(settings.maxRiskPercent)}
          </span>
          {source === 'local' && (
            <span className="text-fg-subtle"> · نسخة محفوظة على المتصفح</span>
          )}
        </p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="text-xs font-semibold text-brand-ink underline-offset-4 hover:underline"
        >
          {open ? 'إخفاء' : 'تعديل'}
        </button>
      </div>

      {open && (
        <div
          // KEYED ON THE VALUES, because the inputs below are uncontrolled.
          // `defaultValue` is read once, when an input mounts — and these values
          // now arrive asynchronously from the account. Without this, a panel
          // opened before the read lands keeps showing the 17,000 default while
          // the summary line above it already shows the real figure, and the
          // first blur would write the stale number back to the account. The key
          // changes only when the values do, which after a user edit means
          // remounting with what they just committed.
          key={`${settings.capital}-${settings.maxRiskPercent}-${settings.waitingThresholdDays}`}
          className="mt-4 grid gap-4 border-t border-border-default pt-4 sm:grid-cols-3"
        >
          <label className="text-sm font-semibold">
            رأس المال (ج.م)
            <input
              inputMode="decimal"
              defaultValue={String(settings.capital)}
              onBlur={(e) => {
                const v = parseNumber(e.target.value);
                if (v !== null && v > 0) onChange({ capital: v });
              }}
              dir="ltr"
              className="mt-2 w-full rounded-md border border-border-default bg-surface px-3 py-2 outline-none focus:border-brand-ink"
            />
          </label>
          <label className="text-sm font-semibold">
            أقصى مخاطرة (%)
            <input
              inputMode="decimal"
              defaultValue={String(settings.maxRiskPercent * 100)}
              onBlur={(e) => {
                const v = parseNumber(e.target.value);
                if (v !== null && v > 0) onChange({ maxRiskPercent: v / 100 });
              }}
              dir="ltr"
              className="mt-2 w-full rounded-md border border-border-default bg-surface px-3 py-2 outline-none focus:border-brand-ink"
            />
          </label>
          <label className="text-sm font-semibold">
            حد الانتظار (يوم)
            <input
              inputMode="numeric"
              defaultValue={String(settings.waitingThresholdDays)}
              onBlur={(e) => {
                const v = parseNumber(e.target.value);
                if (v !== null && v > 0)
                  onChange({ waitingThresholdDays: Math.floor(v) });
              }}
              dir="ltr"
              className="mt-2 w-full rounded-md border border-border-default bg-surface px-3 py-2 outline-none focus:border-brand-ink"
            />
          </label>

          <p className="text-xs leading-relaxed text-fg-subtle sm:col-span-3">
            {source === 'local' ? (
              <>
                دي <strong>نسخة محفوظة على المتصفح ده</strong> — لسه ماقدرناش
                نقرا إعدادات حسابك (يمكن مفيش نت، أو الحساب لسه ماحفظش إعداداته).
                أي تعديل تعمله هنا هيتحفظ على حسابك أول ما الاتصال يرجع، ويوصل
                لتطبيق التليفون.
              </>
            ) : (
              <>
                القيم دي <strong>محفوظة على حسابك</strong> وبتتزامن مع التطبيق —
                تغيّرها هنا تلاقيها على تليفونك، والعكس. محدش غيرك يقدر يقراها:
                قواعد السيرفر بتحطّها في مكان الأدمن نفسه مش بيوصله.
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

function EmptyJournal({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-border-default p-12 text-center">
      <h2 className="text-lg font-bold">مفيش صفقات لسه</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">
        سجّل أول صفقة من هنا، أو من التطبيق على تليفونك — الاتنين بيكتبوا في نفس
        الحساب.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-6 rounded-md bg-brand px-6 py-3 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90"
      >
        سجّل أول صفقة
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Overview({
  stats,
  avgDiscipline,
}: {
  stats: Analytics;
  avgDiscipline: number | null;
}) {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="صافي الربح/الخسارة"
          value={signedMoney(stats.totalPnl)}
          tone={stats.totalPnl > 0 ? 'win' : stats.totalPnl < 0 ? 'loss' : undefined}
          note={`${stats.closedCount} صفقة مقفولة`}
        />
        <Kpi
          label="نسبة النجاح"
          value={percent(stats.winRate)}
          note={`${stats.winCount} ربح · ${stats.lossCount} خسارة`}
        />
        <Kpi
          label="التوقّع الرياضي"
          value={signedMoney(stats.expectancy)}
          tone={
            stats.expectancy === null
              ? undefined
              : stats.expectancy > 0
                ? 'win'
                : stats.expectancy < 0
                  ? 'loss'
                  : undefined
          }
          note="متوسط ناتج الصفقة الواحدة"
        />
        <Kpi
          label="متوسط درجة الانضباط"
          value={avgDiscipline === null ? '—' : `${avgDiscipline.toFixed(0)}/100`}
          note="بيقيس التزامك بالخطة، مش الربح"
        />
      </div>

      <Panel title="الربح التراكمي" note="نقطة لكل صفقة مقفولة، مرتّبة بتاريخ الخروج">
        <EquityChart points={stats.equityCurve} />
      </Panel>

      <Panel title="الأداء الشهري" note="آخر 12 شهر فيها صفقات مقفولة">
        <MonthlyBars periods={stats.monthlyPnl} />
      </Panel>
    </div>
  );
}

function AnalyticsTab({
  stats,
  avgDiscipline,
}: {
  stats: Analytics;
  avgDiscipline: number | null;
}) {
  const days =
    stats.averageHoldingDays === null
      ? '—'
      : `${stats.averageHoldingDays.toFixed(1)} يوم`;

  return (
    <div className="space-y-8">
      <Panel title="أرقام الأداء">
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          <Row label="معامل الربح" value={stats.profitFactor === null ? '—' : stats.profitFactor.toFixed(2)} />
          <Row label="متوسط R" value={rMultiple(stats.averageR)} />
          <Row label="وسيط R" value={rMultiple(stats.medianR)} />
          <Row
            label="متوسط الانضباط"
            value={avgDiscipline === null ? '—' : `${avgDiscipline.toFixed(0)}/100`}
          />
          <Row label="متوسط الربح" value={signedMoney(stats.averageProfit)} tone="win" />
          <Row label="متوسط الخسارة" value={signedMoney(stats.averageLoss)} tone="loss" />
          <Row label="أكبر مكسب" value={signedMoney(stats.largestGain)} tone="win" />
          <Row label="أكبر خسارة" value={signedMoney(stats.largestLoss)} tone="loss" />
          <Row label="أطول سلسلة ربح" value={String(stats.longestWinStreak)} />
          <Row label="أطول سلسلة خسارة" value={String(stats.longestLossStreak)} />
          <Row label="متوسط مدة الاحتفاظ" value={days} />
          <Row label="متوسط قيمة المركز" value={money(stats.averagePositionValue)} />
          <Row
            label="متوسط إكمال التشيك ليست"
            value={percent(stats.averageChecklistCompletion)}
          />
          <Row
            label="أكتر سهم"
            value={
              stats.mostTradedTicker
                ? `${stats.mostTradedTicker} (${stats.mostTradedTickerCount})`
                : '—'
            }
          />
        </dl>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <ExtremeCard title="أحسن صفقة" extreme={stats.bestTrade} tone="win" />
        <ExtremeCard title="أوحش صفقة" extreme={stats.worstTrade} tone="loss" />
      </div>

      <Panel title="التوقيت" note="مجمّع بتاريخ الخروج عبر كل السنين">
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          <Row
            label="أحسن يوم"
            value={
              stats.bestWeekday === null
                ? '—'
                : `${WEEKDAY_NAMES[stats.bestWeekday]} · ${signedMoney(stats.bestWeekdayPnl)}`
            }
          />
          <Row
            label="أوحش يوم"
            value={
              stats.worstWeekday === null
                ? '—'
                : `${WEEKDAY_NAMES[stats.worstWeekday]} · ${signedMoney(stats.worstWeekdayPnl)}`
            }
          />
          <Row
            label="أحسن شهر"
            value={
              stats.bestMonth === null
                ? '—'
                : `${MONTH_NAMES[stats.bestMonth]} · ${signedMoney(stats.bestMonthPnl)}`
            }
          />
          <Row
            label="أوحش شهر"
            value={
              stats.worstMonth === null
                ? '—'
                : `${MONTH_NAMES[stats.worstMonth]} · ${signedMoney(stats.worstMonthPnl)}`
            }
          />
        </dl>
      </Panel>

      <Breakdown
        title="الأداء حسب التصنيف"
        note="الصفقة بتحسب في كل تصنيف عليها، فمجموع الأسطر أكبر من إجمالي الدفتر"
        stats={stats.tagStats}
        emptyLabel="مفيش تصنيفات على الصفقات المقفولة."
      />

      <Breakdown
        title="الأداء حسب المصدر"
        note="مين رشّح لك الصفقة — الصفقة ليها مصدر واحد بس"
        stats={stats.sourceStats}
        emptyLabel="مفيش مصادر مكتوبة على الصفقات المقفولة."
      />
    </div>
  );
}

function Breakdown({
  title,
  note,
  stats,
  emptyLabel,
}: {
  title: string;
  note: string;
  stats: TagStat[];
  emptyLabel: string;
}) {
  return (
    <Panel title={title} note={note}>
      {stats.length === 0 ? (
        <p className="text-sm text-fg-muted">{emptyLabel}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border-default">
                <Th>الاسم</Th>
                <Th>صفقات</Th>
                <Th>نسبة النجاح</Th>
                <Th>الصافي</Th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.tag} className="border-b border-border-default last:border-0">
                  <Td className="font-semibold">{s.tag}</Td>
                  <Td className="num text-fg-muted">{s.tradeCount}</Td>
                  <Td className="num text-fg-muted">
                    {percent(s.tradeCount === 0 ? null : s.winCount / s.tradeCount)}
                  </Td>
                  <Td
                    className={`num font-bold ${
                      s.totalPnl > 0 ? 'text-win' : s.totalPnl < 0 ? 'text-loss' : ''
                    }`}
                  >
                    {signedMoney(s.totalPnl)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function ExtremeCard({
  title,
  extreme,
  tone,
}: {
  title: string;
  extreme: Analytics['bestTrade'];
  tone: 'win' | 'loss';
}) {
  return (
    <div className="rounded-lg border border-border-default bg-surface p-6">
      <h3 className="text-sm font-bold text-fg-muted">{title}</h3>
      {extreme === null ? (
        <p className="mt-3 text-sm text-fg-muted">—</p>
      ) : (
        <>
          <p className="num mt-3 text-2xl font-bold">{extreme.ticker || '—'}</p>
          <p
            className={`num mt-1 text-xl font-bold ${
              tone === 'win' ? 'text-win' : 'text-loss'
            }`}
          >
            {signedMoney(extreme.pnl)}
          </p>
          <p className="num mt-2 text-xs text-fg-subtle">
            خرجت في {dateLabel(extreme.exitDate)}
          </p>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function TradesTable({
  trades,
  capital,
  maxRiskPercent,
  busyId,
  onEdit,
  onDelete,
}: {
  trades: Trade[];
  capital: number;
  maxRiskPercent: number;
  busyId: string | null;
  onEdit: (trade: Trade) => void;
  onDelete: (trade: Trade) => void;
}) {
  const statusLabel: Record<Trade['status'], string> = {
    planned: 'مخططة',
    open: 'مفتوحة',
    closed: 'مغلقة',
    cancelled: 'ملغاة',
  };

  return (
    // The table is the one block here that can exceed a narrow viewport, so it
    // scrolls inside its own wrapper and the page body never does.
    <div className="overflow-x-auto rounded-lg border border-border-default">
      <table className="w-full min-w-[56rem] border-collapse text-sm">
        <thead>
          <tr className="bg-surface-high text-start">
            <Th>السهم</Th>
            <Th>الحالة</Th>
            <Th>الدخول</Th>
            <Th>الاستوب</Th>
            <Th>الكمية</Th>
            <Th>الربح/الخسارة</Th>
            <Th>R</Th>
            <Th>الانضباط</Th>
            <Th>التاريخ</Th>
            <Th>—</Th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => {
            const m = metricsOf(trade, capital);
            const score = riskScoreOf(trade, capital, maxRiskPercent);
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
                <Td className={`num font-bold ${tone}`}>{rMultiple(m.rMultiple)}</Td>
                <Td>
                  <DisciplineBadge score={score} />
                </Td>
                <Td className="num text-fg-muted">{dateLabel(trade.entryDate)}</Td>
                <Td>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => onEdit(trade)}
                      className="text-xs font-semibold text-brand-ink underline-offset-4 hover:underline"
                    >
                      تعديل
                    </button>
                    <button
                      type="button"
                      disabled={busyId === trade.id}
                      onClick={() => onDelete(trade)}
                      className="text-xs font-semibold text-loss underline-offset-4 hover:underline disabled:opacity-50"
                    >
                      {busyId === trade.id ? '...' : 'حذف'}
                    </button>
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The five components as five segments, plus the number.
 *
 * Neutral tones, not win/loss: discipline is not money, and the green a trader
 * has learned to read as profit must not also mean "well prepared". The title
 * lists exactly which components were earned, so the score is auditable rather
 * than a bare figure to argue with.
 */
function DisciplineBadge({ score }: { score: ReturnType<typeof riskScoreOf> }) {
  const earned = SCORE_COMPONENTS.filter((c) => score[c.key]);
  const title = [
    ...SCORE_COMPONENTS.map((c) => `${score[c.key] ? '✓' : '✗'} ${c.label}`),
    // The one component this surface cannot earn. Chart images are files in
    // the phone's own storage and only their paths are synced, so a trade
    // logged entirely from the browser is capped at 80 — which reads as a bug
    // unless the reason is stated where the score is.
    ...(score.hasScreenshots
      ? []
      : ['', 'الصور بتتضاف من التطبيق على التليفون بس.']),
  ].join('\n');

  return (
    <span className="flex items-center gap-2" title={title}>
      <span className="flex gap-0.5" aria-hidden>
        {SCORE_COMPONENTS.map((c) => (
          <span
            key={c.key}
            className={`h-3.5 w-1 rounded-sm ${
              score[c.key] ? 'bg-fg' : 'bg-surface-highest'
            }`}
          />
        ))}
      </span>
      <span className="num text-xs font-bold">
        {score.value}
        <span className="ms-1 font-normal text-fg-subtle">
          {GRADE_LABELS[score.grade]}
        </span>
      </span>
      <span className="sr-only">
        درجة الانضباط {score.value} من 100، {earned.length} من 5 بنود
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------

function Panel({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border-default bg-surface p-6">
      <div className="mb-5">
        <h2 className="font-bold">{title}</h2>
        {note && <p className="mt-1 text-xs text-fg-subtle">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Kpi({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: 'win' | 'loss';
}) {
  return (
    <div className="rounded-lg border border-border-default bg-surface p-5">
      <p className="text-sm text-fg-muted">{label}</p>
      <p
        className={`num mt-1.5 text-2xl font-bold ${
          tone === 'win' ? 'text-win' : tone === 'loss' ? 'text-loss' : ''
        }`}
      >
        {value}
      </p>
      {note && <p className="mt-1.5 text-xs text-fg-subtle">{note}</p>}
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'win' | 'loss';
}) {
  // Tone is dropped when the figure is unavailable — a green "—" reads as a
  // result that happens to be missing rather than as no result at all.
  const coloured = value !== '—' && tone;
  return (
    <div>
      <dt className="text-xs text-fg-muted">{label}</dt>
      <dd
        className={`num mt-1 font-bold ${
          coloured === 'win' ? 'text-win' : coloured === 'loss' ? 'text-loss' : ''
        }`}
      >
        {value}
      </dd>
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

function Loading() {
  return (
    <div
      className="mt-10 space-y-3"
      role="status"
      aria-busy="true"
      aria-label="جاري التحميل"
    >
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-14 animate-pulse rounded-md bg-surface-high" />
      ))}
    </div>
  );
}
