'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import type { Snapshot } from '@/types';
import { formatPrice } from '@/lib/utils';

/* ─── types ───────────────────────────────────────────────────────────────── */
interface StockEntry { id: string; mc: number }
interface SectorDef  { name: string; short: string; stocks: StockEntry[] }
interface SectorBlock {
  name: string; short: string; stocks: StockEntry[];
  x: number; y: number; w: number; h: number;
}

/* ─── sectors (GICS-style) ────────────────────────────────────────────────── */
const SECTORS: SectorDef[] = [
  {
    name: 'Technology', short: 'Tech',
    stocks: [
      { id: 'NVDA', mc: 3300 }, { id: 'AAPL', mc: 3100 }, { id: 'MSFT', mc: 3100 },
      { id: 'AVGO', mc: 700  }, { id: 'ORCL', mc: 460  }, { id: 'CRM',  mc: 325  },
      { id: 'AMD',  mc: 200  }, { id: 'ADBE', mc: 215  }, { id: 'NOW',  mc: 195  },
      { id: 'INTU', mc: 180  }, { id: 'QCOM', mc: 165  }, { id: 'TXN',  mc: 185  },
      { id: 'MU',   mc: 100  }, { id: 'INTC', mc: 95   },
    ],
  },
  {
    name: 'Communication', short: 'Comm',
    stocks: [
      { id: 'GOOGL', mc: 2100 }, { id: 'META', mc: 1450 },
      { id: 'NFLX',  mc: 390  }, { id: 'DIS',  mc: 170  },
    ],
  },
  {
    name: 'Consumer Discr.', short: 'Discr.',
    stocks: [
      { id: 'AMZN', mc: 2200 }, { id: 'TSLA', mc: 795 },
      { id: 'HD',   mc: 375  }, { id: 'MCD',  mc: 215 },
      { id: 'LOW',  mc: 145  }, { id: 'NKE',  mc: 75  },
      { id: 'TGT',  mc: 65   }, { id: 'RIVN', mc: 12  },
    ],
  },
  {
    name: 'Consumer Staples', short: 'Staples',
    stocks: [
      { id: 'WMT',  mc: 745 }, { id: 'COST', mc: 425 },
      { id: 'PG',   mc: 380 }, { id: 'KO',   mc: 300 },
      { id: 'PEP',  mc: 210 },
    ],
  },
  {
    name: 'Financials', short: 'Finance',
    stocks: [
      { id: 'JPM', mc: 695 }, { id: 'V',   mc: 580 }, { id: 'MA',  mc: 475 },
      { id: 'BAC', mc: 335 }, { id: 'WFC', mc: 235 }, { id: 'GS',  mc: 220 },
      { id: 'MS',  mc: 195 }, { id: 'C',   mc: 125 },
    ],
  },
  {
    name: 'Health Care', short: 'Health',
    stocks: [
      { id: 'LLY',  mc: 745 }, { id: 'UNH',  mc: 495 }, { id: 'JNJ',  mc: 395 },
      { id: 'ABBV', mc: 335 }, { id: 'MRK',  mc: 245 }, { id: 'TMO',  mc: 215 },
      { id: 'PFE',  mc: 155 }, { id: 'AMGN', mc: 150 },
    ],
  },
  {
    name: 'Industrials', short: 'Indust.',
    stocks: [
      { id: 'GE',  mc: 200 }, { id: 'CAT', mc: 175 }, { id: 'HON', mc: 130 },
      { id: 'RTX', mc: 145 }, { id: 'BA',  mc: 120 },
    ],
  },
  {
    name: 'Energy', short: 'Energy',
    stocks: [
      { id: 'XOM', mc: 475 }, { id: 'CVX', mc: 275 }, { id: 'COP', mc: 130 },
      { id: 'EOG', mc: 70  }, { id: 'OXY', mc: 55  }, { id: 'SLB', mc: 60  },
    ],
  },
];

const ALL_TICKERS = SECTORS.flatMap(s => s.stocks.map(t => t.id));

/* ─── canvas ──────────────────────────────────────────────────────────────── */
const CANVAS_H   = 620;
const SECTOR_GAP = 3;

/* ─── sector partition (unchanged — sets sector rects, not tile rects) ─────── */
type Rect = { x: number; y: number; w: number; h: number };

interface SectorWithWeight extends SectorDef { weight: number }

function partitionSectors(sectors: SectorWithWeight[], rect: Rect): SectorBlock[] {
  if (sectors.length === 0) return [];

  if (sectors.length === 1) {
    const s = sectors[0];
    return [{ name: s.name, short: s.short, stocks: s.stocks, ...rect }];
  }

  const total = sectors.reduce((sum, s) => sum + s.weight, 0);
  let bestIdx = 1, bestDiff = Infinity, acc = 0;
  for (let i = 0; i < sectors.length - 1; i++) {
    acc += sectors[i].weight;
    const diff = Math.abs(acc * 2 - total);
    if (diff < bestDiff) { bestDiff = diff; bestIdx = i + 1; }
  }

  const g1 = sectors.slice(0, bestIdx);
  const g2 = sectors.slice(bestIdx);
  const ratio = g1.reduce((s, x) => s + x.weight, 0) / total;

  if (rect.w >= rect.h) {
    const split = Math.round(ratio * rect.w);
    return [
      ...partitionSectors(g1, { x: rect.x,         y: rect.y, w: split,          h: rect.h }),
      ...partitionSectors(g2, { x: rect.x + split,  y: rect.y, w: rect.w - split, h: rect.h }),
    ];
  }
  const split = Math.round(ratio * rect.h);
  return [
    ...partitionSectors(g1, { x: rect.x, y: rect.y,         w: rect.w, h: split          }),
    ...partitionSectors(g2, { x: rect.x, y: rect.y + split, w: rect.w, h: rect.h - split }),
  ];
}

function buildLayout(W: number, H: number): SectorBlock[] {
  const sorted: SectorWithWeight[] = SECTORS
    .map(s => ({
      ...s,
      weight: s.stocks.reduce((sum, t) => sum + Math.sqrt(t.mc), 0),
    }))
    .sort((a, b) => b.weight - a.weight);
  return partitionSectors(sorted, { x: 0, y: 0, w: W, h: H });
}

/* ─── two-tier grid layout ───────────────────────────────────────────────── */
/**
 * Splits stocks into "large" (mc^0.25 >= 70 % of sector max) and "small" tiers.
 * Returns the column count for each tier chosen so their combined CSS-grid
 * heights sum as close as possible to `ih`. Because tiles use aspect-ratio:1,
 * tile size = sectionWidth / cols — so largeColsL < colsS gives subtly bigger
 * squares for the large tier without being drastic.
 */
function twoTierCols(
  stocks: StockEntry[],
  iw: number,
  ih: number,
): { large: StockEntry[]; small: StockEntry[]; colsL: number; colsS: number } {
  const sorted = [...stocks].sort((a, b) => b.mc - a.mc);
  const n = sorted.length;
  const maxNorm = Math.pow(sorted[0].mc, 0.25);
  const splitAt  = sorted.findIndex(s => Math.pow(s.mc, 0.25) < 0.70 * maxNorm);
  const large    = splitAt <= 0 ? sorted : sorted.slice(0, splitAt);
  const small    = splitAt <= 0 ? []     : sorted.slice(splitAt);

  // Single-tier fallback
  if (small.length === 0) {
    const cols = Math.max(1, Math.ceil(Math.sqrt(n * iw / ih)));
    return { large: sorted, small: [], colsL: cols, colsS: cols };
  }

  // Search (colsL, colsS) to fill ih; constrain size ratio to ≤ 2×
  let bestCL = 1, bestCS = 2, bestDiff = Infinity;
  for (let cL = 1; cL <= large.length; cL++) {
    for (let cS = cL + 1; cS <= n; cS++) {
      if (iw / cS < (iw / cL) * 0.45) break; // tile ratio > ~2.2× — too drastic
      const hL = Math.ceil(large.length / cL) * (iw / cL);
      const hS = Math.ceil(small.length / cS) * (iw / cS);
      const diff = Math.abs(hL + hS - ih);
      if (diff < bestDiff) { bestDiff = diff; bestCL = cL; bestCS = cS; }
    }
  }
  return { large, small, colsL: bestCL, colsS: bestCS };
}

/* ─── colour scale ────────────────────────────────────────────────────────── */
function tileBg(pct: number): string {
  const v = Math.max(-5, Math.min(5, pct));
  if (Math.abs(v) < 0.05) return '#1a1a2a';
  if (v > 0) {
    const t = v / 5;
    return `hsl(142,${45 + t * 35}%,${14 + t * 20}%)`;
  }
  const t = Math.abs(v) / 5;
  return `hsl(4,${50 + t * 30}%,${13 + t * 18}%)`;
}
function tileFg(pct: number) { return Math.abs(pct) >= 1.5 ? '#fff' : '#bbb'; }

/* ─── logo (hides itself on 404) ──────────────────────────────────────────── */
function Logo({ ticker, size }: { ticker: string; size: number }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://financialmodelingprep.com/image-stock/${ticker}.png`}
      alt="" width={size} height={size}
      onError={() => setOk(false)}
      className="rounded object-contain flex-shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

/* ─── component ───────────────────────────────────────────────────────────── */
interface TooltipPos { id: string; cx: number; cy: number }

export function StockHeatmap() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [canvasW,  setCanvasW]  = useState(0);
  const [snaps,    setSnaps]    = useState<Record<string, Snapshot>>({});
  const [loading,  setLoading]  = useState(true);
  const [tooltip,  setTooltip]  = useState<TooltipPos | null>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver(e => setCanvasW(Math.floor(e[0].contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    fetch(`/api/snapshots?symbols=${ALL_TICKERS.join(',')}`)
      .then(r => r.json())
      .then((d: Record<string, Snapshot>) => setSnaps(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const layout    = canvasW > 0 ? buildLayout(canvasW, CANVAS_H) : [];
  const hoverSnap = tooltip ? snaps[tooltip.id] : null;

  return (
    <div className="border border-border rounded overflow-hidden bg-[#0a0a0a]">
      {/* header */}
      <div className="px-4 py-2.5 border-b border-border bg-bg-tertiary flex items-center justify-between">
        <span className="text-xs font-mono font-semibold text-text-secondary uppercase tracking-wider">
          Market Heatmap
        </span>
        <span className="text-xs font-mono text-text-muted">
          Sector size = Market Cap · Color = Daily % Change
        </span>
      </div>

      {/* canvas */}
      <div
        ref={wrapperRef}
        className="relative w-full select-none"
        style={{ height: CANVAS_H }}
        onMouseLeave={() => setTooltip(null)}
      >
        {layout.map(sector => {
          if (sector.w < 4 || sector.h < 4) return null;

          const iw = sector.w - SECTOR_GAP * 2;
          const ih = sector.h - SECTOR_GAP * 2;
          const { large, small, colsL, colsS } = twoTierCols(sector.stocks, iw, ih);
          const sideL = iw / colsL;
          const sideS = iw / colsS;

          const renderTile = (stock: StockEntry, side: number) => {
            const snap = snaps[stock.id];
            const pct  = snap?.changePercent ?? 0;
            const bg   = loading ? '#181820' : tileBg(pct);
            const fg   = loading ? '#444'    : tileFg(pct);
            const showLogo  = side >= 58;
            const logoSz    = Math.min(Math.floor(side * 0.34), 38);
            const showPrice = side >= 78;
            const showPct   = side >= 32;
            const showTick  = side >= 20;
            const tickSz    = side < 42 ? 8 : side < 62 ? 9 : side < 90 ? 10 : 11;
            return (
              <Link
                key={stock.id}
                href={`/stock/${stock.id}`}
                onMouseEnter={e => setTooltip({ id: stock.id, cx: e.clientX, cy: e.clientY })}
                onMouseMove={e  => setTooltip({ id: stock.id, cx: e.clientX, cy: e.clientY })}
                style={{
                  aspectRatio:     '1 / 1',
                  backgroundColor: bg,
                  border:          '1px solid rgba(0,0,0,.45)',
                  boxSizing:       'border-box',
                  overflow:        'hidden',
                }}
                className="flex flex-col items-center justify-center hover:brightness-110 transition-[filter] z-[1]"
              >
                {showLogo  && <Logo ticker={stock.id} size={logoSz} />}
                {showTick  && (
                  <span
                    style={{ color: fg, fontSize: tickSz, lineHeight: 1.25 }}
                    className={`font-mono font-bold tracking-wide${showLogo ? ' mt-1' : ''}`}
                  >
                    {stock.id}
                  </span>
                )}
                {showPrice && snap && (
                  <span style={{ color: fg, fontSize: tickSz - 1, lineHeight: 1.25 }} className="font-mono opacity-75">
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
          };

          return (
            <div
              key={sector.name}
              style={{
                position: 'absolute',
                left:     sector.x + SECTOR_GAP,
                top:      sector.y + SECTOR_GAP,
                width:    iw,
                height:   ih,
                background: '#0d0d18',
                overflow: 'hidden',
              }}
            >
              {/* sector label */}
              <div
                style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 20,
                  background: 'linear-gradient(to bottom,rgba(0,0,0,.7) 0%,transparent 100%)',
                  zIndex: 6, pointerEvents: 'none',
                  display: 'flex', alignItems: 'flex-start', paddingTop: 3, paddingLeft: 6,
                }}
              >
                <span className="font-mono text-[9px] font-semibold text-white/55 uppercase tracking-widest leading-none truncate">
                  {iw > 100 ? sector.name : sector.short}
                </span>
              </div>

              {/* large-cap tier — fewer columns → bigger squares */}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colsL}, 1fr)`, gap: 1 }}>
                {large.map(s => renderTile(s, sideL))}
              </div>

              {/* small-cap tier — more columns → smaller squares */}
              {small.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colsS}, 1fr)`, gap: 1 }}>
                  {small.map(s => renderTile(s, sideS))}
                </div>
              )}
            </div>
          );
        })}

        {/* hover tooltip */}
        {tooltip && hoverSnap && (
          <div
            className="pointer-events-none fixed z-50 bg-bg-secondary border border-border rounded shadow-2xl px-3 py-2 font-mono text-xs"
            style={{ left: tooltip.cx + 14, top: tooltip.cy - 10 }}
          >
            <p className="font-bold text-text-primary text-sm mb-0.5">{tooltip.id}</p>
            <p className="text-text-muted">{formatPrice(hoverSnap.price)}</p>
            <p className={`font-semibold ${hoverSnap.changePercent >= 0 ? 'text-gain' : 'text-loss'}`}>
              {hoverSnap.changePercent >= 0 ? '+' : ''}{hoverSnap.changePercent.toFixed(2)}%
            </p>
          </div>
        )}
      </div>

      {/* legend */}
      <div className="px-3 py-2 flex items-center gap-2 border-t border-border">
        <span className="text-[10px] font-mono text-text-muted">−5%</span>
        <div className="flex h-2 flex-1 rounded overflow-hidden">
          {[-4.5, -3, -1.5, -0.3, 0.3, 1.5, 3, 4.5].map(v => (
            <div key={v} className="flex-1" style={{ backgroundColor: tileBg(v) }} />
          ))}
        </div>
        <span className="text-[10px] font-mono text-text-muted">+5%</span>
      </div>
    </div>
  );
}
