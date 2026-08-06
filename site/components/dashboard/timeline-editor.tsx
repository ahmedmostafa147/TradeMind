'use client';

import { useState } from 'react';

import { dateLabel } from '@/lib/format';
import type { TimelineEntry } from '@/lib/trade';

/**
 * The dated log of what happened to a trade after it was opened.
 *
 * The browser could read these and never write one, which cost more than a
 * missing feature: «قرار اليوم» measures "last touch" from the newest entry, so
 * with no way to add one, every open position on the web looked untouched since
 * the day it was entered and «محتاجة ملاحظة» fired on trades the phone
 * considered handled.
 *
 * Its own file rather than another block inside trade-form.tsx, which is long
 * enough already — and it mirrors lib/trades/widgets/timeline_editor.dart, so
 * the two surfaces stay easy to compare.
 */

const MAX_TEXT = 500;

/** `<input type="date">` speaks local YYYY-MM-DD, never an ISO instant. */
function toDateInput(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Local midnight, not UTC. `new Date('2026-03-05')` is UTC midnight, which
 * renders as the 4th in any negative offset — a note silently dated a day
 * early. Same guard the trade form applies to the entry date.
 */
function fromDateInput(value: string): Date | null {
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [y, m, d] = parts;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function TimelineEditor({
  entries,
  onChange,
}: {
  entries: TimelineEntry[];
  onChange: (next: TimelineEntry[]) => void;
}) {
  const [date, setDate] = useState(toDateInput(new Date()));
  const [text, setText] = useState('');

  function add() {
    const trimmed = text.trim();
    const on = fromDateInput(date);
    if (!trimmed || !on) return;

    // Stored chronologically so the array reads as a log. `_lastTouch` scans
    // every entry either way, so this is for humans, not for the rule.
    const next = [...entries, { date: on, text: trimmed.slice(0, MAX_TEXT) }].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );
    onChange(next);
    setText('');
  }

  function removeAt(index: number) {
    onChange(entries.filter((_, i) => i !== index));
  }

  // Newest first for reading; the stored order stays chronological.
  const shown = entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => b.entry.date.getTime() - a.entry.date.getTime());

  return (
    <fieldset className="rounded-lg border border-border-default p-4">
      <legend className="px-2 text-sm font-bold">
        <span className="inline-flex items-center gap-2">
          تايم لاين الصفقة
          <span className="num font-normal text-fg-subtle">
            {entries.length}
          </span>
        </span>
      </legend>

      {shown.length > 0 && (
        <ul className="mb-4 space-y-2">
          {shown.map(({ entry, index }) => (
            <li
              key={`${entry.date.getTime()}-${index}`}
              className="flex items-start gap-3 rounded-md border border-border-default bg-surface-low px-3 py-2"
            >
              <span className="num shrink-0 pt-0.5 text-xs text-fg-subtle">
                {dateLabel(entry.date)}
              </span>
              <span className="flex-1 text-sm leading-relaxed">{entry.text}</span>
              <button
                type="button"
                onClick={() => removeAt(index)}
                aria-label={`احذف ملاحظة ${dateLabel(entry.date)}`}
                className="shrink-0 rounded px-2 text-sm font-semibold text-fg-subtle transition-colors hover:text-loss"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto]">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="تاريخ الملاحظة"
          dir="ltr"
          className="rounded-md border border-border-default bg-surface-low px-3 py-2.5 outline-none transition-colors focus:border-brand-ink"
        />
        <input
          value={text}
          maxLength={MAX_TEXT}
          onChange={(e) => setText(e.target.value)}
          // Enter inside a form submits it. This field adds a note instead —
          // saving the whole trade because someone finished typing a line of
          // the log is not what the key means here.
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          aria-label="نص الملاحظة"
          placeholder="حرّكت الاستوب لسعر الدخول"
          className="rounded-md border border-border-default bg-surface-low px-3 py-2.5 text-start outline-none transition-colors focus:border-brand-ink"
        />
        <button
          type="button"
          onClick={add}
          disabled={!text.trim()}
          className="rounded-md border border-border-strong px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-surface-high disabled:opacity-50"
        >
          أضف
        </button>
      </div>

      <p className="mt-3 text-xs text-fg-subtle">
        الملاحظات دي بتوصل لتطبيق التليفون، وآخر واحدة فيها هي اللي «قرار اليوم»
        بيحسب منها إن الصفقة لسه متابَعة.
      </p>
    </fieldset>
  );
}
