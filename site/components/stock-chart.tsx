/**
 * The price chart for the hero's example trade.
 *
 * Drawn from the SAME numbers the trade card renders, so the two visuals cannot
 * disagree — the entry marker sits on the entry price by construction, not
 * because a designer placed it there. Everything below is derived: the scale,
 * the path, the marker positions and the label offsets.
 *
 * The series is an ILLUSTRATION, not EGX data, and the caption says so. The app
 * pulls real closes at runtime; a marketing page that ships a hard-coded series
 * dressed up as live market data is claiming something it cannot back.
 *
 * Rendered LTR inside the RTL page, for the same reason `.num` is: time runs
 * left-to-right on every charting surface a trader has ever used, and mirroring
 * it would make an EGX chart read backwards against the terminal beside it.
 */

type StockChartProps = {
  ticker: string;
  /** Daily closes, oldest first. */
  closes: number[];
  entryIndex: number;
  exitIndex: number;
  entryPrice: number;
  stopPrice: number;
  takeProfitPrice: number;
};

const VIEW_W = 720;
const VIEW_H = 180;
const PAD = { top: 14, right: 56, bottom: 20, left: 10 };

const PLOT_W = VIEW_W - PAD.left - PAD.right;
const PLOT_H = VIEW_H - PAD.top - PAD.bottom;

export function StockChart({
  ticker,
  closes,
  entryIndex,
  exitIndex,
  entryPrice,
  stopPrice,
  takeProfitPrice,
}: StockChartProps) {
  // The stop and the target are part of the picture even when price never
  // reaches them — a chart scaled to the closes alone would push the stop line
  // off-canvas, which is the one level the whole product argument rests on.
  const lo = Math.min(stopPrice, ...closes);
  const hi = Math.max(takeProfitPrice, ...closes);
  const pad = (hi - lo) * 0.08;
  const min = lo - pad;
  const max = hi + pad;

  const x = (i: number) => PAD.left + (i * PLOT_W) / (closes.length - 1);
  const y = (v: number) => PAD.top + ((max - v) / (max - min)) * PLOT_H;

  const line = closes.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)} ${y(v)}`).join(' ');
  const area = `${line} L${x(closes.length - 1)} ${PAD.top + PLOT_H} L${x(0)} ${
    PAD.top + PLOT_H
  } Z`;

  const levels = [
    { value: takeProfitPrice, label: 'الهدف', color: 'var(--fg-subtle)' },
    { value: entryPrice, label: 'الدخول', color: 'var(--fg-muted)' },
    { value: stopPrice, label: 'الاستوب', color: 'var(--loss)' },
  ];

  return (
    <figure className="m-0" dir="ltr">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`شارت توضيحي لسهم ${ticker}: دخول عند ${entryPrice}، استوب عند ${stopPrice}، هدف عند ${takeProfitPrice}، وخروج عند ${closes[exitIndex]}`}
      >
        <defs>
          <linearGradient id="chart-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--win)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--win)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Baseline only. A full grid would put eight more lines behind a shape
            whose whole job is to be read at a glance. */}
        <line
          x1={PAD.left}
          y1={PAD.top + PLOT_H}
          x2={PAD.left + PLOT_W}
          y2={PAD.top + PLOT_H}
          stroke="var(--border)"
          strokeWidth="1"
        />

        {levels.map((level) => (
          <g key={level.label}>
            <line
              x1={PAD.left}
              y1={y(level.value)}
              x2={PAD.left + PLOT_W}
              y2={y(level.value)}
              stroke={level.color}
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.75"
            />
            <text
              x={PAD.left + PLOT_W + 8}
              y={y(level.value) + 4}
              fill={level.color}
              fontSize="12"
              fontWeight="600"
            >
              {level.value.toFixed(2)}
            </text>
          </g>
        ))}

        <path d={area} fill="url(#chart-fade)" />
        <path
          d={line}
          fill="none"
          stroke="var(--win)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Entry and exit. Hollow for the entry, filled for the exit: the two
            markers have to be told apart without relying on their colour. */}
        <circle
          cx={x(entryIndex)}
          cy={y(closes[entryIndex])}
          r="5.5"
          fill="var(--surface)"
          stroke="var(--fg)"
          strokeWidth="2.5"
        />
        <circle
          cx={x(exitIndex)}
          cy={y(closes[exitIndex])}
          r="5.5"
          fill="var(--win)"
          stroke="var(--surface)"
          strokeWidth="2.5"
        />
      </svg>

      <figcaption className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-fg-subtle">
        <span className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-full border-2 border-fg bg-surface"
            aria-hidden
          />
          دخول
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-win" aria-hidden />
          خروج
        </span>
        <span>
          مثال توضيحي على{' '}
          <span className="num font-semibold text-fg-muted">{ticker}</span> —
          الأسعار مش بيانات سوق حقيقية، والأرقام كلها متحسبة من نفس الخطة
        </span>
      </figcaption>
    </figure>
  );
}
