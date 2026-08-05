'use client';

import { useState } from 'react';

import { cairoDate, type FlowTable, type MarketFlows } from '@/lib/market-flows';
import { parseNumber } from '@/lib/risk-math';

/**
 * Typing in a session by hand.
 *
 * WHY THIS EXISTS RATHER THAN A BETTER SCRAPER. egx.com.eg sits behind F5 Shape
 * bot defence — the response carries `window["bobcmn"]` and TSPD cookies, which
 * is a commercial product whose entire purpose is that a scripted HTTP client
 * cannot pass it. No header set or cookie jar gets through, by design, and
 * engineering around it is neither reliable nor the right thing to do to a
 * source that has said no this clearly. So the automatic route stays as it is,
 * failing loudly, and this is the path that works today.
 *
 * TWELVE FIELDS, NOT TWENTY-SEVEN. The exchange publishes three tables of three
 * rows of three figures, but they are not independent: `all` is exactly
 * `institutions + individuals` (verified against a captured session — Egyptians
 * 313,396,606 + 55,489,055 = 368,885,661, and the same holds for every other
 * cell), and `net` is `bought − sold`. So only bought and sold for the two real
 * classes are typed; the rest is derived. Six fewer chances to fat-finger a
 * nine-digit number, and the totals can never disagree with their parts.
 *
 * DERIVING NET ALSO SETTLES A REAL AMBIGUITY. In the exchange's own HTML it is
 * genuinely unclear whether a positive net means bought or sold — the column
 * order has to be read from the headers to know, which is why the parser does
 * exactly that. Here there is nothing to read: the operator types the two
 * figures whose names cannot be misread, and net is defined as bought − sold,
 * positive meaning net buyer.
 */

const NATIONALITY_FIELDS = [
  { key: 'egyptian', label: 'مصريين' },
  { key: 'arab', label: 'عرب' },
  { key: 'foreign', label: 'أجانب' },
] as const;

const CLASS_FIELDS = [
  { key: 'institutions', label: 'مؤسسات' },
  { key: 'individuals', label: 'أفراد' },
] as const;

type Key = `${(typeof CLASS_FIELDS)[number]['key']}.${(typeof NATIONALITY_FIELDS)[number]['key']}.${'bought' | 'sold'}`;

function emptyValues(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of CLASS_FIELDS) {
    for (const n of NATIONALITY_FIELDS) {
      out[`${c.key}.${n.key}.bought`] = '';
      out[`${c.key}.${n.key}.sold`] = '';
    }
  }
  return out;
}

export function ManualFlowsForm({
  onSave,
}: {
  onSave: (flows: MarketFlows) => Promise<void>;
}) {
  const [date, setDate] = useState(cairoDate());
  const [values, setValues] = useState<Record<string, string>>(emptyValues);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  function set(key: Key, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function build(): MarketFlows | null {
    const row = (cls: string, nat: string) => {
      const bought = parseNumber(values[`${cls}.${nat}.bought`] ?? '');
      const sold = parseNumber(values[`${cls}.${nat}.sold`] ?? '');
      if (bought === null || sold === null || bought < 0 || sold < 0) return null;
      return { bought, sold, net: bought - sold, netMismatch: false };
    };

    const table = (cls: string): FlowTable | null => {
      const egyptian = row(cls, 'egyptian');
      const arab = row(cls, 'arab');
      const foreign = row(cls, 'foreign');
      if (!egyptian || !arab || !foreign) return null;
      return { egyptian, arab, foreign };
    };

    const institutions = table('institutions');
    const individuals = table('individuals');
    if (!institutions || !individuals) return null;

    // Derived, never typed — see the note above.
    const all: FlowTable = {
      egyptian: sum(institutions.egyptian, individuals.egyptian),
      arab: sum(institutions.arab, individuals.arab),
      foreign: sum(institutions.foreign, individuals.foreign),
    };

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

    return { date, all, institutions, individuals };
  }

  async function save() {
    const flows = build();
    if (flows === null) {
      setError('املا كل الخانات بأرقام صحيحة، والتاريخ لازم يكون بصيغة YYYY-MM-DD.');
      setDone(null);
      return;
    }
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      await onSave(flows);
      setDone(`اتخزّنت جلسة ${flows.date}.`);
      setValues(emptyValues());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر الحفظ.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 border-t border-border-default pt-5">
      <h3 className="text-sm font-bold">إدخال يدوي</h3>
      <p className="mt-1 text-xs leading-relaxed text-fg-muted">
        من صفحة تداولات المستثمرين على موقع البورصة. اكتب الشراء والبيع
        للمؤسسات وللأفراد بس — <strong>«الكل» و«الصافي» بيتحسبوا لوحدهم</strong>،
        فمستحيل المجاميع تتعارض مع أجزائها.
      </p>

      <label className="mt-4 block text-sm font-semibold">
        تاريخ الجلسة
        <input
          value={date}
          onChange={(e) => setDate(e.target.value)}
          dir="ltr"
          placeholder="2026-08-05"
          className="num mt-2 w-full max-w-[12rem] rounded-md border border-border-default bg-surface-low px-3 py-2 outline-none focus:border-brand-ink"
        />
      </label>

      <div className="mt-5 space-y-5">
        {CLASS_FIELDS.map((cls) => (
          <div key={cls.key}>
            <p className="text-xs font-bold text-fg-muted">{cls.label}</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              {NATIONALITY_FIELDS.map((nat) => (
                <div
                  key={nat.key}
                  className="rounded-md border border-border-default bg-surface-low p-3"
                >
                  <p className="text-xs font-semibold">{nat.label}</p>
                  <label className="mt-2 block text-[11px] text-fg-muted">
                    شراء
                    <input
                      inputMode="decimal"
                      dir="ltr"
                      value={values[`${cls.key}.${nat.key}.bought`]}
                      onChange={(e) =>
                        set(`${cls.key}.${nat.key}.bought` as Key, e.target.value)
                      }
                      className="num mt-1 w-full rounded-md border border-border-default bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand-ink"
                    />
                  </label>
                  <label className="mt-2 block text-[11px] text-fg-muted">
                    بيع
                    <input
                      inputMode="decimal"
                      dir="ltr"
                      value={values[`${cls.key}.${nat.key}.sold`]}
                      onChange={(e) =>
                        set(`${cls.key}.${nat.key}.sold` as Key, e.target.value)
                      }
                      className="num mt-1 w-full rounded-md border border-border-default bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand-ink"
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm font-semibold text-loss">
          {error}
        </p>
      )}
      {done && (
        <p
          role="status"
          className="mt-4 rounded-md border border-border-strong bg-surface-high p-3 text-sm"
        >
          {done}
        </p>
      )}

      <button
        type="button"
        onClick={() => void save()}
        disabled={busy}
        className="mt-5 rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {busy ? 'بيتحفظ...' : 'احفظ الجلسة'}
      </button>
    </div>
  );
}

function sum(
  a: FlowTable['egyptian'],
  b: FlowTable['egyptian']
): FlowTable['egyptian'] {
  const bought = a.bought + b.bought;
  const sold = a.sold + b.sold;
  return { bought, sold, net: bought - sold, netMismatch: false };
}
