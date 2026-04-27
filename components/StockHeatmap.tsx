'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { squarify } from '@/lib/treemap';
import type { Snapshot } from '@/types';
import { formatPrice } from '@/lib/utils';

/* ─── types ───────────────────────────────────────────────────────────────── */
interface StockEntry  { id: string; mc: number }
interface SectorDef   { name: string; short: string; stocks: StockEntry[] }
interface Tile        { id: string; x: number; y: number; w: number; h: number }
interface SectorBlock { name: string; short: string; x: number; w: number; tiles: Tile[] }

/* ─── sectors ─────────────────────────────────────────────────────────────── */
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

const ALL_TICKERS  = SECTORS.flatMap(s => s.stocks.map(t => t.id));
const sqrtMC       = (mc: number) => Math.sqrt(mc);
const TOTAL_SQRT   = SECTORS.flatMap(s => s.stocks).reduce((sum, s) => sum + sqrtMC(s.mc), 0);
const CANVAS_H     = 600; // match TradingView widget height

/* ─── color scale (matches TradingView palette) ───────────────────────────── */
function tileBg(pct: number): string {
  const v = Math.max(-5, Math.min(5, pct));
  if (Math.abs(v) < 0.05) return '#1a1a2a'; // essentially flat

  if (v > 0) {
    const t = v / 5;
    // dark teal-green → bright kelly green
    const h = 142;
    const s = 45 + t * 35;
    const l = 14 + t * 20;
    return `hsl(${h},${s}%,${l}%)`;
  }
  const t = Math.abs(v) / 5;
  // dark maroon → bright crimson
  const h = 4;
  const s = 50 + t * 30;
  const l = 13 + t * 18;
  return `hsl(${h},${s}%,${l}%)`;
}

function tileFg(pct: number): string {
  return Math.abs(pct) >= 1.5 ? '#fff' : '#bbb';
}

/* ─── layout ─────────────────────────────────────────────────────────────── */
function buildLayout(totalW: number): SectorBlock[] {
  let x = 0;
  return SECTORS.map(sector => {
    const sectorSqrt = sector.stocks.reduce((s, t) => s + sqrtMC(t.mc), 0);
    const w          = Math.round((sectorSqrt / TOTAL_SQRT) * totalW);
    const tiles      = squarify(
      sector.stocks.map(s => ({ id: s.id, value: sqrtMC(s.mc) })),
      { x: 0, y: 0, w, h: CANVAS_H },
    ).map(t => ({ ...t, x: t.x + x }));
    const block: SectorBlock = { name: sector.name, short: sector.short, x, w, tiles };
    x += w;
    return block;
  });
}

/* ─── logo ────────────────────────────────────────────────────────────────── */
function Logo({ ticker, size }: { ticker: string; size: number }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://financialmodelingprep.com/image-stock/${ticker}.png`}
      alt=""
      width={size} height={size}
      onError={() => setVisible(false)}
      className="rounded object-contain flex-shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

/* ─── tooltip ─────────────────────────────────────────────────────────────── */
interface TooltipState { id: string; x: number; y: number }

/* ─── component ───────────────────────────────────────────────────────────── */
export function StockHeatmap() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [canvasW,  setCanvasW]  = useState(0);
  const [snaps,    setSnaps]    = useState<Record<string, Snapshot>>({});
  const [loading,  setLoading]  = useState(true);
  const [tooltip,  setTooltip]  = useState<TooltipState | null>(null);

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

  const layout = canvasW > 0 ? buildLayout(canvasW) : [];
  const hoverSnap = tooltip ? snaps[tooltip.id] : null;

  return (
    <div className="border border-border rounded overflow-hidden bg-[#0e0e0e]">
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
        {layout.map(sector => (
          <div key={sector.name}>

            {/* sector label — floating overlay, doesn't steal tile height */}
            <div
              style={{
                position: 'absolute',
                left: sector.x,
                top: 0,
                width: sector.w,
                height: 22,
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, transparent 100%)',
                zIndex: 5,
                pointerEvents: 'none',
                boxSizing: 'border-box',
                borderRight: '2px solid #000',
              }}
              className="flex items-start pt-1 pl-1.5 overflow-hidden"
            >
              <span className="font-mono text-[9px] font-semibold text-white/60 uppercase tracking-widest truncate leading-none">
                {sector.w > 88 ? sector.name : sector.short}
              </span>
            </div>

            {/* tiles */}
            {sector.tiles.map(tile => {
              const snap = snaps[tile.id];
              const pct  = snap?.changePercent ?? 0;
              const bg   = loading ? '#181820' : tileBg(pct);
              const fg   = loading ? '#444'    : tileFg(pct);

              const showLogo  = tile.w >= 60 && tile.h >= 52;
              const logoSz    = Math.min(Math.floor(Math.min(tile.w, tile.h) * 0.34), 38);
              const showPrice = tile.w >= 80 && tile.h >= 74;
              const showPct   = tile.w >= 34 && tile.h >= 26;
              const showTick  = tile.w >= 22 && tile.h >= 16;
              const tickSz    = tile.w < 44 ? 8 : tile.w < 65 ? 9 : tile.w < 95 ? 10 : 11;

              return (
                <Link
                  key={tile.id}
                  href={`/stock/${tile.id}`}
                  onMouseEnter={e => setTooltip({ id: tile.id, x: e.clientX, y: e.clientY })}
                  onMouseMove={e  => setTooltip({ id: tile.id, x: e.clientX, y: e.clientY })}
                  style={{
                    position:        'absolute',
                    left:            tile.x,
                    top:             tile.y,
                    width:           tile.w,
                    height:          tile.h,
                    backgroundColor: bg,
                    border:          '1px solid rgba(0,0,0,0.6)',
                    boxSizing:       'border-box',
                  }}
                  className="flex flex-col items-center justify-center overflow-hidden hover:brightness-[1.15] transition-[filter] z-[1]"
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
                    <span style={{ color: fg, fontSize: tickSz - 1, lineHeight: 1.25 }} className="font-mono opacity-80">
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
            className="pointer-events-none fixed z-50 bg-bg-secondary border border-border rounded shadow-xl px-3 py-2 font-mono text-xs"
            style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}
          >
            <div className="font-bold text-text-primary text-sm">{tooltip.id}</div>
            <div className="text-text-muted mt-0.5">{formatPrice(hoverSnap.price)}</div>
            <div className={`mt-0.5 font-semibold ${hoverSnap.changePercent >= 0 ? 'text-gain' : 'text-loss'}`}>
              {hoverSnap.changePercent >= 0 ? '+' : ''}{hoverSnap.changePercent.toFixed(2)}%
            </div>
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
