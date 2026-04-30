'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { StockChart } from '@/components/StockChart';
import { PriceDisplay } from '@/components/PriceDisplay';
import { Skeleton } from '@/components/Skeleton';
import type { Snapshot, ChartDataPoint, TimeRange } from '@/types';
import { isPositiveChange, formatVolume, formatPrice } from '@/lib/utils';
import { alpacaBarToChartPoint } from '@/lib/utils';
import { CRYPTO_TICKERS } from '@/lib/tickers';

const RANGES: TimeRange[] = ['1D', '1W', '1M'];

function getRangeParams(range: TimeRange): { timeframe: string; start: string; end: string } {
  const now = new Date();
  const end = now.toISOString();
  if (range === '1D') {
    const start = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    return { timeframe: '1Min', start: start.toISOString(), end };
  }
  if (range === '1W') {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { timeframe: '15Min', start: start.toISOString(), end };
  }
  const start = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);
  return { timeframe: '1Day', start: start.toISOString(), end };
}

export default function CryptoPage() {
  const params = useParams();
  const symbol = (params.symbol as string).toUpperCase();
  const cryptoInfo = CRYPTO_TICKERS.find((c) => c.symbol === symbol);

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [range, setRange] = useState<TimeRange>('1D');

  useEffect(() => {
    setSnapshotLoading(true);
    fetch(`/api/crypto/snapshots?symbols=${symbol}`)
      .then((r) => r.json())
      .then((d) => { if (d[symbol]) setSnapshot(d[symbol]); })
      .catch(console.error)
      .finally(() => setSnapshotLoading(false));
  }, [symbol]);

  useEffect(() => {
    setChartLoading(true);
    const { timeframe, start, end } = getRangeParams(range);
    fetch(`/api/crypto/bars?symbol=${symbol}&timeframe=${timeframe}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`)
      .then((r) => r.json())
      .then((d) => {
        const points: ChartDataPoint[] = (d.bars ?? [])
          .map(alpacaBarToChartPoint)
          .sort((a: ChartDataPoint, b: ChartDataPoint) => a.time - b.time);
        // For 1D, keep only the last trading day's bars
        if (range === '1D' && points.length > 0) {
          const last = points[points.length - 1].time;
          const dayStart = last - 24 * 60 * 60;
          setChartData(points.filter((p) => p.time >= dayStart));
        } else {
          setChartData(points);
        }
      })
      .catch(console.error)
      .finally(() => setChartLoading(false));
  }, [symbol, range]);

  const positive = snapshot ? isPositiveChange(snapshot.change) : true;

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono text-xs px-2 py-0.5 rounded border border-amber-500/40 text-amber-400 bg-amber-500/10 uppercase tracking-wider">
              Crypto
            </span>
            <h1 className="font-mono text-3xl font-bold text-text-primary tracking-widest">{symbol}</h1>
          </div>
          {cryptoInfo && (
            <p className="text-text-muted font-sans text-sm mb-2">{cryptoInfo.name} · USD</p>
          )}
          {snapshotLoading ? (
            <Skeleton className="h-8 w-48" />
          ) : snapshot ? (
            <PriceDisplay
              price={snapshot.price}
              change={snapshot.change}
              changePercent={snapshot.changePercent}
              size="lg"
            />
          ) : (
            <span className="text-text-muted font-mono text-sm">No data available</span>
          )}
        </div>

        {snapshot && (
          <div className="flex gap-6 font-mono text-xs">
            {[
              { label: 'Open',   value: formatPrice(snapshot.open) },
              { label: 'High',   value: formatPrice(snapshot.high) },
              { label: 'Low',    value: formatPrice(snapshot.low) },
              { label: 'Volume', value: formatVolume(snapshot.volume) },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-text-muted uppercase tracking-wider mb-0.5">{label}</div>
                <div className="text-text-primary">{value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="mb-6">
        <div className="flex items-center gap-1 mb-3">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`font-mono text-xs px-3 py-1 rounded transition-colors ${
                range === r
                  ? 'bg-bg-tertiary text-text-primary border border-border'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="border border-border rounded overflow-hidden">
          <StockChart data={chartData} isPositive={positive} loading={chartLoading} />
        </div>
      </div>

      {/* Crypto trades 24/7 — no market hours notice */}
      <div className="text-xs font-mono text-text-muted border border-border rounded px-4 py-3">
        Crypto markets trade 24/7. Prices sourced from Alpaca via US crypto exchanges.
      </div>
    </div>
  );
}
