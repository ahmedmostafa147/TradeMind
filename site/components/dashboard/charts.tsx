'use client';

import { money, signedMoney } from '@/lib/format';
import type { EquityPoint, PeriodPnl } from '@/lib/analytics';

/**
 * The dashboard's two charts, drawn as plain SVG.
 *
 * No charting library: the two shapes here are a polyline and a column, the
 * bundle is served to every visitor, and a library would arrive with its own
 * colour system to fight the palette. Both read their colours from the design
 * tokens, so they follow the theme without a redraw.
 *
 * Rendered LTR inside the RTL page, for the same reason `.num` is: time runs
 * left-to-right on every charting surface a trader has ever used.
 */

const W = 760;
const H = 260;
const PAD = { top: 16, right: 12, bottom: 26, left: 12 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

function shortDate(date: Date): string {
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function EquityChart({ points }: { points: EquityPoint[] }) {
  // One closed trade gives a curve with two points, which is a line — below
  // that there is no shape to draw and a single dot would read as a bug.
  if (points.length < 2) {
    return (
      <Empty>
        الرسم بيظهر بعد أول صفقة مقفولة — محتاج نقطتين على الأقل عشان يبقى فيه
        خط.
      </Empty>
    );
  }

  const values = points.map((p) => p.equity);
  let min = Math.min(...values);
  let max = Math.max(...values);
  // A perfectly flat curve has no range to divide by; give it one so the line
  // lands in the middle instead of at NaN.
  if (max === min) {
    max = max + 1;
    min = min - 1;
  }
  const pad = (max - min) * 0.1;
  min -= pad;
  max += pad;

  const x = (i: number) => PAD.left + (i * PLOT_W) / (points.length - 1);
  const y = (v: number) => PAD.top + ((max - v) / (max - min)) * PLOT_H;

  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)} ${y(p.equity)}`)
    .join(' ');

  const last = points[points.length - 1].equity;
  const first = points[0].equity;
  const up = last >= first;
  const stroke = up ? 'var(--win)' : 'var(--loss)';

  // The baseline is where the curve started, not zero: the eye should read
  // "ahead of / behind where you began", which is the question the curve
  // answers. A zero baseline would push the whole shape to the top of the box.
  const baseY = y(first);

  return (
    <figure className="m-0" dir="ltr">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`منحنى الربح التراكمي عبر ${points.length - 1} صفقة مقفولة، ينتهي عند ${money(last)}`}
      >
        <defs>
          <linearGradient id="eq-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        <line
          x1={PAD.left}
          y1={baseY}
          x2={PAD.left + PLOT_W}
          y2={baseY}
          stroke="var(--border-strong)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        <path
          d={`${line} L${x(points.length - 1)} ${baseY} L${x(0)} ${baseY} Z`}
          fill="url(#eq-fill)"
        />
        <path
          d={line}
          fill="none"
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle
          cx={x(points.length - 1)}
          cy={y(last)}
          r="4.5"
          fill={stroke}
          stroke="var(--surface)"
          strokeWidth="2.5"
        />
      </svg>

      <figcaption className="mt-3 flex justify-between text-xs text-fg-subtle">
        <span className="num">{shortDate(points[0].date)}</span>
        <span className="num">{shortDate(points[points.length - 1].date)}</span>
      </figcaption>
    </figure>
  );
}

export function MonthlyBars({ periods }: { periods: PeriodPnl[] }) {
  if (periods.length === 0) {
    return <Empty>مفيش شهور فيها صفقات مقفولة لسه.</Empty>;
  }

  // Only the last twelve buckets. Beyond that the columns get thinner than
  // their own gap and the chart stops being readable.
  const shown = periods.slice(-12);
  const peak = Math.max(...shown.map((p) => Math.abs(p.pnl)), 1);

  // A zero line in the MIDDLE, always — not positioned by the data. A month
  // with only wins would otherwise put zero at the floor, and the next month
  // with a loss would move the whole baseline, making two screenshots of the
  // same journal incomparable.
  const zeroY = PAD.top + PLOT_H / 2;
  const halfH = PLOT_H / 2;
  const slot = PLOT_W / shown.length;
  const barW = Math.min(slot * 0.6, 46);

  return (
    <figure className="m-0" dir="ltr">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`ربح وخسارة آخر ${shown.length} شهر`}
      >
        <line
          x1={PAD.left}
          y1={zeroY}
          x2={PAD.left + PLOT_W}
          y2={zeroY}
          stroke="var(--border-strong)"
          strokeWidth="1"
        />

        {shown.map((p) => {
          const i = shown.indexOf(p);
          const cx = PAD.left + slot * i + slot / 2;
          const h = (Math.abs(p.pnl) / peak) * (halfH - 8);
          const up = p.pnl >= 0;
          return (
            <g key={p.start.getTime()}>
              <rect
                x={cx - barW / 2}
                y={up ? zeroY - h : zeroY}
                width={barW}
                height={Math.max(h, 1)}
                rx="3"
                fill={up ? 'var(--win)' : 'var(--loss)'}
                opacity="0.85"
              />
              <text
                x={cx}
                y={H - 8}
                textAnchor="middle"
                fontSize="11"
                fill="var(--fg-subtle)"
              >
                {p.start.getMonth() + 1}/{String(p.start.getFullYear()).slice(2)}
              </text>
            </g>
          );
        })}
      </svg>

      <figcaption className="mt-3 text-center text-xs text-fg-subtle">
        أعلى شهر بالقيمة المطلقة:{' '}
        <span className="num font-semibold">{signedMoney(
          shown.reduce((a, b) => (Math.abs(b.pnl) > Math.abs(a.pnl) ? b : a)).pnl
        )}</span>
      </figcaption>
    </figure>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="grid h-40 place-items-center rounded-md border border-dashed border-border-default px-6 text-center text-sm text-fg-muted">
      {children}
    </p>
  );
}
