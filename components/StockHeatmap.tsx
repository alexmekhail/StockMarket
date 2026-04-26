'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { squarify } from '@/lib/treemap';
import type { Snapshot } from '@/types';
import { formatPrice } from '@/lib/utils';

// Approximate market caps in billions (relative weights for tile sizing)
const HEATMAP_STOCKS = [
  // Electronic Technology
  { id: 'NVDA', marketCap: 3300 },
  { id: 'AAPL', marketCap: 3100 },
  { id: 'AVGO', marketCap: 700 },
  { id: 'AMD', marketCap: 200 },
  { id: 'QCOM', marketCap: 165 },
  { id: 'TXN', marketCap: 185 },
  { id: 'MU', marketCap: 100 },
  { id: 'INTC', marketCap: 95 },
  // Technology Services
  { id: 'MSFT', marketCap: 3100 },
  { id: 'GOOGL', marketCap: 2100 },
  { id: 'META', marketCap: 1450 },
  { id: 'ORCL', marketCap: 460 },
  { id: 'CRM', marketCap: 325 },
  { id: 'ADBE', marketCap: 215 },
  { id: 'NOW', marketCap: 195 },
  { id: 'INTU', marketCap: 180 },
  // Finance
  { id: 'V', marketCap: 580 },
  { id: 'JPM', marketCap: 695 },
  { id: 'MA', marketCap: 475 },
  { id: 'BAC', marketCap: 335 },
  { id: 'GS', marketCap: 220 },
  { id: 'MS', marketCap: 195 },
  { id: 'WFC', marketCap: 235 },
  { id: 'C', marketCap: 125 },
  // Health Technology
  { id: 'LLY', marketCap: 745 },
  { id: 'UNH', marketCap: 495 },
  { id: 'JNJ', marketCap: 395 },
  { id: 'ABBV', marketCap: 335 },
  { id: 'MRK', marketCap: 245 },
  { id: 'TMO', marketCap: 215 },
  { id: 'AMGN', marketCap: 150 },
  { id: 'PFE', marketCap: 155 },
  // Retail Trade
  { id: 'AMZN', marketCap: 2200 },
  { id: 'WMT', marketCap: 745 },
  { id: 'COST', marketCap: 425 },
  { id: 'HD', marketCap: 375 },
  { id: 'MCD', marketCap: 215 },
  { id: 'LOW', marketCap: 145 },
  { id: 'TGT', marketCap: 65 },
  { id: 'NKE', marketCap: 75 },
  // Consumer Durables / Energy
  { id: 'TSLA', marketCap: 795 },
  { id: 'XOM', marketCap: 475 },
  { id: 'CVX', marketCap: 275 },
  { id: 'GM', marketCap: 50 },
  { id: 'F', marketCap: 45 },
  { id: 'COP', marketCap: 130 },
  { id: 'OXY', marketCap: 55 },
  { id: 'EOG', marketCap: 70 },
];

const ALL_TICKERS = HEATMAP_STOCKS.map((s) => s.id);

const HEATMAP_HEIGHT = 500;

function heatColor(pct: number): string {
  const clamped = Math.max(-6, Math.min(6, pct));
  if (clamped >= 0) {
    const t = clamped / 6;
    return `hsl(142, ${45 + t * 35}%, ${20 + t * 12}%)`;
  }
  const t = Math.abs(clamped) / 6;
  return `hsl(0, ${45 + t * 35}%, ${20 + t * 12}%)`;
}

function textColor(pct: number): string {
  return Math.abs(pct) >= 1 ? '#ffffff' : '#cccccc';
}

export function StockHeatmap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(0);
  const [snapshots, setSnapshots] = useState<Record<string, Snapshot>>({});
  const [loading, setLoading] = useState(true);

  // Measure container width via ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setContainerW(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    fetch(`/api/snapshots?symbols=${ALL_TICKERS.join(',')}`)
      .then((r) => r.json())
      .then((data: Record<string, Snapshot>) => setSnapshots(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const tiles =
    containerW > 0
      ? squarify(
          HEATMAP_STOCKS.map((s) => ({ id: s.id, value: s.marketCap })),
          { x: 0, y: 0, w: containerW, h: HEATMAP_HEIGHT }
        )
      : [];

  return (
    <div className="border border-border rounded overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-bg-tertiary flex items-center justify-between">
        <span className="text-xs font-mono font-semibold text-text-secondary uppercase tracking-wider">
          Market Heatmap
        </span>
        <span className="text-xs font-mono text-text-muted">Tile size = Market Cap · Color = Daily % Change</span>
      </div>

      {/* Treemap canvas */}
      <div
        ref={containerRef}
        className="relative w-full"
        style={{ height: HEATMAP_HEIGHT }}
      >
        {tiles.map((tile) => {
          const snap = snapshots[tile.id];
          const pct = snap?.changePercent ?? 0;
          const bg = loading ? '#161616' : heatColor(pct);
          const fg = loading ? '#555' : textColor(pct);
          const showPrice = tile.w > 52 && tile.h > 38;
          const showPct = tile.w > 44 && tile.h > 30;
          const fontSize = tile.w < 60 ? 9 : tile.w < 90 ? 10 : 11;

          return (
            <Link
              key={tile.id}
              href={`/stock/${tile.id}`}
              style={{
                position: 'absolute',
                left: tile.x,
                top: tile.y,
                width: tile.w,
                height: tile.h,
                backgroundColor: bg,
                border: '1px solid rgba(0,0,0,0.4)',
                boxSizing: 'border-box',
              }}
              className="flex flex-col items-center justify-center overflow-hidden hover:brightness-110 transition-[filter] select-none"
            >
              <span
                style={{ color: fg, fontSize, lineHeight: 1.2 }}
                className="font-mono font-bold tracking-wider"
              >
                {tile.id}
              </span>
              {showPrice && snap && (
                <span style={{ color: fg, fontSize: fontSize - 1, lineHeight: 1.2 }} className="font-mono mt-0.5">
                  {formatPrice(snap.price)}
                </span>
              )}
              {showPct && (
                <span
                  style={{ color: fg, fontSize: fontSize - 1, lineHeight: 1.2 }}
                  className="font-mono font-semibold mt-0.5"
                >
                  {loading ? '—' : snap ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%` : 'N/A'}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Legend */}
      <div className="px-3 py-2 flex items-center gap-2 border-t border-border">
        <span className="text-[10px] font-mono text-text-muted">−6%</span>
        <div className="flex h-2 flex-1 rounded overflow-hidden">
          {[-5, -3.5, -2, -0.5, 0.5, 2, 3.5, 5].map((v) => (
            <div key={v} className="flex-1" style={{ backgroundColor: heatColor(v) }} />
          ))}
        </div>
        <span className="text-[10px] font-mono text-text-muted">+6%</span>
      </div>
    </div>
  );
}
