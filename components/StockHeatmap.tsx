'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import type { Snapshot } from '@/types';
import { formatPrice } from '@/lib/utils';

/* ─── types ───────────────────────────────────────────────────────────────── */
interface StockEntry  { id: string; mc: number }
interface SectorDef   { name: string; short: string; stocks: StockEntry[] }
interface Tile        { id: string; x: number; y: number; w: number; h: number }
interface SectorBlock {
  name: string; short: string;
  x: number; y: number; w: number; h: number;
  tiles: Tile[];
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
const sqrtMC = (mc: number) => Math.sqrt(mc);

/* ─── canvas ──────────────────────────────────────────────────────────────── */
const CANVAS_H   = 600;
const SECTOR_GAP = 3; // px gap between sector blocks (dark background shows through)

/* ─── square tile packing ─────────────────────────────────────────────────── */
type Rect = { x: number; y: number; w: number; h: number };

/**
 * Pack stocks as true squares (w = h ∝ √mc) using a greedy row-first layout.
 *
 * A binary search finds the largest global scale where the total packed height
 * fits within rect.h — no stretching is applied during the search so the
 * height function is strictly monotonic and convergence is guaranteed.
 * After placing all rows a uniform vertical scale fills any bottom gap while
 * keeping every tile square (the same vScale is applied to both dimensions).
 */
function layoutSquares(stocks: StockEntry[], rect: Rect): Tile[] {
  if (stocks.length === 0 || rect.w < 4 || rect.h < 4) return [];

  const sorted = [...stocks].sort((a, b) => b.mc - a.mc);
  const raw    = sorted.map(t => Math.sqrt(t.mc)); // side ∝ √mc

  /* ── height of all rows at a given scale (no row-stretch) ── */
  function calcH(scale: number): number {
    let h = 0, i = 0;
    while (i < raw.length) {
      const start = i;
      let rowW = 0, rowMax = 0;
      while (i < raw.length && rowW + raw[i] * scale <= rect.w) {
        rowW  += raw[i] * scale;
        rowMax = Math.max(rowMax, raw[i] * scale);
        i++;
      }
      if (i === start) { rowMax = raw[i] * scale; i++; } // single oversized item
      h += rowMax;
    }
    return h;
  }

  /* ── binary search: largest scale where all rows fit ── */
  let lo = 1e-4;
  let hi = rect.w / raw[0]; // largest tile fills the full row width
  while (calcH(lo) > rect.h) lo /= 2; // ensure lo is valid
  while (calcH(hi) <= rect.h) hi *= 2; // ensure hi overflows
  for (let iter = 0; iter < 40; iter++) {
    const mid = (lo + hi) / 2;
    if (calcH(mid) <= rect.h) lo = mid; // valid → try bigger
    else                       hi = mid; // overflows → try smaller
  }
  const scale = lo;

  /* ── place tiles ── */
  const rows: Array<{ items: { id: string; s: number }[]; rowMax: number }> = [];
  let i = 0;
  while (i < sorted.length) {
    let rowW = 0, rowMax = 0;
    const items: { id: string; s: number }[] = [];
    while (i < sorted.length && rowW + raw[i] * scale <= rect.w) {
      const s = raw[i] * scale;
      items.push({ id: sorted[i].id, s });
      rowW  += s;
      rowMax = Math.max(rowMax, s);
      i++;
    }
    if (items.length === 0 && i < sorted.length) {
      const s = Math.min(raw[i] * scale, rect.w);
      items.push({ id: sorted[i].id, s });
      rowMax = s;
      i++;
    }
    rows.push({ items, rowMax });
  }

  // Uniform vertical scale so rows fill rect.h exactly — tiles stay square
  // because vScale is applied to both dimensions equally.
  const totalH = rows.reduce((sum, r) => sum + r.rowMax, 0);
  const vScale = rect.h / Math.max(totalH, 1);

  const tiles: Tile[] = [];
  let y = rect.y;
  for (const row of rows) {
    const rowH = row.rowMax * vScale;
    let x = rect.x;
    for (const item of row.items) {
      const s = item.s * vScale;          // scale side by same vScale → square
      tiles.push({
        id: item.id,
        x:  Math.round(x),
        y:  Math.round(y + (rowH - s) / 2), // centre vertically in row
        w:  Math.round(s),
        h:  Math.round(s),
      });
      x += item.s * vScale;
    }
    y += rowH;
  }
  return tiles;
}

/* ─── nested layout ───────────────────────────────────────────────────────── */
interface SectorWithWeight extends SectorDef { weight: number }

/**
 * Recursive binary partition — guarantees a 2-D mosaic for the sector layer.
 * Splits the current rectangle along its longer axis, proportional to the
 * cumulative weight of each group, then recurses until each sector occupies
 * its own sub-rectangle. Squarify is still used for stocks *within* each sector.
 */
function partitionSectors(sectors: SectorWithWeight[], rect: Rect): SectorBlock[] {
  if (sectors.length === 0) return [];

  if (sectors.length === 1) {
    const s = sectors[0];
    if (rect.w < 2 || rect.h < 2) {
      return [{ name: s.name, short: s.short, ...rect, tiles: [] }];
    }
    const inner: Rect = {
      x: rect.x + SECTOR_GAP,
      y: rect.y + SECTOR_GAP,
      w: rect.w - SECTOR_GAP * 2,
      h: rect.h - SECTOR_GAP * 2,
    };
    const tiles = layoutSquares(s.stocks, inner);
    return [{ name: s.name, short: s.short, ...rect, tiles }];
  }

  // Find the split index that balances the two groups' weights most evenly
  const total = sectors.reduce((sum, s) => sum + s.weight, 0);
  let bestIdx = 1;
  let bestDiff = Infinity;
  let acc = 0;
  for (let i = 0; i < sectors.length - 1; i++) {
    acc += sectors[i].weight;
    const diff = Math.abs(acc * 2 - total);
    if (diff < bestDiff) { bestDiff = diff; bestIdx = i + 1; }
  }

  const g1 = sectors.slice(0, bestIdx);
  const g2 = sectors.slice(bestIdx);
  const w1 = g1.reduce((sum, s) => sum + s.weight, 0);
  const ratio = w1 / total;

  // Split along the longer dimension
  if (rect.w >= rect.h) {
    const split = Math.round(ratio * rect.w);
    const r1: Rect = { x: rect.x,         y: rect.y, w: split,           h: rect.h };
    const r2: Rect = { x: rect.x + split,  y: rect.y, w: rect.w - split,  h: rect.h };
    return [...partitionSectors(g1, r1), ...partitionSectors(g2, r2)];
  } else {
    const split = Math.round(ratio * rect.h);
    const r1: Rect = { x: rect.x, y: rect.y,         w: rect.w, h: split          };
    const r2: Rect = { x: rect.x, y: rect.y + split,  w: rect.w, h: rect.h - split };
    return [...partitionSectors(g1, r1), ...partitionSectors(g2, r2)];
  }
}

function buildLayout(W: number, H: number): SectorBlock[] {
  const sorted: SectorWithWeight[] = SECTORS
    .map(s => ({ ...s, weight: s.stocks.reduce((sum, t) => sum + sqrtMC(t.mc), 0) }))
    .sort((a, b) => b.weight - a.weight);

  return partitionSectors(sorted, { x: 0, y: 0, w: W, h: H });
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

  const layout     = canvasW > 0 ? buildLayout(canvasW, CANVAS_H) : [];
  const hoverSnap  = tooltip ? snaps[tooltip.id] : null;

  return (
    <div className="border border-border rounded overflow-hidden bg-[#0a0a0a]">
      {/* header */}
      <div className="px-4 py-2.5 border-b border-border bg-bg-tertiary flex items-center justify-between">
        <span className="text-xs font-mono font-semibold text-text-secondary uppercase tracking-wider">
          Market Heatmap
        </span>
        <span className="text-xs font-mono text-text-muted">
          Size = Market Cap · Color = Daily % Change
        </span>
      </div>

      {/* canvas */}
      <div
        ref={wrapperRef}
        className="relative w-full select-none"
        style={{ height: CANVAS_H }}
        onMouseLeave={() => setTooltip(null)}
      >
        {layout.map(sector => sector.w > 0 && (
          <div key={sector.name}>

            {/* sector name label — floating gradient over the top-left of the block */}
            <div
              style={{
                position: 'absolute',
                left: sector.x + SECTOR_GAP,
                top:  sector.y + SECTOR_GAP,
                width: sector.w - SECTOR_GAP * 2,
                height: 20,
                background: 'linear-gradient(to bottom,rgba(0,0,0,.65) 0%,transparent 100%)',
                zIndex: 6,
                pointerEvents: 'none',
              }}
              className="flex items-start pt-1 pl-1.5 overflow-hidden"
            >
              <span className="font-mono text-[9px] font-semibold text-white/55 uppercase tracking-widest leading-none truncate">
                {sector.w > 100 ? sector.name : sector.short}
              </span>
            </div>

            {/* stock tiles */}
            {sector.tiles.map(tile => {
              const snap = snaps[tile.id];
              const pct  = snap?.changePercent ?? 0;
              const bg   = loading ? '#181820' : tileBg(pct);
              const fg   = loading ? '#444'    : tileFg(pct);

              const showLogo  = tile.w >= 58 && tile.h >= 50;
              const logoSz    = Math.min(Math.floor(Math.min(tile.w, tile.h) * 0.34), 38);
              const showPrice = tile.w >= 78 && tile.h >= 72;
              const showPct   = tile.w >= 32 && tile.h >= 24;
              const showTick  = tile.w >= 20 && tile.h >= 14;
              const tickSz    = tile.w < 42 ? 8 : tile.w < 62 ? 9 : tile.w < 90 ? 10 : 11;

              return (
                <Link
                  key={tile.id}
                  href={`/stock/${tile.id}`}
                  onMouseEnter={e => setTooltip({ id: tile.id, cx: e.clientX, cy: e.clientY })}
                  onMouseMove={e  => setTooltip({ id: tile.id, cx: e.clientX, cy: e.clientY })}
                  style={{
                    position:        'absolute',
                    left:            tile.x,
                    top:             tile.y,
                    width:           tile.w,
                    height:          tile.h,
                    backgroundColor: bg,
                    border:          '1px solid rgba(0,0,0,.55)',
                    boxSizing:       'border-box',
                  }}
                  className="flex flex-col items-center justify-center overflow-hidden hover:brightness-110 transition-[filter] z-[1]"
                >
                  {showLogo  && <Logo ticker={tile.id} size={logoSz} />}
                  {showTick  && (
                    <span
                      style={{ color: fg, fontSize: tickSz, lineHeight: 1.25 }}
                      className={`font-mono font-bold tracking-wide${showLogo ? ' mt-1' : ''}`}
                    >
                      {tile.id}
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
            })}
          </div>
        ))}

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
