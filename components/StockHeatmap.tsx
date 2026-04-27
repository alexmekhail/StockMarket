'use client';

import { useEffect, useRef } from 'react';

const WIDGET_CONFIG = {
  dataSource: 'SPX500',
  blockSize: 'market_cap_basic',
  blockColor: 'change',
  grouping: 'sector',
  locale: 'en',
  colorTheme: 'dark',
  isTransparent: true,
  hasTopBar: false,
  isDataSetEnabled: false,
  isZoomEnabled: true,
  hasSymbolTooltip: true,
  isMonoSize: false,
  width: '100%',
  height: '500',
};

export function StockHeatmap() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear any previous widget
    container.innerHTML = '';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    container.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js';
    script.async = true;
    script.innerHTML = JSON.stringify(WIDGET_CONFIG);
    container.appendChild(script);

    return () => {
      container.innerHTML = '';
    };
  }, []);

  return (
    <div className="border border-border rounded overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-bg-tertiary flex items-center justify-between">
        <span className="text-xs font-mono font-semibold text-text-secondary uppercase tracking-wider">
          Market Heatmap
        </span>
        <span className="text-xs font-mono text-text-muted">S&amp;P 500 · Size = Market Cap · Color = Daily % Change</span>
      </div>
      <div
        ref={containerRef}
        className="tradingview-widget-container"
        style={{ height: 500 }}
      />
    </div>
  );
}
