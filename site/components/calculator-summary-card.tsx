'use client';

import { useState } from 'react';
import type { SmartTradePlan } from '@/lib/smart-trade';
import { money, percent, quantity } from '@/lib/format';
import { CheckCircleIcon, XIcon } from '@/components/icons';

export function CalculatorSummaryCard({
  plan,
  onTradeCreate,
}: {
  plan: SmartTradePlan;
  onTradeCreate?: () => void;
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { sizing, quality, rewardRiskRatio, expectedProfit, expectedLoss } = plan;
  const resolved = rewardRiskRatio !== null && sizing.effectiveQty !== null;

  function copyText(key: string, text: string | null) {
    if (!text || !resolved) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  const borderTone =
    resolved && plan.rewardBeatsRisk
      ? 'border-win/40 ring-1 ring-win/20'
      : resolved
        ? 'border-loss/40 ring-1 ring-loss/20'
        : 'border-border-default';

  return (
    <div className={`space-y-4 rounded-2xl border bg-surface p-4 sm:p-5 shadow-sm ${borderTone}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-extrabold text-fg sm:text-base">ملخص الصفقة</h3>
        {quality && rewardRiskRatio !== null && (
          <VerdictBadge quality={quality} ratio={rewardRiskRatio} />
        )}
      </div>

      {!resolved && (
        <p className="text-xs text-fg-subtle">
          اكتب سعر الدخول وحدّد الهدف والاستوب، والباقي هيتحسب هنا.
        </p>
      )}

      {/* 2x2 Grid — Always rendered */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-border-default bg-surface-low p-3">
          <span className="block text-[11px] font-semibold text-fg-subtle">الأسهم المقترحة</span>
          <span className="num mt-0.5 block text-xl font-extrabold text-fg sm:text-2xl">
            {resolved ? quantity(sizing.effectiveQty) : '—'}
          </span>
        </div>

        <div className="rounded-xl border border-border-default bg-surface-low p-3">
          <span className="block text-[11px] font-semibold text-fg-subtle">قيمة المركز</span>
          <span className="num mt-0.5 block text-xl font-extrabold text-fg sm:text-2xl">
            {resolved ? money(sizing.positionValue) : '—'}
          </span>
        </div>

        <div className="rounded-xl border border-win-border/50 bg-win-surface/40 p-3">
          <span className="block text-[11px] font-semibold text-fg-subtle">لو وصل الهدف</span>
          <span className="num mt-0.5 block text-base font-extrabold text-win sm:text-lg">
            {resolved ? `+${money(expectedProfit)}` : '—'}
          </span>
        </div>

        <div className="rounded-xl border border-loss-border/50 bg-loss-surface/40 p-3">
          <span className="block text-[11px] font-semibold text-fg-subtle">لو ضرب الاستوب</span>
          <span className="num mt-0.5 block text-base font-extrabold text-loss sm:text-lg">
            {resolved ? `-${money(Math.abs(expectedLoss ?? 0))}` : '—'}
          </span>
        </div>
      </div>

      {/* Risk sub-line */}
      <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-fg-muted pt-1">
        <span>
          المخاطرة من رأس المال: <strong className="num text-fg">{percent(sizing.riskPct)}</strong>
        </span>
        <span>
          حدّك المسموح <strong className="num text-fg">{money(sizing.maxLoss)}</strong> على الصفقة
        </span>
      </div>

      {/* Warning if over risk */}
      {sizing.overRisk && (
        <div className="rounded-lg border border-loss-border bg-loss-surface p-2.5 text-xs font-bold text-loss">
          ⚠️ أقصى كمية مسموحة بتتجاوز حد المخاطرة كلياً.
        </div>
      )}

      {/* Copy Action Buttons */}
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          disabled={!resolved}
          onClick={() => copyText('target', plan.takeProfitPrice ? String(plan.takeProfitPrice) : null)}
          className="flex-1 rounded-lg border border-border-default bg-surface-high py-2 px-2.5 text-center text-xs font-bold text-fg hover:bg-surface-subtle disabled:opacity-50 disabled:pointer-events-none transition-colors"
        >
          {copiedKey === 'target' ? '✓ تم النسخ' : '📋 نسخ سعر الهدف'}
        </button>
        <button
          type="button"
          disabled={!resolved}
          onClick={() => copyText('stop', plan.stopLossPrice ? String(plan.stopLossPrice) : null)}
          className="flex-1 rounded-lg border border-border-default bg-surface-high py-2 px-2.5 text-center text-xs font-bold text-fg hover:bg-surface-subtle disabled:opacity-50 disabled:pointer-events-none transition-colors"
        >
          {copiedKey === 'stop' ? '✓ تم النسخ' : '📋 نسخ سعر الاستوب'}
        </button>
        <button
          type="button"
          disabled={!resolved}
          onClick={() => copyText('qty', sizing.effectiveQty ? String(sizing.effectiveQty) : null)}
          className="flex-1 rounded-lg border border-border-default bg-surface-high py-2 px-2.5 text-center text-xs font-bold text-fg hover:bg-surface-subtle disabled:opacity-50 disabled:pointer-events-none transition-colors"
        >
          {copiedKey === 'qty' ? '✓ تم النسخ' : '📋 نسخ الكمية'}
        </button>
      </div>

      {/* Create Trade Button */}
      {onTradeCreate && (
        <button
          type="button"
          disabled={!resolved}
          onClick={onTradeCreate}
          className="mt-2 w-full rounded-xl bg-brand py-3 text-center text-sm font-extrabold text-on-brand shadow-md hover:brightness-105 disabled:opacity-50 disabled:pointer-events-none transition-all"
        >
          ✨ إنشاء الصفقة
        </button>
      )}
    </div>
  );
}

function VerdictBadge({ quality, ratio }: { quality: string; ratio: number }) {
  const isGood = quality === 'good';
  const isWarning = quality === 'warning';
  const label = isGood ? 'صفقة جيدة' : isWarning ? 'المخاطرة مرتفعة' : 'العائد لا يبرر المخاطرة';
  const Icon = isGood ? CheckCircleIcon : XIcon;

  const tone = isGood
    ? 'border-win-border bg-win-surface text-win'
    : isWarning
      ? 'border-breakeven-border bg-breakeven-surface text-breakeven'
      : 'border-loss-border bg-loss-surface text-loss';

  return (
    <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${tone}`}>
      <Icon className="size-3.5" />
      <span className="num">{ratio.toFixed(2)}R</span>
      <span>{label}</span>
    </div>
  );
}
