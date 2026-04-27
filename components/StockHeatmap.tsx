'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { squarify } from '@/lib/treemap';
import type { Snapshot } from '@/types';
import { formatPrice } from '@/lib/utils';

// Distinct accent color per sector (label bar background)
const SECTOR_COLORS: Record<string, string> = {
  'Electronic Technology': '#0f2a4a',   // deep blue
  'Technology Services':   '#1a1a4a',   // indigo
  'Finance':               '#2a1f00',   // dark gold
  'Health Technology':     '#0f2e22',   // dark teal
  'Retail Trade':          '#2a1800',   // dark orange
  'Consumer Durables':     '#2a0f1a',   // dark rose
  'Energy Minerals':       '#1e1500',   // dark amber
};

const SECTOR_BORDER: Record<string, string> = {
  'Electronic Technology': '#1e6bb8',
  'Technology Services':   '#6b5fb5',
  'Finance':               '#b58c00',
  'Health Technology':     '#1a9e6e',
  'Retail Trade':          '#c46d00',
  'Consumer Durables':     '#b5305a',
  'Energy Minerals':       '#c47f00',
};

const SECTORS = [
  {
    name: 'Electronic Technology',
    short: 'Hardware',
    stocks: [
      { id: 'NVDA', marketCap: 3300 },
      { id: 'AAPL', marketCap: 3100 },
      { id: 'AVGO', marketCap: 700 },
      { id: 'TXN', marketCap: 185 },
      { id: 'AMD', marketCap: 200 },
      { id: 'QCOM', marketCap: 165 },
      { id: 'MU', marketCap: 100 },
      { id: 'INTC', marketCap: 95 },
    ],
  },
  {
    name: 'Technology Services',
    short: 'Software',
    stocks: [
      { id: 'MSFT', marketCap: 3100 },
      { id: 'GOOGL', marketCap: 2100 },
      { id: 'META', marketCap: 1450 },
      { id: 'ORCL', marketCap: 460 },
      { id: 'CRM', marketCap: 325 },
      { id: 'ADBE', marketCap: 215 },
      { id: 'NOW', marketCap: 195 },
      { id: 'INTU', marketCap: 180 },
    ],
  },
  {
    name: 'Finance',
    short: 'Finance',
    stocks: [
      { id: 'JPM', marketCap: 695 },
      { id: 'V', marketCap: 580 },
      { id: 'MA', marketCap: 475 },
      { id: 'BAC', marketCap: 335 },
      { id: 'WFC', marketCap: 235 },
      { id: 'GS', marketCap: 220 },
      { id: 'MS', marketCap: 195 },
      { id: 'C', marketCap: 125 },
    ],
  },
  {
    name: 'Health Technology',
    short: 'Health',
    stocks: [
      { id: 'LLY', marketCap: 745 },
      { id: 'UNH', marketCap: 495 },
      { id: 'JNJ', marketCap: 395 },
      { id: 'ABBV', marketCap: 335 },
      { id: 'MRK', marketCap: 245 },
      { id: 'TMO', marketCap: 215 },
      { id: 'PFE', marketCap: 155 },
      { id: 'AMGN', marketCap: 150 },
    ],
  },
  {
    name: 'Retail Trade',
    short: 'Retail',
    stocks: [
      { id: 'AMZN', marketCap: 2200 },
      { id: 'WMT', marketCap: 745 },
      { id: 'COST', marketCap: 425 },
      { id: 'HD', marketCap: 375 },
      { id: 'MCD', marketCap: 215 },
      { id: 'LOW', marketCap: 145 },
      { id: 'NKE', marketCap: 75 },
      { id: 'TGT', marketCap: 65 },
    ],
  },
  {
    name: 'Consumer Durables',
    short: 'Consumer',
    stocks: [
      { id: 'TSLA', marketCap: 795 },
      { id: 'GM', marketCap: 50 },
      { id: 'F', marketCap: 45 },
      { id: 'RIVN', marketCap: 12 },
      { id: 'NVR', marketCap: 22 },
      { id: 'PHM', marketCap: 25 },
      { id: 'LEN', marketCap: 35 },
      { id: 'DHI', marketCap: 45 },
    ],
  },
  {
    name: 'Energy Minerals',
    short: 'Energy',
    stocks: [
      { id: 'XOM', marketCap: 475 },
      { id: 'CVX', marketCap: 275 },
      { id: 'COP', marketCap: 130 },
      { id: 'EOG', marketCap: 70 },
      { id: 'SLB', marketCap: 60 },
      { id: 'PSX', marketCap: 55 },
      { id: 'MPC', marketCap: 55 },
      { id: 'OXY', marketCap: 55 },
    ],
  },
];

const ALL_TICKERS = SECTORS.flatMap((s) => s.stocks.map((t) => t.id));
const TOTAL_MC = SECTORS.flatMap((s) => s.stocks).reduce((sum, s) => sum + s.marketCap, 0);

const LABEL_H = 28; // px reserved at top of each sector for its name
const HEATMAP_H = 480; // total canvas height
const TILE_H = HEATMAP_H - LABEL_H;

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

interface ComputedTile {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ComputedSector {
  name: string;
  short: string;
  x: number;
  w: number;
  tiles: ComputedTile[];
}

function computeLayout(containerW: number): ComputedSector[] {
  let xOffset = 0;
  return SECTORS.map((sector) => {
    const sectorMC = sector.stocks.reduce((sum, s) => sum + s.marketCap, 0);
    const sectorW = Math.floor((sectorMC / TOTAL_MC) * containerW);

    const tiles = squarify(
      sector.stocks.map((s) => ({ id: s.id, value: s.marketCap })),
      { x: 0, y: 0, w: sectorW, h: TILE_H }
    ).map((t) => ({
      ...t,
      x: t.x + xOffset,
      y: t.y + LABEL_H,
    }));

    const result: ComputedSector = { name: sector.name, short: sector.short, x: xOffset, w: sectorW, tiles };
    xOffset += sectorW;
    return result;
  });
}

export function StockHeatmap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(0);
  const [snapshots, setSnapshots] = useState<Record<string, Snapshot>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setContainerW(Math.floor(entries[0].contentRect.width));
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

  const layout = containerW > 0 ? computeLayout(containerW) : [];

  return (
    <div className="border border-border rounded overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border bg-bg-tertiary flex items-center justify-between">
        <span className="text-xs font-mono font-semibold text-text-secondary uppercase tracking-wider">
          Market Heatmap
        </span>
        <span className="text-xs font-mono text-text-muted">Size = Market Cap · Color = Daily % Change</span>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="relative w-full" style={{ height: HEATMAP_H }}>
        {layout.map((sector) => (
          <div key={sector.name}>
            {/* Sector label bar */}
            <div
              style={{
                position: 'absolute',
                left: sector.x,
                top: 0,
                width: sector.w,
                height: LABEL_H,
                backgroundColor: SECTOR_COLORS[sector.name] ?? '#1a1a1a',
                borderRight: '2px solid #000',
                borderBottom: `2px solid ${SECTOR_BORDER[sector.name] ?? '#444'}`,
                borderLeft: `3px solid ${SECTOR_BORDER[sector.name] ?? '#444'}`,
                boxSizing: 'border-box',
              }}
              className="flex items-center justify-center overflow-hidden"
            >
              <span
                style={{ color: SECTOR_BORDER[sector.name] ?? '#aaa' }}
                className="font-mono text-[9px] font-bold uppercase tracking-widest truncate px-1"
              >
                {sector.w > 90 ? sector.name : sector.short}
              </span>
            </div>

            {/* Stock tiles */}
            {sector.tiles.map((tile) => {
              const snap = snapshots[tile.id];
              const pct = snap?.changePercent ?? 0;
              const bg = loading ? '#161616' : heatColor(pct);
              const fg = loading ? '#555' : textColor(pct);
              const showPrice = tile.w > 56 && tile.h > 42;
              const showPct = tile.w > 44 && tile.h > 32;
              const fontSize = tile.w < 55 ? 8 : tile.w < 80 ? 9 : tile.w < 110 ? 10 : 11;

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
                    border: '1px solid rgba(0,0,0,0.5)',
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
                    <span style={{ color: fg, fontSize: fontSize - 1, lineHeight: 1.3 }} className="font-mono mt-0.5">
                      {formatPrice(snap.price)}
                    </span>
                  )}
                  {showPct && (
                    <span
                      style={{ color: fg, fontSize: fontSize - 1, lineHeight: 1.3 }}
                      className="font-mono font-semibold mt-0.5"
                    >
                      {loading ? '—' : snap ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%` : 'N/A'}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
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
