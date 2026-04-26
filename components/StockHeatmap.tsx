'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Snapshot } from '@/types';
import { formatPrice } from '@/lib/utils';

const SECTORS: Record<string, string[]> = {
  'Electronic Technology': ['AAPL', 'NVDA', 'AMD', 'INTC', 'QCOM', 'AVGO', 'TXN', 'MU'],
  'Technology Services':   ['MSFT', 'GOOGL', 'META', 'ORCL', 'ADBE', 'CRM', 'NOW', 'INTU'],
  'Finance':               ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'V', 'MA'],
  'Health Technology':     ['LLY', 'JNJ', 'UNH', 'PFE', 'ABBV', 'MRK', 'TMO', 'AMGN'],
  'Retail Trade':          ['AMZN', 'WMT', 'COST', 'TGT', 'HD', 'LOW', 'NKE', 'MCD'],
  'Consumer Durables':     ['TSLA', 'GM', 'F', 'RIVN', 'NVR', 'PHM', 'LEN', 'DHI'],
  'Energy Minerals':       ['XOM', 'CVX', 'COP', 'EOG', 'SLB', 'PSX', 'MPC', 'OXY'],
};

const ALL_TICKERS = Object.values(SECTORS).flat();

function heatColor(pct: number): string {
  // Smooth HSL gradient: green for gains, red for losses
  const clamped = Math.max(-6, Math.min(6, pct));
  if (clamped >= 0) {
    const t = clamped / 6;
    return `hsl(142, ${45 + t * 35}%, ${20 + t * 12}%)`;
  }
  const t = Math.abs(clamped) / 6;
  return `hsl(0, ${45 + t * 35}%, ${20 + t * 12}%)`;
}

function textColor(pct: number): string {
  const abs = Math.abs(pct);
  if (abs >= 1) return '#ffffff';
  return '#cccccc';
}

export function StockHeatmap() {
  const [snapshots, setSnapshots] = useState<Record<string, Snapshot>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/snapshots?symbols=${ALL_TICKERS.join(',')}`)
      .then((r) => r.json())
      .then((data: Record<string, Snapshot>) => setSnapshots(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="border border-border rounded overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-bg-tertiary flex items-center justify-between">
        <span className="text-xs font-mono font-semibold text-text-secondary uppercase tracking-wider">
          Market Heatmap
        </span>
        <span className="text-xs font-mono text-text-muted">Daily % Change</span>
      </div>

      <div className="p-3 space-y-3">
        {Object.entries(SECTORS).map(([sector, tickers]) => (
          <div key={sector}>
            <div className="text-[10px] font-mono text-text-muted uppercase tracking-widest mb-1.5 px-0.5">
              {sector}
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
              {tickers.map((ticker) => {
                const snap = snapshots[ticker];
                const pct = snap?.changePercent ?? 0;
                const bg = loading ? undefined : heatColor(pct);
                const fg = loading ? undefined : textColor(pct);

                return (
                  <Link
                    key={ticker}
                    href={`/stock/${ticker}`}
                    className="flex flex-col items-center justify-center rounded px-1 py-2 transition-opacity hover:opacity-80 select-none"
                    style={{
                      backgroundColor: bg ?? '#1a1a1a',
                      minHeight: 52,
                    }}
                  >
                    <span
                      className="font-mono font-bold text-[11px] leading-tight"
                      style={{ color: fg ?? '#888888' }}
                    >
                      {ticker}
                    </span>
                    {loading ? (
                      <span className="text-[9px] text-text-muted mt-0.5">—</span>
                    ) : snap ? (
                      <>
                        <span
                          className="text-[9px] font-mono mt-0.5"
                          style={{ color: fg ?? '#888888' }}
                        >
                          {formatPrice(snap.price)}
                        </span>
                        <span
                          className="text-[10px] font-mono font-semibold mt-0.5"
                          style={{ color: fg ?? '#888888' }}
                        >
                          {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                        </span>
                      </>
                    ) : (
                      <span className="text-[9px] text-text-muted mt-0.5">N/A</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="px-3 pb-3 flex items-center gap-2">
        <span className="text-[10px] font-mono text-text-muted">Low</span>
        <div className="flex h-2 flex-1 rounded overflow-hidden">
          {[-5, -3.5, -2, -0.5, 0.5, 2, 3.5, 5].map((v) => (
            <div key={v} className="flex-1" style={{ backgroundColor: heatColor(v) }} />
          ))}
        </div>
        <span className="text-[10px] font-mono text-text-muted">High</span>
      </div>
    </div>
  );
}
