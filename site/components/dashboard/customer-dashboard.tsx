'use client';

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { CalculatorWidget } from '@/components/calculator-widget';
import {
  CalculatorIcon,
  ChartIcon,
  PlusIcon,
  MoreIcon,
  ReceiptIcon,
  SettingsIcon,
  SparkIcon,
} from '@/components/icons';
import { EquityChart, MonthlyBars } from '@/components/dashboard/charts';
import { GoalPanel } from '@/components/dashboard/goal-panel';
import { LegalNotice } from '@/components/dashboard/legal-notice';
import { AiTradeSheet } from '@/components/dashboard/ai-trade-sheet';
import {
  Paywall,
  PlanCard,
  TrialBanner,
} from '@/components/dashboard/paywall';
import { SubscribeDialog } from '@/components/dashboard/subscribe-dialog';
import { MarketFlowsPanel } from '@/components/dashboard/market-flows-panel';
import {
  ADD_TRADE_LABEL,
  QuickAddSheet,
} from '@/components/dashboard/quick-add-sheet';
import { ScenariosPanel } from '@/components/dashboard/scenarios-panel';
import { SignInPanel } from '@/components/dashboard/sign-in-panel';
import { InstallButton } from '@/components/pwa';
import { ThemeToggle } from '@/components/theme-toggle';
import { TodayPanel } from '@/components/dashboard/today-panel';
import { TradeForm, type TradeDraft } from '@/components/dashboard/trade-form';
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
import {
  portfolioScenarios,
  type PortfolioScenarios,
} from '@/lib/portfolio-scenarios';
import { readGeminiKey, writeGeminiKey } from '@/lib/gemini-key';
import { can, FREE_ENTITLEMENT, type Entitlement } from '@/lib/subscription';
import { useSubscription } from '@/lib/use-subscription';
import { exceedsRiskLimit, parseNumber } from '@/lib/risk-math';
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
  | 'goal'
  | 'trades'
  | 'planning'
  | 'watchlist';

/**
 * The four bottom-bar destinations, mirroring HomeShell's NavigationBar
 * one-for-one: look at my trades, read the market, size a trade, change my
 * settings. Each is a different JOB — which is the test that moved «قرار
 * اليوم», «الأداء» and the rest into the tab strip inside «صفقاتي» rather than
 * leaving eight siblings in one row.
 *
 * A phone got all eight as wrapping pills, which took three rows of the first
 * screen and read as eight separate features.
 */
type Section = 'journal' | 'market' | 'calculator' | 'settings';

/**
 * The bar itself. Labels and order are the app's, so the same slot holds the
 * same destination on both surfaces — under RTL «صفقاتي» lands rightmost in
 * both, because a row reverses and Material's NavigationBar does the same.
 */
const SECTIONS: {
  id: Section;
  label: string;
  Icon: (props: { className?: string }) => React.ReactElement;
}[] = [
  { id: 'journal', label: 'صفقاتي', Icon: ReceiptIcon },
  { id: 'market', label: 'السوق', Icon: ChartIcon },
  { id: 'calculator', label: 'حاسبة الصفقة', Icon: CalculatorIcon },
  { id: 'settings', label: 'الإعدادات', Icon: SettingsIcon },
];

type View = { kind: 'list' } | { kind: 'new'; seed?: Trade } | { kind: 'edit'; trade: Trade };

function Journal() {
  const { user, logout, isAdmin } = useAuth();
  const { settings, update, source: settingsSource } = useAccountSettings(user);
  const { entitlement, subscription, readable } = useSubscription(user);

  const [trades, setTrades] = useState<Trade[] | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<View>({ kind: 'list' });
  const [section, setSection] = useState<Section>('journal');
  const [tab, setTab] = useState<Tab>('today');
  const [busyId, setBusyId] = useState<string | null>(null);

  /**
   * The add-trade sheet, which is now what «أضف صفقة» opens everywhere.
   *
   * It used to jump straight to the full form — type picker, dates, reason,
   * checklist, timeline — for an act the app answers in five fields. The full
   * form is still there behind «التفاصيل الكاملة ←», seeded with whatever was
   * typed, so choosing the fast path never costs anything.
   */
  const [quickAdd, setQuickAdd] = useState(false);

  /** «تحليل توصيات بالـ AI» — the app's sparkle action, in the app's place. */
  const [aiSheet, setAiSheet] = useState(false);

  /** «اطلب الاشتراك» — the manual purchase path, opened from every gate. */
  const [subscribing, setSubscribing] = useState(false);

  /** The hub's overflow, mirroring the app's PopupMenuButton. */
  const [hubMenu, setHubMenu] = useState(false);

  /**
   * LIVE, not a one-shot read.
   *
   * This used to be a single `getDocs` on mount, which made the browser a
   * snapshot of whatever the account held the moment the page loaded. A trade
   * added on the phone reached Firestore three seconds later and then sat there
   * until somebody pressed refresh — so «مش متزامنة» was the honest description
   * of it, even though both surfaces were signed into the same account and
   * writing to the same collection.
   *
   * `onSnapshot` also removes the reload after every local write: Firestore
   * echoes the change back through this listener, and it does it optimistically
   * before the server round-trip, so saving feels immediate and an edit made in
   * another tab lands here without being asked for.
   */
  useEffect(() => {
    if (!user) return;

    const db = firestore();
    let latestTrades: Trade[] | null = null;
    let latestWatch: WatchlistItem[] | null = null;
    let lastCounts = '';

    /**
     * Recomputed from the full collections, so the admin's counters
     * self-correct even for trades added on the phone. Guarded on the values
     * actually changing: the listener fires on every write, and this is
     * telemetry for the operator, not the user's request.
     */
    function pushCounts() {
      if (!user || latestTrades === null || latestWatch === null) return;
      const key = `${latestTrades.length}:${latestWatch.length}`;
      if (key === lastCounts) return;
      lastCounts = key;
      void updateCounts(
        user.uid,
        user,
        latestTrades.length,
        latestWatch.length
      );
    }

    const stopTrades = onSnapshot(
      collection(db, 'users', user.uid, 'trades'),
      (snap) => {
        // One malformed document must not empty the whole journal, so decoding
        // is per-record and a failure drops just that record — the same rule
        // the app's own restore path follows.
        latestTrades = snap.docs
          .map((d) => decodeTrade(d.data()))
          .filter((t): t is Trade => t !== null)
          .sort((a, b) => b.entryDate.getTime() - a.entryDate.getTime());
        setTrades(latestTrades);
        setFailed(false);
        pushCounts();
      },
      () => setFailed(true)
    );

    const stopWatch = onSnapshot(
      collection(db, 'users', user.uid, 'watchlist'),
      (snap) => {
        latestWatch = snap.docs
          .map((d) => decodeWatchlistItem(d.data()))
          .filter((w): w is WatchlistItem => w !== null);
        setWatchlist(latestWatch);
        pushCounts();
      },
      () => setFailed(true)
    );

    return () => {
      stopTrades();
      stopWatch();
    };
  }, [user]);


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
   * Writes one trade the way the app writes it.
   *
   * `merge: true` and the document keyed by the trade's own id, both matching
   * FirestoreSyncService.pushTrades — so a trade saved here and the same trade
   * saved from the phone land on the same document instead of forking into two.
   * Merge also means the fields this form does not touch (timeline entries,
   * screenshot paths) survive an edit made from the browser.
   */
  /**
   * Writes a changed trade in place — no navigation, no form.
   *
   * The decision buttons on «قرار اليوم» flip a status or append a timeline
   * entry and stay where they are; `saveTrade` closes the form when it
   * returns, which is right there and wrong here. The live listener puts the
   * result back on screen, so neither needs to re-read.
   */
  async function updateTrade(trade: Trade) {
    if (!user) return;
    try {
      await setDoc(
        doc(firestore(), 'users', user.uid, 'trades', trade.id),
        { ...encodeTrade(trade), updatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch {
      setFailed(true);
    }
  }

  /**
   * Writes several trades at once, for the AI reader.
   *
   * Sequential rather than Promise.all: a batch of ten is not worth the burst,
   * and a rejection in the middle of an all-settled would be swallowed while
   * the caller reported success.
   */
  async function saveTrades(batch: Trade[]) {
    if (!user) return;
    try {
      for (const trade of batch) {
        await setDoc(
          doc(firestore(), 'users', user.uid, 'trades', trade.id),
          { ...encodeTrade(trade), updatedAt: serverTimestamp() },
          { merge: true }
        );
      }
    } catch {
      setFailed(true);
    }
  }

  async function saveTrade(draft: TradeDraft) {
    if (!user) return;
    await setDoc(
      doc(firestore(), 'users', user.uid, 'trades', draft.id),
      { ...encodeTrade(draft), updatedAt: serverTimestamp() },
      { merge: true }
    );
    setView({ kind: 'list' });
  }

  async function saveWatch(item: WatchlistItem) {
    if (!user) return;
    await setDoc(
      doc(firestore(), 'users', user.uid, 'watchlist', item.id),
      { ...encodeWatchlistItem(item), updatedAt: serverTimestamp() },
      { merge: true }
    );
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

  /**
   * THE SPLIT THE WHOLE JOURNAL HANGS ON.
   *
   * `open` and `closed` are trades that exist — money moved, or is moving.
   * `planned` and `cancelled` are intentions: one still live, one abandoned.
   * They were listed together, so the tab badge counted nine ideas and three
   * trades as «12» — a number that answers no question anybody has.
   */
  const realTrades = useMemo(
    () =>
      (trades ?? []).filter(
        (t) => t.status === 'open' || t.status === 'closed'
      ),
    [trades]
  );

  const plannedTrades = useMemo(
    () =>
      (trades ?? []).filter(
        (t) => t.status === 'planned' || t.status === 'cancelled'
      ),
    [trades]
  );

  /**
   * Best case, worst case, and the one-winner question — over the OPEN book.
   *
   * Not gated on `hasTrades` the way the analytics are: this reads open
   * positions, not closed ones, so somebody whose first trade is still running
   * has exactly the book this answers a question about. The panel hides itself
   * when nothing is open.
   */
  const scenarios: PortfolioScenarios = useMemo(
    () => portfolioScenarios(trades ?? []),
    [trades]
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
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-5 lg:py-8">
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
            showLivePrices={can(entitlement ?? FREE_ENTITLEMENT, 'livePrices')}
            onCancel={() => setView({ kind: 'list' })}
            onSave={saveTrade}
          />
        </div>
      </div>
    );
  }

  /**
   * The journal's own views, in the app's order and under the app's names.
   *
   * Same seven the phone shows in TradesHubScreen's TabBar, plus «قائمة
   * المراقبة» — which the app keeps in an overflow menu and the web has always
   * had as a tab. CLAUDE.md §6 requires the labels match literally; the order
   * now matches too, so the muscle memory carries between the two.
   */
  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'today', label: 'قرار اليوم' },
    { id: 'trades', label: 'صفقاتي', badge: realTrades.length },
    { id: 'planning', label: 'تخطيط', badge: plannedTrades.length },
    { id: 'overview', label: 'الأداء' },
    { id: 'analytics', label: 'التحليلات' },
    { id: 'goal', label: 'الهدف' },
    { id: 'watchlist', label: 'قائمة المراقبة', badge: watchlist.length },
  ];

  // Gates the performance views on REAL trades, not on the journal being
  // non-empty. A user holding nothing but plans has an analytics page whose
  // every figure is «—»; the empty state, which says what to do next, is the
  // more useful answer to the same situation.
  const hasTrades = realTrades.length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 sm:px-5 sm:py-6 lg:py-8">
      {/* Compact on a phone, for the reason the app's hub AppBar has no title:
          the bar at the bottom already says which destination you are in, so a
          heading repeating it spends a row saying the same word twice. The
          account line and the actions live in «الإعدادات» now — where the app
          keeps them — and stay in the header from `sm` up, where there is room
          and there is no bottom bar. */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border-default pb-3 sm:pb-4">
        <h1 className="text-lg font-bold tracking-tight sm:text-2xl">
          {SECTIONS.find((d) => d.id === section)?.label ?? 'دفتر صفقاتك'}
        </h1>

        {/* The app's hub AppBar actions, in the app's place: above the tab
            strip, not inside it. Inline with the tabs they sat on top of a row
            that scrolls horizontally, so the last label slid under them. */}
        {section === 'journal' && (
          <div className="flex items-center gap-1 sm:order-3">
            <button
              type="button"
              onClick={() =>
                can(entitlement ?? FREE_ENTITLEMENT, 'aiReader')
                  ? setAiSheet(true)
                  : setSubscribing(true)
              }
              title={
                can(entitlement ?? FREE_ENTITLEMENT, 'aiReader')
                  ? 'تحليل توصيات بالـ AI'
                  : 'تحليل توصيات بالـ AI — محتاج اشتراك'
              }
              aria-label="تحليل توصيات بالـ AI"
              className={`rounded-md p-2 transition-colors hover:bg-surface-high ${
                can(entitlement ?? FREE_ENTITLEMENT, 'aiReader')
                  ? 'text-brand-ink'
                  : 'text-fg-subtle'
              }`}
            >
              <SparkIcon className="size-5" />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setHubMenu((v) => !v)}
                aria-expanded={hubMenu}
                aria-haspopup="menu"
                title="المزيد"
                aria-label="المزيد"
                className="rounded-md p-2 text-fg-muted transition-colors hover:bg-surface-high hover:text-fg"
              >
                <MoreIcon className="size-5" />
              </button>

              {hubMenu && (
                <>
                  {/* Catches the next click anywhere, the way a native menu
                      dismisses. */}
                  <button
                    type="button"
                    aria-hidden
                    tabIndex={-1}
                    onClick={() => setHubMenu(false)}
                    className="fixed inset-0 z-30 cursor-default"
                  />
                  <ul
                    role="menu"
                    className="absolute end-0 z-40 mt-1 w-56 overflow-hidden rounded-md border border-border-strong bg-surface py-1 shadow-lg"
                  >
                    {[
                      { label: 'الإحصائيات التفصيلية', go: () => setTab('analytics') },
                      { label: 'قائمة المراقبة', go: () => setTab('watchlist') },
                      { label: 'الإعدادات', go: () => setSection('settings') },
                    ].map((entry) => (
                      <li key={entry.label}>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            entry.go();
                            setHubMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-start text-sm transition-colors hover:bg-surface-high"
                        >
                          {entry.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        )}

        <div className="hidden flex-wrap items-center gap-2 sm:flex">
          <button
            type="button"
            onClick={() => setQuickAdd(true)}
            className="rounded-md bg-brand px-5 py-2 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90"
          >
            + {ADD_TRADE_LABEL}
          </button>
          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-md border border-border-strong px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface-high"
            >
              لوحة الإدارة
            </Link>
          )}
          <InstallButton />
          <ThemeToggle />
        </div>
      </header>

      {/* The destination switcher, as a row here and as the bottom bar below.
          One navigation model, drawn where each screen expects it. */}
      <nav aria-label="الأقسام" className="mt-4 hidden sm:block">
        <ul className="flex flex-wrap gap-2">
          {SECTIONS.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => setSection(d.id)}
                aria-current={section === d.id ? 'page' : undefined}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                  section === d.id
                    ? 'bg-brand text-on-brand'
                    : 'border border-border-default text-fg-muted hover:bg-surface-high'
                }`}
              >
                <d.Icon className="size-4" />
                {d.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {failed && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-loss-border bg-loss-surface p-4 text-sm font-semibold text-loss"
        >
          تعذّر تحميل بياناتك. جرّب تحدّث الصفحة.
        </p>
      )}

      {!failed && (trades === null || entitlement === null) && <Loading />}

      {entitlement !== null && (
        <TrialBanner
          entitlement={entitlement}
          trialStartedAt={subscription?.trialStartedAt ?? null}
        />
      )}

      {trades !== null && entitlement !== null && (
        <>
          {section === 'journal' && (
            <>
              {/* Scrollable and start-aligned, exactly like the hub's TabBar:
                  seven labels wrapped onto three rows of pills is most of a
                  phone's first screen spent on navigation. The underline marks
                  the current view the way the app's indicator does. */}
              <nav
                aria-label="أقسام الدفتر"
                className="-mx-4 mt-3 overflow-x-auto border-b border-border-default px-4 sm:mx-0 sm:mt-4 sm:px-0"
              >
                <ul className="flex w-max gap-1">
                  {tabs.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setTab(item.id)}
                        aria-current={tab === item.id ? 'page' : undefined}
                        className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                          tab === item.id
                            ? 'border-brand-ink text-brand-ink'
                            : 'border-transparent text-fg-muted hover:text-fg'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          {item.label}
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className="num rounded-full bg-surface-high px-1.5 text-xs font-bold text-fg-muted">
                              {item.badge}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="mt-4">
                {tab === 'today' && (
                  <TodayPanel
                    trades={trades}
                    watchlistCount={watchlist.length}
                    showLivePrices={can(entitlement, 'livePrices')}
                    capital={settings.capital}
                    maxRiskPercent={settings.maxRiskPercent}
                    waitingThresholdDays={settings.waitingThresholdDays}
                    onEdit={(trade) => setView({ kind: 'edit', trade })}
                    onUpdate={updateTrade}
                  />
                )}

                {tab === 'overview' &&
                  (!can(entitlement, 'analytics') ? (
                    <Paywall
                      title="الأداء"
                      what="صافي الربح ونسبة النجاح والتوقّع الرياضي ومنحنى رأس المال وسيناريوهات المحفظة — محسوبة من صفقاتك المقفولة."
                      entitlement={entitlement}
                      onSubscribe={() => setSubscribing(true)}
                    />
                  ) : hasTrades && stats ? (
                    <Overview
                      stats={stats}
                      avgDiscipline={avgDiscipline}
                      scenarios={scenarios}
                    />
                  ) : (
                    <EmptyJournal onAdd={() => setQuickAdd(true)} />
                  ))}

                {tab === 'analytics' &&
                  (!can(entitlement, 'analytics') ? (
                    <Paywall
                      title="التحليلات"
                      what="معامل الربح ومتوسط R وسلاسل الربح والخسارة ومتوسط مدة الاحتفاظ وأكتر سهم بتتداوله."
                      entitlement={entitlement}
                      onSubscribe={() => setSubscribing(true)}
                    />
                  ) : hasTrades && stats ? (
                    <AnalyticsTab stats={stats} avgDiscipline={avgDiscipline} />
                  ) : (
                    <EmptyJournal onAdd={() => setQuickAdd(true)} />
                  ))}

                {/* Not gated behind hasTrades like the two above. An empty
                    journal is exactly when somebody wants to know what the
                    target needs, and the panel's own «لسه بدري» state answers
                    that far better than the generic card would. */}
                {tab === 'goal' && (
                  <GoalPanel
                    capital={settings.capital}
                    expectancy={stats?.expectancy ?? null}
                    trades={trades.map((t) => ({
                      exitDate: t.exitDate,
                      pnl: metricsOf(t, settings.capital).pnl,
                    }))}
                  />
                )}

                {tab === 'trades' &&
                  (realTrades.length > 0 ? (
                    <TradesTable
                      trades={realTrades}
                      variant="real"
                      capital={settings.capital}
                      maxRiskPercent={settings.maxRiskPercent}
                      busyId={busyId}
                      onEdit={(trade) => setView({ kind: 'edit', trade })}
                      onDelete={(trade) =>
                        void removeDoc('trades', trade.id, `صفقة ${trade.ticker}`)
                      }
                    />
                  ) : (
                    <EmptyJournal onAdd={() => setQuickAdd(true)} />
                  ))}

                {tab === 'planning' && (
                  <PlanningTab
                    trades={plannedTrades}
                    capital={settings.capital}
                    maxRiskPercent={settings.maxRiskPercent}
                    busyId={busyId}
                    onAdd={() => setQuickAdd(true)}
                    onEdit={(trade) => setView({ kind: 'edit', trade })}
                    onDelete={(trade) =>
                      void removeDoc('trades', trade.id, `صفقة ${trade.ticker}`)
                    }
                    onCalculator={() => setSection('calculator')}
                  />
                )}

                {tab === 'watchlist' && (
                  <WatchlistPanel
                    items={watchlist}
                    busyId={busyId}
                    onSave={saveWatch}
                    onDelete={(item) =>
                      void removeDoc(
                        'watchlist',
                        item.id,
                        `${item.ticker} من المراقبة`
                      )
                    }
                    onConvert={(item) =>
                      setView({ kind: 'new', seed: toPlannedTrade(item) })
                    }
                  />
                )}
              </div>
            </>
          )}

          {/* Market flows are not gated on the journal at all: they are the
              same for everybody and worth reading on day one, before a single
              trade has been logged. */}
          {section === 'market' && (
            <div className="mt-4">
              {can(entitlement, 'marketFlows') ? (
                <MarketFlowsPanel />
              ) : (
                <Paywall
                  title="السوق"
                  what="مين اشترى ومين باع في كل جلسة — مؤسسات ولا أفراد، مصريين ولا عرب ولا أجانب، وصافي كل فئة."
                  entitlement={entitlement}
                  onSubscribe={() => setSubscribing(true)}
                />
              )}
            </div>
          )}

          {section === 'calculator' && (
            <div className="mt-4">
              <CalculatorSection
                capital={settings.capital}
                maxRiskPercent={settings.maxRiskPercent}
                onAdd={() => setQuickAdd(true)}
              />
            </div>
          )}

          {section === 'settings' && (
            <div className="mt-4">
              <SettingsSection
                onSubscribe={() => setSubscribing(true)}
                entitlement={entitlement}
                subscription={subscription}
                billingReadable={readable}
                settings={settings}
                onChange={update}
                source={settingsSource}
                email={user?.email ?? null}
                isAdmin={isAdmin}
                onLogout={() => void logout()}
              />
            </div>
          )}
        </>
      )}

      {/* Clears the bottom bar and the FAB, which are fixed over the page. */}
      <div className="h-24 sm:hidden" />

      {/* The app's extended FAB, in the app's place — and only where the app
          puts it. It belongs to the trades hub, not to every destination: a
          button for adding a trade floating over the settings screen is an
          offer to do something the screen is not about. Phone only, because
          from `sm` up the same action sits in the header. */}
      {section === 'journal' && (
        <button
          type="button"
          onClick={() => setQuickAdd(true)}
          className="fixed bottom-20 end-4 z-30 flex items-center gap-2 rounded-2xl bg-brand px-5 py-3.5 text-sm font-bold text-on-brand shadow-lg transition-opacity hover:opacity-90 sm:hidden"
        >
          <PlusIcon className="size-5" />
          {ADD_TRADE_LABEL}
        </button>
      )}

      <nav
        aria-label="الأقسام"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border-default bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        <ul className="mx-auto flex max-w-md">
          {SECTIONS.map((d) => (
            <li key={d.id} className="flex-1">
              <button
                type="button"
                onClick={() => setSection(d.id)}
                aria-current={section === d.id ? 'page' : undefined}
                className={`flex w-full flex-col items-center gap-1 px-1 py-2 text-[11px] font-semibold transition-colors ${
                  section === d.id ? 'text-brand-ink' : 'text-fg-muted'
                }`}
              >
                {/* The filled pill behind the current icon is Material 3's
                    active indicator, which is what the app draws. */}
                <span
                  className={`flex h-7 w-14 items-center justify-center rounded-full transition-colors ${
                    section === d.id ? 'bg-brand/25' : ''
                  }`}
                >
                  <d.Icon className="size-5" />
                </span>
                {d.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {subscribing && user && (
        <SubscribeDialog
          email={user.email}
          uid={user.uid}
          onClose={() => setSubscribing(false)}
        />
      )}

      {aiSheet && (
        <AiTradeSheet
          key={`${settings.capital}-${settings.maxRiskPercent}`}
          capital={settings.capital}
          maxRiskPercent={settings.maxRiskPercent}
          onClose={() => setAiSheet(false)}
          onSave={async (batch) => {
            await saveTrades(batch);
            setAiSheet(false);
            setTab('planning');
          }}
        />
      )}

      {quickAdd && (
        <QuickAddSheet
          // Keyed on the account values for the same reason the form and the
          // settings panel are: the sizing seeds off capital and the risk rule,
          // and those land asynchronously from Firestore.
          key={`${settings.capital}-${settings.maxRiskPercent}`}
          capital={settings.capital}
          maxRiskPercent={settings.maxRiskPercent}
          onClose={() => setQuickAdd(false)}
          onSave={async (trade) => {
            await saveTrade(trade);
            setQuickAdd(false);
          }}
          onFullDetails={(seed) => {
            setQuickAdd(false);
            setView({ kind: 'new', seed });
          }}
        />
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
function SettingsSection({
  onSubscribe,
  entitlement,
  subscription,
  billingReadable,
  settings,
  onChange,
  source,
  email,
  isAdmin,
  onLogout,
}: {
  onSubscribe: () => void;
  entitlement: Entitlement;
  subscription: ReturnType<typeof useSubscription>['subscription'];
  billingReadable: boolean | null;
  settings: ReturnType<typeof useAccountSettings>['settings'];
  onChange: (next: Partial<typeof settings>) => void;
  source: SettingsSource;
  email: string | null;
  isAdmin: boolean;
  onLogout: () => void;
}) {
  // Always open. It used to be a collapsed strip above every tab, sitting on
  // screen while nobody was editing it; a destination of its own is where the
  // app keeps this, and a settings screen that opens closed is a settings
  // screen with an extra tap in front of it.
  const open = true;

  return (
    <div className="space-y-5">
      {/* THE FAILURE THIS EXISTS FOR. A denied read and a fresh account both
          surface as "no document" and both resolve to FREE — so a deployment
          without `firestore.rules` locks every paid surface for everyone, and
          no trial ever starts, with no error anywhere. Say which one it is. */}
      {billingReadable === false ? (
        <section className="rounded-lg border border-loss-border bg-loss-surface p-4 sm:p-5">
          <h2 className="font-bold text-loss">مش قادرين نقرا حالة اشتراكك</h2>
          <p className="mt-2 text-sm leading-relaxed text-fg">
            الحساب شغّال عادي والدفتر بيتزامن، بس بيانات الباقة مترفوضة من
            السيرفر — فالموقع بيعاملك كباقة مجانية مؤقتًا، والتجربة ما بدأتش.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-fg-muted">
            ده بيحصل لما قواعد Firestore ما تكونش اتنشرت. لو انت المالك، شغّل{' '}
            <code className="num rounded bg-surface px-1.5 py-0.5 font-bold">
              firebase deploy --only firestore:rules
            </code>
          </p>
        </section>
      ) : (
        <PlanCard
          entitlement={entitlement}
          trialStartedAt={subscription?.trialStartedAt ?? null}
          proUntil={subscription?.proUntil ?? null}
          onSubscribe={onSubscribe}
        />
      )}

      <section className="rounded-lg border border-border-default bg-surface p-4 sm:p-5">
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
      </section>

      <GeminiKeyPanel />

      {/* The account itself — where the app keeps it, and where it stops
          costing the journal a header row on every screen. */}
      <section className="rounded-lg border border-border-default bg-surface p-4 sm:p-5">
        <h2 className="font-bold">حسابك</h2>
        <p className="num mt-1 text-sm text-fg-muted" dir="ltr">
          {email ?? '—'}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-md border border-border-strong px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface-high"
            >
              لوحة الإدارة
            </Link>
          )}
          <InstallButton />
          <ThemeToggle />
          <button
            type="button"
            onClick={onLogout}
            className="rounded-md border border-border-default px-4 py-2 text-sm font-semibold text-fg-muted transition-colors hover:bg-surface-high hover:text-fg"
          >
            خروج
          </button>
        </div>
      </section>

      {/* Moved out of the (app) layout, where it was pinned under every tab. */}
      <LegalNotice />
    </div>
  );
}

/**
 * The user's own Gemini key, for the AI reader.
 *
 * Mirrors the app's Settings field, with one difference the copy states
 * outright: this copy lives in THIS BROWSER and does not sync. A live
 * third-party credential that bills the user is the one thing worth keeping out
 * of Firestore even though the rules would only let its owner read it — see
 * lib/gemini-key.ts.
 */
function GeminiKeyPanel() {
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [reveal, setReveal] = useState(false);

  // Read once on mount: localStorage does not exist during the server render.
  useEffect(() => setKey(readGeminiKey()), []);

  return (
    <section className="rounded-lg border border-border-default bg-surface p-4 sm:p-5">
      <h2 className="font-bold">مفتاح Gemini</h2>
      <p className="mt-1 text-xs leading-relaxed text-fg-muted">
        بيشغّل «تحليل توصيات بالـ AI». اعمل واحد مجانًا من{' '}
        <a
          href="https://aistudio.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-brand-ink underline-offset-4 hover:underline"
        >
          Google AI Studio
        </a>
        .
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type={reveal ? 'text' : 'password'}
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            setSaved(false);
          }}
          dir="ltr"
          placeholder="AIza…"
          autoComplete="off"
          className="num min-w-0 flex-1 rounded-md border border-border-default bg-surface-low px-3 py-2 text-sm outline-none focus:border-brand-ink"
        />
        <button
          type="button"
          onClick={() => setReveal((v) => !v)}
          className="rounded-md border border-border-default px-3 py-2 text-xs font-semibold text-fg-muted transition-colors hover:bg-surface-high hover:text-fg"
        >
          {reveal ? 'إخفاء' : 'إظهار'}
        </button>
        <button
          type="button"
          onClick={() => {
            writeGeminiKey(key);
            setSaved(true);
          }}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90"
        >
          {saved ? 'اتحفظ' : 'احفظ'}
        </button>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-fg-subtle">
        بيتخزّن على <strong>المتصفح ده بس</strong> — مش على حسابك ومش بيتزامن مع
        التطبيق، فلو فتحت من جهاز تاني هتحتاج تحطّه تاني. ده مقصود: المفتاح
        بيتحاسب عليه انت، وأأمن حاجة إنه ما يخرجش من الجهاز اللي اتكتب عليه.
        الطلب بيروح من متصفحك لـGoogle على طول، ومبيعدّيش علينا.
      </p>
    </section>
  );
}

/**
 * «حاسبة الصفقة» — a destination, not a widget buried in «تخطيط».
 *
 * The app gives this its own slot in the bottom bar because sizing a position
 * is something a trader does several times a day and commits to once. It was
 * stacked on top of the planned-trades list here, which meant reaching it cost
 * a tab switch plus a scroll past somebody else's saved ideas.
 *
 * NOTHING HERE WRITES ANYTHING. That is the point: until «أضف صفقة» is pressed,
 * this is scratch arithmetic and the journal stays clean. Before it existed the
 * only way to size a position while signed in was to fill in the trade form and
 * SAVE, which put throwaway sums permanently into the trade count.
 */
function CalculatorSection({
  capital,
  maxRiskPercent,
  onAdd,
}: {
  capital: number;
  maxRiskPercent: number;
  onAdd: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="max-w-xl text-xs leading-relaxed text-fg-muted">
          جرّب أي سعر دخول واستوب وشوف الكمية المسموحة. مفيش حاجة بتتحفظ هنا —
          لو الفكرة عجبتك، سجّلها كصفقة.
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="hidden shrink-0 rounded-md border border-border-strong px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface-high sm:block"
        >
          + {ADD_TRADE_LABEL}
        </button>
      </div>

      {/* Keyed on the account values: the widget seeds its state once in
          useState, and these arrive asynchronously from Firestore. Without this
          it would keep the 100,000 default after the real capital landed — the
          same trap the settings panel and the trade form document. */}
      <CalculatorWidget
        key={`${capital}-${maxRiskPercent}`}
        initialCapital={capital}
        initialRisk={maxRiskPercent}
        blankPrices
      />
    </div>
  );
}

function EmptyJournal({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-border-default p-8 text-center">
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
        {ADD_TRADE_LABEL}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Overview({
  stats,
  avgDiscipline,
  scenarios,
}: {
  stats: Analytics;
  avgDiscipline: number | null;
  scenarios: PortfolioScenarios;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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

      {/* Above the closed-trade charts, and for the same reason the app puts it
          near the top of «الأداء»: what is at stake right now outranks what
          already happened. */}
      <ScenariosPanel scenarios={scenarios} />

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
    <div className="space-y-5">
      <Panel title="أرقام الأداء">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
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
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
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
    <div className="rounded-lg border border-border-default bg-surface p-4 sm:p-5">
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
          <p className="mt-2 text-xs text-fg-subtle">
            خرجت في <span className="num">{dateLabel(extreme.exitDate)}</span>
          </p>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

/**
 * «تخطيط» — ideas that are not yet trades.
 *
 * The scratch calculator used to sit on top of this list. It is a bottom-bar
 * destination now, as it is in the app, so this tab is what its name says: the
 * plans you saved. The link below is the only thing left of the old stacking,
 * and it points at the destination rather than duplicating the widget.
 */
function PlanningTab({
  trades,
  capital,
  maxRiskPercent,
  busyId,
  onAdd,
  onEdit,
  onDelete,
  onCalculator,
}: {
  trades: Trade[];
  /** The planned table shows risk and its share of capital, so it needs both. */
  capital: number;
  maxRiskPercent: number;
  busyId: string | null;
  onAdd: () => void;
  onEdit: (trade: Trade) => void;
  onDelete: (trade: Trade) => void;
  onCalculator: () => void;
}) {
  return (
    <div className="space-y-5">
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 className="font-bold">صفقات مخططة</h2>
            <p className="mt-1 text-xs text-fg-muted">
              أفكار سجّلتها ولسه ما نفّذتهاش. مش بتتحسب في أداءك ولا في
              التحليلات — لحد ما تتحول لمفتوحة.
            </p>
          </div>
          <button
            type="button"
            onClick={onCalculator}
            className="shrink-0 text-xs font-semibold text-brand-ink underline-offset-4 hover:underline"
          >
            افتح حاسبة الصفقة ←
          </button>
        </div>

        <div className="mt-4">
          {trades.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border-default p-8 text-center">
              <p className="text-sm text-fg-muted">
                مفيش صفقات مخططة لسه. احسب فكرة في «حاسبة الصفقة» وسجّلها لو
                عجبتك.
              </p>
              <button
                type="button"
                onClick={onAdd}
                className="mt-4 rounded-md bg-brand px-5 py-2 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90"
              >
                {ADD_TRADE_LABEL}
              </button>
            </div>
          ) : (
            <TradesTable
              trades={trades}
              variant="planned"
              capital={capital}
              maxRiskPercent={maxRiskPercent}
              busyId={busyId}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          )}
        </div>
      </section>
    </div>
  );
}

const STATUS_LABELS: Record<Trade['status'], string> = {
  planned: 'مخططة',
  open: 'مفتوحة',
  closed: 'مغلقة',
  cancelled: 'ملغاة',
};

/**
 * The journal, in two tables that do NOT share a column set.
 *
 * A trade that has not happened has no profit, no R and no discipline score
 * worth reading — those three columns exist to judge a decision by its outcome,
 * and an idea has no outcome. Rendering them anyway is what made one mixed
 * table confusing: «—» in the P&L column reads as "broke even" at a glance, and
 * a discipline badge on an unexecuted plan invites the reader to grade
 * something that was never done.
 *
 * So `variant` picks the columns rather than a filter picking the rows:
 *   real    open + closed     money columns, judged by result
 *   planned planned+cancelled intent columns — what it would cost if taken
 */
function TradesTable({
  trades,
  capital,
  maxRiskPercent,
  busyId,
  variant,
  onEdit,
  onDelete,
}: {
  trades: Trade[];
  capital: number;
  maxRiskPercent: number;
  busyId: string | null;
  variant: 'real' | 'planned';
  onEdit: (trade: Trade) => void;
  onDelete: (trade: Trade) => void;
}) {
  const real = variant === 'real';

  return (
    // The table is the one block here that can exceed a narrow viewport, so it
    // scrolls inside its own wrapper and the page body never does.
    <div className="overflow-x-auto rounded-lg border border-border-default">
      <table
        className={`w-full border-collapse text-sm ${real ? 'min-w-[56rem]' : 'min-w-[48rem]'}`}
      >
        <thead>
          <tr className="bg-surface-high text-start">
            <Th>السهم</Th>
            <Th>الحالة</Th>
            <Th>الدخول</Th>
            <Th>الاستوب</Th>
            <Th>الكمية</Th>
            {real ? (
              <>
                <Th>الربح/الخسارة</Th>
                <Th>R</Th>
                <Th>الانضباط</Th>
              </>
            ) : (
              <>
                {/* What the plan would cost if it were taken — the only two
                    figures an unexecuted trade can honestly carry. */}
                <Th>المخاطرة</Th>
                <Th>% من رأس المال</Th>
              </>
            )}
            <Th>التاريخ</Th>
            <Th>—</Th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => {
            const m = metricsOf(trade, capital);
            const tone =
              m.result === 'win'
                ? 'text-win'
                : m.result === 'loss'
                  ? 'text-loss'
                  : '';
            const over =
              m.riskPct !== null && exceedsRiskLimit(m.riskPct, maxRiskPercent);

            return (
              <tr key={trade.id} className="border-t border-border-default">
                <Td className="num font-bold">{trade.ticker || '—'}</Td>
                <Td className="text-fg-muted">{STATUS_LABELS[trade.status]}</Td>
                <Td className="num">{money(trade.entryPrice)}</Td>
                <Td className="num">{money(trade.stopPrice)}</Td>
                <Td className="num">{trade.quantity || '—'}</Td>

                {real ? (
                  <>
                    <Td className={`num font-bold ${tone}`}>
                      {signedMoney(m.pnl)}
                    </Td>
                    <Td className={`num font-bold ${tone}`}>
                      {rMultiple(m.rMultiple)}
                    </Td>
                    <Td>
                      <DisciplineBadge
                        score={riskScoreOf(trade, capital, maxRiskPercent)}
                      />
                    </Td>
                  </>
                ) : (
                  <>
                    <Td className="num">{money(m.riskEgp)}</Td>
                    <Td className={`num font-semibold ${over ? 'text-loss' : ''}`}>
                      {percent(m.riskPct)}
                      {/* Not colour alone — the same rule the app's own
                          over-risk warning follows, so it survives colour
                          blindness and a greyscale screenshot. */}
                      {over && <span className="ms-1 text-xs">فوق الحد</span>}
                    </Td>
                  </>
                )}

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
    <section className="rounded-lg border border-border-default bg-surface p-4 sm:p-5">
      <div className="mb-4">
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
    <div className="rounded-lg border border-border-default bg-surface p-4">
      <p className="text-xs text-fg-muted sm:text-sm">{label}</p>
      <p
        className={`num mt-1.5 whitespace-nowrap text-lg font-bold sm:text-2xl ${
          tone === 'win' ? 'text-win' : tone === 'loss' ? 'text-loss' : ''
        }`}
      >
        {value}
      </p>
      {note && <p className="mt-1 text-xs text-fg-subtle">{note}</p>}
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
