'use client';

import { useMemo, useState } from 'react';

import { Field } from '@/components/calculator-fields';
import { money, quantity } from '@/lib/format';
import { computePlainPosition } from '@/lib/plain-position';
import { parseNumber } from '@/lib/risk-math';

/**
 * «حاسبة بسيطة» — cash ↔ shares at a price, and nothing else.
 *
 * Three boxes. The price is required; whichever of the other two was typed
 * LAST is the input and the remaining one is the answer, so the trader can
 * flip the question by just typing in the other box. Typing in «عدد الأسهم»
 * clears «المبلغ» and vice versa, so the two never show a stale pair.
 */
export function CalculatorPlain({ initialPrice }: { initialPrice: string }) {
  const [price, setPrice] = useState(initialPrice);
  const [budget, setBudget] = useState('');
  const [shares, setShares] = useState('');

  const result = useMemo(
    () =>
      computePlainPosition({
        price: parseNumber(price),
        budget: parseNumber(budget),
        shares: parseNumber(shares),
      }),
    [price, budget, shares],
  );

  return (
    <div className="space-y-4">
      <Field
        id="plain-price"
        label="سعر السهم"
        suffix="ج.م"
        value={price}
        onChange={setPrice}
        error={!price.trim() ? 'اكتب سعر السهم' : null}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id="plain-budget"
          label="هدخل بمبلغ"
          suffix="ج.م"
          value={budget}
          onChange={(v) => {
            setBudget(v);
            if (v.trim() !== '') setShares('');
          }}
          hint="واكتب لك كام سهم"
        />
        <Field
          id="plain-shares"
          label="أو عدد الأسهم"
          suffix="سهم"
          value={shares}
          onChange={(v) => {
            setShares(v);
            if (v.trim() !== '') setBudget('');
          }}
          hint="واكتب لك التكلفة"
        />
      </div>

      <div className="rounded-2xl border border-border-default bg-surface p-4 sm:p-5">
        {result === null ? (
          <p className="text-xs text-fg-subtle">
            اكتب السعر، وبعدين المبلغ أو عدد الأسهم — والتاني بيتحسب هنا.
          </p>
        ) : result.kind === 'from-budget' ? (
          <div className="grid grid-cols-2 gap-2.5">
            <Stat label="عدد الأسهم" value={quantity(result.shares)} big />
            <Stat label="التكلفة" value={money(result.cost)} />
            <Stat label="يفضل معاك" value={money(result.leftover)} />
            <Stat label="سعر السهم" value={money(result.price)} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            <Stat label="التكلفة" value={money(result.cost)} big />
            <Stat label="عدد الأسهم" value={quantity(result.shares)} />
            <Stat label="سعر السهم" value={money(result.price)} />
          </div>
        )}

        {/* The one thing this mode must say about itself: it sized nothing
            against a stop. The number is arithmetic, not a plan. */}
        <p className="mt-3 text-[11px] leading-relaxed text-fg-subtle">
          دي قسمة وبس — مفيش استوب ولا حد مخاطرة هنا. عشان تعرف الكمية اللي
          تحميك لو السهم نزل، استخدم «الحاسبة الذكية».
        </p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  big = false,
}: {
  label: string;
  value: string;
  big?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border-default bg-surface-low p-3">
      <span className="block text-[11px] font-semibold text-fg-subtle">
        {label}
      </span>
      <span
        className={`num mt-0.5 block font-extrabold text-fg ${
          big ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
