'use client';

/**
 * A round badge showing a ticker's first letters on a colour derived from the
 * ticker itself.
 */
const PALETTE = [
  'bg-blue-600 text-white',
  'bg-indigo-600 text-white',
  'bg-purple-600 text-white',
  'bg-sky-600 text-white',
  'bg-teal-600 text-white',
  'bg-cyan-600 text-white',
  'bg-amber-600 text-white',
  'bg-pink-600 text-white',
  'bg-slate-600 text-white',
];

export function TickerAvatar({
  ticker,
  size = 'md',
}: {
  ticker: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const clean = ticker.trim();
  const initials =
    clean.length === 0
      ? '؟'
      : clean.length <= 2
        ? clean.toUpperCase()
        : clean.substring(0, 2).toUpperCase();

  var hash = 0;
  for (var i = 0; i < clean.length; i++) {
    hash = (hash * 31 + clean.charCodeAt(i)) & 0x7fffffff;
  }
  const colorClass = PALETTE[hash % PALETTE.length];

  const sizeClass =
    size === 'sm'
      ? 'size-7 text-xs font-bold'
      : size === 'lg'
        ? 'size-12 text-base font-extrabold'
        : 'size-9 text-xs font-extrabold';

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${sizeClass} ${colorClass} shadow-sm`}
    >
      {initials}
    </span>
  );
}
