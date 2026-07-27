import { dateLabel, money, percent, quantity, rMultiple, signedMoney } from '@/lib/format';

/**
 * A faithful reproduction of the app's trade row (lib/trades/widgets/trade_tile.dart)
 * and the level strip inside it (trade_levels.dart).
 *
 * Every displayed figure is DERIVED here — position value, risk in EGP, risk
 * percent, P&L and R all come out of the same arithmetic the app uses, from
 * entry/stop/quantity alone. Hand-typing plausible-looking numbers into a
 * marketing mock is how a screenshot ends up showing a 3R win next to a P&L
 * that does not divide into it, and anyone who trades will spot it instantly.
 */

export type TradeMock = {
  ticker: string;
  entryDate: Date;
  entryPrice: number;
  stopPrice: number;
  takeProfitPrice: number | null;
  quantity: number;
  exitPrice: number | null;
  /** Shown only when the position is still running. */
  lastClose?: number;
};

type Result = 'win' | 'loss' | 'breakeven' | 'open';

const resultLabel: Record<Result, string> = {
  win: 'ربح',
  loss: 'خسارة',
  breakeven: 'تعادل',
  open: 'مفتوحة',
};

export function TradeCardMock({
  trade,
  capital,
  maxRiskPercent,
}: {
  trade: TradeMock;
  /** Drives risk percent, exactly as the Settings value does in the app. */
  capital: number;
  /** A fraction: 0.02 is 2%. */
  maxRiskPercent: number;
}) {
  const positionValue = trade.entryPrice * trade.quantity;
  const riskEgp = (trade.entryPrice - trade.stopPrice) * trade.quantity;
  const riskPct = capital > 0 ? riskEgp / capital : null;

  const pnl =
    trade.exitPrice == null
      ? null
      : (trade.exitPrice - trade.entryPrice) * trade.quantity;
  const r = pnl == null || riskEgp === 0 ? null : pnl / riskEgp;

  const result: Result =
    pnl == null ? 'open' : pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'breakeven';

  // The app never compares a risk ratio inline — exceedsRiskLimit() guards it
  // with kRiskEpsilon, because a position sized at exactly the limit by the
  // app's own calculator computes a ratio a few ulps above it and would be
  // flagged as breaking the very rule that produced it.
  const RISK_EPSILON = 1e-9;
  const overRisk = riskPct != null && riskPct > maxRiskPercent + RISK_EPSILON;

  const toneClass =
    result === 'win'
      ? 'text-win'
      : result === 'loss'
        ? 'text-loss'
        : result === 'breakeven'
          ? 'text-breakeven'
          : 'text-fg-muted';

  return (
    <article className="rounded-lg border border-border-default bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-2.5">
        {/* A bar AND an icon AND a sentence, never colour alone — the app's own
            comment on this marker says it must survive a colour-blind viewer. */}
        {overRisk && (
          <span className="h-5 w-1 shrink-0 rounded-sm bg-loss" aria-hidden />
        )}

        <TickerAvatar ticker={trade.ticker} />

        <span className="num text-base font-bold">{trade.ticker}</span>

        <ResultBadge result={result} />

        <span className="num me-auto text-xs text-fg-subtle">
          {dateLabel(trade.entryDate)}
        </span>
      </div>

      {overRisk && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-loss">
          <WarningIcon />
          تحذير: المخاطرة أعلى من الحد المسموح
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        <Level label="الدخول" value={money(trade.entryPrice)} />
        <Level label="الاستوب" value={money(trade.stopPrice)} />
        <Level label="الهدف" value={money(trade.takeProfitPrice)} />
        <Level label="عدد الأسهم" value={quantity(trade.quantity)} />
        <Level label="قيمة المركز" value={money(positionValue)} />
      </div>

      <hr className="my-3 border-t border-border-default" />

      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <Metric
          label="الربح/الخسارة"
          value={signedMoney(pnl)}
          className={pnl == null ? undefined : toneClass}
        />
        <Metric
          label="R"
          value={rMultiple(r)}
          className={r == null ? undefined : toneClass}
        />
        <Metric
          label="نسبة المخاطرة"
          value={percent(riskPct)}
          className={overRisk ? 'text-loss' : undefined}
        />
      </div>

      {/* Only a running position has an unrealised result worth pricing; a
          closed trade already shows its final P&L above. */}
      {trade.exitPrice == null && trade.lastClose != null && (
        <UnrealisedPnl
          lastClose={trade.lastClose}
          entryPrice={trade.entryPrice}
          quantity={trade.quantity}
        />
      )}
    </article>
  );
}

function UnrealisedPnl({
  lastClose,
  entryPrice,
  quantity: qty,
}: {
  lastClose: number;
  entryPrice: number;
  quantity: number;
}) {
  const pnl = (lastClose - entryPrice) * qty;
  const pct = entryPrice > 0 ? ((lastClose - entryPrice) / entryPrice) * 100 : null;
  const positive = pnl >= 0;

  return (
    <div
      className={`mt-3 flex items-center gap-2 rounded-md border p-2.5 ${
        positive
          ? 'border-win-border bg-win-surface'
          : 'border-loss-border bg-loss-surface'
      }`}
    >
      <span className={positive ? 'text-win' : 'text-loss'} aria-hidden>
        {positive ? <TrendUpIcon /> : <TrendDownIcon />}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-fg-muted">ربح/خسارة غير محققة</p>
        <p className={`num text-sm font-bold ${positive ? 'text-win' : 'text-loss'}`}>
          {signedMoney(pnl)}
          {pct != null &&
            ` (${pct > 0 ? '+' : ''}${pct.toFixed(2)}%)`}
        </p>
      </div>
      <div className="me-auto text-end">
        {/* "آخر إغلاق", not "السعر الحالي" — EGX gives a daily close, and the
            app's own comment notes the old label overstated what it is. */}
        <p className="text-[11px] text-fg-muted">آخر إغلاق</p>
        <p className="num text-sm font-bold">{money(lastClose)}</p>
      </div>
    </div>
  );
}

function TickerAvatar({ ticker }: { ticker: string }) {
  // Array.from, not ticker[0] — indexing a string splits a surrogate pair, and
  // the app declares `characters` as a dependency for exactly this reason.
  const initial = Array.from(ticker.trim())[0] ?? '؟';
  return (
    <span
      className="num grid size-9 shrink-0 place-items-center rounded-full bg-surface-highest text-xs font-bold text-fg-muted"
      aria-hidden
    >
      {initial}
    </span>
  );
}

function ResultBadge({ result }: { result: Result }) {
  const styles: Record<Result, string> = {
    win: 'border-win-border bg-win-surface text-win',
    loss: 'border-loss-border bg-loss-surface text-loss',
    // Its own tinted surface, not the neutral surface-high: the breakeven
    // amber only reaches 4.19:1 on grey, which fails AA for a 12px bold badge.
    breakeven: 'border-breakeven-border bg-breakeven-surface text-breakeven',
    open: 'border-border-default bg-surface-high text-fg-muted',
  };
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${styles[result]}`}
    >
      {resultLabel[result]}
    </span>
  );
}

function Level({ label, value }: { label: string; value: string }) {
  const isUnset = value === '—';
  return (
    <div>
      <p className="text-[11px] text-fg-muted">{label}</p>
      {/* Greyed rather than hidden: the slot keeps its place, so the five
          figures stay in the same order on every card. */}
      <p
        className={`num text-sm font-bold ${isUnset ? 'text-fg-subtle' : ''}`}
      >
        {value}
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div>
      <p className="text-[11px] text-fg-muted">{label}</p>
      <p className={`num text-sm font-bold ${className ?? ''}`}>{value}</p>
    </div>
  );
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5 shrink-0" aria-hidden>
      <path d="M12 2.8 1.6 20.4h20.8L12 2.8Zm0 5.6a.9.9 0 0 1 .9.9v4.6a.9.9 0 1 1-1.8 0V9.3a.9.9 0 0 1 .9-.9Zm0 8.1a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1Z" />
    </svg>
  );
}

function TrendUpIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden
    >
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M17 7h4v4" />
    </svg>
  );
}

function TrendDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden
    >
      <path d="m3 7 6 6 4-4 8 8" />
      <path d="M17 17h4v-4" />
    </svg>
  );
}
