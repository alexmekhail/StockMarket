'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { squarify } from '@/lib/treemap';
import type { Snapshot } from '@/types';
import { formatPrice } from '@/lib/utils';

interface StockEntry { id: string; mc: number }
interface SectorDef  { name: string; short: string; stocks: StockEntry[] }

/* ─── sector definitions (matches TradingView GICS grouping) ─────────────── */
const SECTORS: SectorDef[] = [
  {
    name: 'Technology',
    short: 'Tech',
    stocks: [
      { id: 'NVDA', mc: 3300 }, { id: 'AAPL', mc: 3100 }, { id: 'MSFT', mc: 3100 },
      { id: 'AVGO', mc: 700 },  { id: 'ORCL', mc: 460 },  { id: 'CRM', mc: 325 },
      { id: 'AMD', mc: 200 },   { id: 'ADBE', mc: 215 },  { id: 'NOW', mc: 195 },
      { id: 'INTU', mc: 180 },  { id: 'QCOM', mc: 165 },  { id: 'TXN', mc: 185 },
      { id: 'MU', mc: 100 },    { id: 'INTC', mc: 95 },
    ],
  },
  {
    name: 'Communication',
    short: 'Comm',
    stocks: [
      { id: 'GOOGL', mc: 2100 }, { id: 'META', mc: 1450 },
      { id: 'NFLX', mc: 390 },   { id: 'DIS', mc: 170 },
    ],
  },
  {
    name: 'Consumer Discr.',
    short: 'Discr.',
    stocks: [
      { id: 'AMZN', mc: 2200 }, { id: 'TSLA', mc: 795 },
      { id: 'HD', mc: 375 },    { id: 'MCD', mc: 215 },
      { id: 'NKE', mc: 75 },    { id: 'LOW', mc: 145 },
      { id: 'TGT', mc: 65 },    { id: 'RIVN', mc: 12 },
    ],
  },
  {
    name: 'Consumer Staples',
    short: 'Staples',
    stocks: [
      { id: 'WMT', mc: 745 },  { id: 'COST', mc: 425 },
      { id: 'PG', mc: 380 },   { id: 'KO', mc: 300 },
      { id: 'PEP', mc: 210 },
    ],
  },
  {
    name: 'Financials',
    short: 'Finance',
    stocks: [
      { id: 'JPM', mc: 695 }, { id: 'V', mc: 580 },   { id: 'MA', mc: 475 },
      { id: 'BAC', mc: 335 }, { id: 'WFC', mc: 235 }, { id: 'GS', mc: 220 },
      { id: 'MS', mc: 195 },  { id: 'C', mc: 125 },
    ],
  },
  {
    name: 'Health Care',
    short: 'Health',
    stocks: [
      { id: 'LLY', mc: 745 },  { id: 'UNH', mc: 495 }, { id: 'JNJ', mc: 395 },
      { id: 'ABBV', mc: 335 }, { id: 'MRK', mc: 245 }, { id: 'TMO', mc: 215 },
      { id: 'PFE', mc: 155 },  { id: 'AMGN', mc: 150 },
    ],
  },
  {
    name: 'Industrials',
    short: 'Indust.',
    stocks: [
      { id: 'GE', mc: 200 }, { id: 'CAT', mc: 175 }, { id: 'HON', mc: 130 },
      { id: 'BA', mc: 120 }, { id: 'RTX', mc: 145 },
    ],
  },
  {
    name: 'Energy',
    short: 'Energy',
    stocks: [
      { id: 'XOM', mc: 475 }, { id: 'CVX', mc: 275 }, { id: 'COP', mc: 130 },
      { id: 'EOG', mc: 70 },  { id: 'OXY', mc: 55 },  { id: 'SLB', mc: 60 },
    ],
  },
];

const ALL_TICKERS = SECTORS.flatMap((s) => s.stocks.map((t) => t.id));
const TOTAL_MC = SECTORS.flatMap((s) => s.stocks).reduce((sum, s) => sum + s.mc, 0);

/* ─── layout constants ────────────────────────────────────────────────────── */
const CANVAS_H = 520;
const LABEL_H  = 26;
const TILE_H   = CANVAS_H - LABEL_H;

/* ─── colour helpers ─────────────────────────────────────────────────────── */
function heatBg(pct: number): string {
  const c = Math.max(-5, Math.min(5, pct));
  if (c >= 0) {
    const t = c / 5;
    return `hsl(142,${50 + t * 30}%,${16 + t * 14}%)`;
  }
  const t = Math.abs(c) / 5;
  return `hsl(0,${50 + t * 30}%,${16 + t * 14}%)`;
}

function fgColor(pct: number): string {
  return Math.abs(pct) >= 1.5 ? '#fff' : '#ccc';
}

/* ─── computed types ─────────────────────────────────────────────────────── */
interface Tile { id: string; x: number; y: number; w: number; h: number }
interface SectorLayout { name: string; short: string; x: number; w: number; tiles: Tile[] }

function buildLayout(totalW: number): SectorLayout[] {
  let xCursor = 0;
  return SECTORS.map((sector) => {
    const sectorMC = sector.stocks.reduce((s, t) => s + t.mc, 0);
    const sectorW  = Math.round((sectorMC / TOTAL_MC) * totalW);

    const tiles = squarify(
      sector.stocks.map((s) => ({ id: s.id, value: s.mc })),
      { x: 0, y: 0, w: sectorW, h: TILE_H },
    ).map((t) => ({ ...t, x: t.x + xCursor, y: t.y + LABEL_H }));

    const result: SectorLayout = { name: sector.name, short: sector.short, x: xCursor, w: sectorW, tiles };
    xCursor += sectorW;
    return result;
  });
}

/* ─── logo helper ────────────────────────────────────────────────────────── */
function LogoImg({ ticker, size }: { ticker: string; size: number }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://financialmodelingprep.com/image-stock/${ticker}.png`}
      alt={ticker}
      width={size}
      height={size}
      onError={() => setOk(false)}
      className="rounded-sm object-contain flex-shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

/* ─── main component ─────────────────────────────────────────────────────── */
export function StockHeatmap() {
  const wrapperRef              = useRef<HTMLDivElement>(null);
  const [canvasW, setCanvasW]   = useState(0);
  const [snaps,   setSnaps]     = useState<Record<string, Snapshot>>({});
  const [loading, setLoading]   = useState(true);

  /* measure canvas width */
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver((e) => setCanvasW(Math.floor(e[0].contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* fetch snapshots */
  useEffect(() => {
    fetch(`/api/snapshots?symbols=${ALL_TICKERS.join(',')}`)
      .then((r) => r.json())
      .then((d: Record<string, Snapshot>) => setSnaps(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const layout = canvasW > 0 ? buildLayout(canvasW) : [];

  return (
    <div className="border border-border rounded overflow-hidden bg-[#0e0e0e]">
      {/* ── header bar ── */}
      <div className="px-4 py-2.5 border-b border-border bg-bg-tertiary flex items-center justify-between">
        <span className="text-xs font-mono font-semibold text-text-secondary uppercase tracking-wider">
          Market Heatmap
        </span>
        <span className="text-xs font-mono text-text-muted">
          Size&nbsp;=&nbsp;Market Cap&nbsp;·&nbsp;Color&nbsp;=&nbsp;Daily&nbsp;%&nbsp;Change
        </span>
      </div>

      {/* ── canvas ── */}
      <div ref={wrapperRef} className="relative w-full select-none" style={{ height: CANVAS_H }}>

        {layout.map((sector) => (
          <div key={sector.name}>

            {/* sector label strip */}
            <div
              style={{
                position: 'absolute',
                left:   sector.x,
                top:    0,
                width:  sector.w,
                height: LABEL_H,
                borderRight: '2px solid #000',
                boxSizing: 'border-box',
              }}
              className="flex items-center justify-center bg-[#161616] overflow-hidden"
            >
              <span className="font-mono text-[9px] font-semibold text-text-muted uppercase tracking-widest truncate px-1">
                {sector.w > 88 ? sector.name : sector.short}
              </span>
            </div>

            {/* stock tiles */}
            {sector.tiles.map((tile) => {
              const snap = snaps[tile.id];
              const pct  = snap?.changePercent ?? 0;
              const bg   = loading ? '#1a1a1a' : heatBg(pct);
              const fg   = loading ? '#555'    : fgColor(pct);

              /* thresholds */
              const showLogo  = tile.w >= 64 && tile.h >= 56;
              const logoSize  = Math.min(Math.floor(Math.min(tile.w, tile.h) * 0.32), 36);
              const showPrice = tile.w >= 72 && tile.h >= 68;
              const showPct   = tile.w >= 36 && tile.h >= 28;
              const showTick  = tile.w >= 24 && tile.h >= 18;
              const tickSz    = tile.w < 48 ? 8 : tile.w < 72 ? 9 : tile.w < 100 ? 10 : 11;

              return (
                <Link
                  key={tile.id}
                  href={`/stock/${tile.id}`}
                  style={{
                    position:        'absolute',
                    left:            tile.x,
                    top:             tile.y,
                    width:           tile.w,
                    height:          tile.h,
                    backgroundColor: bg,
                    border:          '1px solid rgba(0,0,0,0.65)',
                    boxSizing:       'border-box',
                  }}
                  className="flex flex-col items-center justify-center overflow-hidden hover:brightness-110 transition-[filter]"
                >
                  {showLogo  && <LogoImg ticker={tile.id} size={logoSize} />}
                  {showTick  && (
                    <span
                      style={{ color: fg, fontSize: tickSz, lineHeight: 1.25 }}
                      className={`font-mono font-bold tracking-wider${showLogo ? ' mt-1' : ''}`}
                    >
                      {tile.id}
                    </span>
                  )}
                  {showPrice && snap && (
                    <span style={{ color: fg, fontSize: tickSz - 1, lineHeight: 1.25 }} className="font-mono">
                      {formatPrice(snap.price)}
                    </span>
                  )}
                  {showPct && (
                    <span style={{ color: fg, fontSize: tickSz - 1, lineHeight: 1.25 }} className="font-mono font-semibold">
                      {loading ? '—' : snap ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%` : 'N/A'}
                    </span>
                  )}
                </Link>
              );
            })}

          </div>
        ))}
      </div>

      {/* ── legend ── */}
      <div className="px-3 py-2 flex items-center gap-2 border-t border-border">
        <span className="text-[10px] font-mono text-text-muted">−5%</span>
        <div className="flex h-2 flex-1 rounded overflow-hidden">
          {[-4.5, -3, -1.5, -0.3, 0.3, 1.5, 3, 4.5].map((v) => (
            <div key={v} className="flex-1" style={{ backgroundColor: heatBg(v) }} />
          ))}
        </div>
        <span className="text-[10px] font-mono text-text-muted">+5%</span>
      </div>
    </div>
  );
}
