'use client';

import { money, signedMoney } from '@/lib/format';
import type { Trade } from '@/lib/trade';
import { metricsOf } from '@/lib/trade';

export function TodaySummaryBanner({
  trades,
  capital,
}: {
  trades: Trade[];
  capital: number;
}) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const thisMonthTrades = trades.filter((t) => {
    if (!t.exitDate) return false;
    const date = new Date(t.exitDate);
    return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
  });

  if (thisMonthTrades.length === 0) return null;

  let monthPnl = 0;
  let wins = 0;

  for (const trade of thisMonthTrades) {
    const { pnl, result } = metricsOf(trade, capital);
    if (pnl !== null) {
      monthPnl += pnl;
      if (result === 'win') wins++;
    }
  }

  const winRate = Math.round((wins / thisMonthTrades.length) * 100);
  const isWin = monthPnl >= 0;

  return (
    <div
      className={`mb-4 flex items-center justify-between rounded-lg border p-4 transition-colors ${
        isWin
          ? 'border-win-border bg-win-surface text-win'
          : 'border-loss-border bg-loss-surface text-loss'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex size-10 items-center justify-center rounded-full ${
            isWin ? 'bg-win/15' : 'bg-loss/15'
          }`}
        >
          <span className="text-xl font-bold">{isWin ? '↑' : '↓'}</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-fg-muted">
            أداء شهر {currentMonth + 1}/{currentYear}
          </p>
          <p className="num text-lg font-bold">{signedMoney(monthPnl)}</p>
        </div>
      </div>

      <div className="text-end">
        <p className="num text-xs font-bold text-fg">{winRate}% نجاح</p>
        <p className="num text-xs text-fg-muted">
          {thisMonthTrades.length} صفقات مقفولة
        </p>
      </div>
    </div>
  );
}
