'use client';

import { useEffect, useState } from 'react';
import type { EgxBotHeroData } from '@/lib/egxbot-fetch';

export function EgxBotHeroWidget() {
  const [hero, setHero] = useState<EgxBotHeroData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch('/api/egxbot-hero');
        const data = await res.json();
        if (active && data.ok && data.data) {
          setHero(data.data);
        }
      } catch {
        // Quiet failure to fallback layout
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    const timer = setInterval(load, 30_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  if (loading) {
    return (
      <div className="h-14 animate-pulse rounded-xl border border-border-soft bg-surface-high p-3" />
    );
  }

  if (!hero || (!hero.egx30 && !hero.gainer)) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-soft bg-surface-high/60 p-3.5 shadow-sm backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        <span className="text-xs font-bold text-fg-muted">EGX30 مباشر</span>
      </div>

      <div className="flex items-center gap-4 text-xs font-medium">
        {hero.egx30 && (
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-fg">EGX30:</span>
            <span className="font-mono font-bold text-fg">
              {Math.round(hero.egx30.price).toLocaleString('en-US')}
            </span>
            <span
              className={`font-mono font-bold ${
                hero.egx30.changePercent >= 0
                  ? 'text-emerald-500'
                  : 'text-rose-500'
              }`}
            >
              {hero.egx30.changePercent >= 0 ? '+' : ''}
              {(hero.egx30.changePercent * 100).toFixed(2)}%
            </span>
          </div>
        )}

        {hero.gainer && (
          <div className="flex items-center gap-1.5 border-r border-border-soft pr-4">
            <span className="font-semibold text-fg-muted">الأعلى صعوداً:</span>
            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono font-bold text-emerald-500">
              {hero.gainer.code}
            </span>
            <span className="font-mono font-bold text-emerald-500">
              +{(hero.gainer.changePercent * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
