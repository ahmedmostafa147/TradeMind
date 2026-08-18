'use client';

import { useEffect, useState } from 'react';
import type { EgxBotHeroData } from '@/lib/egxbot-fetch';
import { TrendingUpIcon } from '@/components/icons';

/** Slow enough to be polite to a third party, quick enough to feel current. */
const POLL_MS = 60_000;

/**
 * EGX30 and the session's leader, as EGXBot has them.
 *
 * ── IT DOES NOT SAY «مباشر» ────────────────────────────────────────────────
 *
 * It used to, next to a pulsing green dot. The source declares no delay at all
 * (see `EgxBotHeroData`), so the claim had nothing behind it, and the project
 * already banned that wording in five other places for the weaker case where a
 * delay was at least known.
 *
 * ── AND IT STOPS POLLING WHEN NOBODY IS LOOKING ────────────────────────────
 *
 * The interval used to run for the lifetime of the panel. A dashboard left open
 * in a background tab kept a request every 30 seconds going to someone else's
 * server forever. Hidden tabs now skip the fetch, and a tab coming back to the
 * foreground refreshes immediately rather than waiting out the rest of a tick.
 */
export function EgxBotHeroWidget() {
  const [hero, setHero] = useState<EgxBotHeroData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      if (document.visibilityState === 'hidden') return;
      try {
        const res = await fetch('/api/egxbot-hero');
        const data = await res.json();
        if (active && data.ok && data.data) setHero(data.data);
      } catch {
        // Quiet: the widget simply keeps the last figure, or stays hidden.
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    const timer = setInterval(load, POLL_MS);
    document.addEventListener('visibilitychange', load);

    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
    };
  }, []);

  if (loading) {
    return (
      <div className="h-14 animate-pulse rounded-xl border border-border-default bg-surface-high p-3" />
    );
  }

  if (!hero || (!hero.egx30 && !hero.gainer)) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-border-default bg-surface-high/60 p-3.5 shadow-xs">
      {hero.egx30 && (
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-fg-muted">مؤشر EGX30</span>
          <span className="num font-extrabold text-fg">
            {Math.round(hero.egx30.price).toLocaleString('en-US')}
          </span>
          <ChangeChip percent={hero.egx30.changePercent} />
        </div>
      )}

      {hero.gainer && (
        <div className="flex items-center gap-2 text-xs">
          <TrendingUpIcon className="size-3.5 text-fg-subtle" />
          <span className="font-bold text-fg-muted">الأعلى صعودًا</span>
          <span className="num rounded bg-surface px-1.5 py-0.5 font-extrabold text-fg">
            {hero.gainer.code}
          </span>
          <ChangeChip percent={hero.gainer.changePercent} />
        </div>
      )}

      <p className="w-full text-[11px] text-fg-subtle sm:w-auto">
        المصدر: EGXBot — استرشادي، ومش سعر لحظي.
      </p>
    </div>
  );
}

/** Percent units in, a win/loss-coloured chip out. */
function ChangeChip({ percent }: { percent: number }) {
  const up = percent >= 0;
  return (
    <span
      className={`num rounded px-1.5 py-0.5 font-extrabold ${
        up ? 'bg-win-surface text-win' : 'bg-loss-surface text-loss'
      }`}
    >
      {up ? '+' : ''}
      {percent.toFixed(2)}%
    </span>
  );
}
