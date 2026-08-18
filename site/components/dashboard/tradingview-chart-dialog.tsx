'use client';

import { XIcon } from '@/components/icons';

import { useEffect, useRef } from 'react';

export function TradingViewChartDialog({
  symbol,
  onClose,
}: {
  symbol: string;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanSymbol = symbol.trim().toUpperCase().replace('.CA', '');

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: `EGX:${cleanSymbol}`,
      interval: 'D',
      timezone: 'Africa/Cairo',
      theme: 'dark',
      style: '1',
      locale: 'ar',
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      support_host: 'https://www.tradingview.com',
    });

    containerRef.current.appendChild(script);
  }, [cleanSymbol]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border-strong bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border-default px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-fg">شارت TradingView — {cleanSymbol}</span>
          </div>
          <button
            type="button"
            aria-label="اقفل الشارت"
            onClick={onClose}
            className="rounded-md p-1.5 text-fg-muted hover:bg-surface-high hover:text-fg"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="relative flex-1 bg-black">
          <div
            ref={containerRef}
            className="tradingview-widget-container h-full w-full"
          />
        </div>
      </div>
    </div>
  );
}
