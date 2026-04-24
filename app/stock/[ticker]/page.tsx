'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { alpacaSocket } from '@/lib/alpacaSocket';
import { StockChart } from '@/components/StockChart';
import { NewsPanel } from '@/components/NewsPanel';
import { PriceDisplay } from '@/components/PriceDisplay';
import { Skeleton } from '@/components/Skeleton';
import { useAuth } from '@/components/AuthProvider';
import type { QuoteUpdate, Snapshot, ChartDataPoint, TimeRange } from '@/types';
import { isPositiveChange, formatVolume, formatPrice } from '@/lib/utils';

const RANGES: TimeRange[] = ['1D', '1W', '1M'];

export default function StockPage() {
  const params = useParams();
  const ticker = (params.ticker as string).toUpperCase();
  const { user } = useAuth();

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [livePrice, setLivePrice] = useState<{ price: number; change: number; changePercent: number } | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [range, setRange] = useState<TimeRange>('1D');
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const callbackRef = useRef<((u: QuoteUpdate) => void) | null>(null);

  // Fetch snapshot (initial price data + prev close for WebSocket calc)
  useEffect(() => {
    setSnapshotLoading(true);
    fetch(`/api/stock/${ticker}/snapshot`)
      .then((r) => r.json())
      .then((d) => {
        const snap: Snapshot = d.snapshot;
        if (snap) {
          setSnapshot(snap);
          setLivePrice({ price: snap.price, change: snap.change, changePercent: snap.changePercent });
          alpacaSocket.setPrevClose(ticker, snap.prevClose);
        }
      })
      .catch(console.error)
      .finally(() => setSnapshotLoading(false));
  }, [ticker]);

  // WebSocket live price
  useEffect(() => {
    const cb = (update: QuoteUpdate) => {
      setLivePrice({ price: update.price, change: update.change, changePercent: update.changePercent });
    };
    callbackRef.current = cb;
    alpacaSocket.subscribe(ticker, cb);

    return () => {
      if (callbackRef.current) alpacaSocket.unsubscribe(ticker, callbackRef.current);
    };
  }, [ticker]);

  // Fetch chart data when range changes
  useEffect(() => {
    setChartLoading(true);
    fetch(`/api/stock/${ticker}/bars?range=${range}`)
      .then((r) => r.json())
      .then((d) => setChartData(d.chartData ?? []))
      .catch(console.error)
      .finally(() => setChartLoading(false));
  }, [ticker, range]);

  // Check watchlist status
  useEffect(() => {
    if (!user) return;
    fetch('/api/watchlist')
      .then((r) => r.json())
      .then((d) => {
        const list = d.watchlist ?? [];
        setInWatchlist(list.some((item: { ticker: string }) => item.ticker === ticker));
      })
      .catch(console.error);
  }, [ticker, user]);

  async function toggleWatchlist() {
    if (!user) return;
    setWatchlistLoading(true);
    try {
      if (inWatchlist) {
        await fetch(`/api/watchlist?ticker=${ticker}`, { method: 'DELETE' });
        setInWatchlist(false);
      } else {
        await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker }),
        });
        setInWatchlist(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setWatchlistLoading(false);
    }
  }

  const displayPrice = livePrice ?? (snapshot ? { price: snapshot.price, change: snapshot.change, changePercent: snapshot.changePercent } : null);
  const positive = displayPrice ? isPositiveChange(displayPrice.change) : true;

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6">
      {/* Stock header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-mono text-3xl font-bold text-text-primary tracking-widest">{ticker}</h1>
            {user && (
              <button
                onClick={toggleWatchlist}
                disabled={watchlistLoading}
                className={`text-xs font-mono px-2 py-1 rounded border transition-colors ${
                  inWatchlist
                    ? 'border-gain text-gain hover:bg-gain hover:text-black'
                    : 'border-border text-text-muted hover:border-accent hover:text-accent'
                }`}
              >
                {inWatchlist ? '★ Watching' : '☆ Watch'}
              </button>
            )}
          </div>

          {snapshotLoading ? (
            <Skeleton className="h-8 w-48" />
          ) : displayPrice ? (
            <PriceDisplay
              price={displayPrice.price}
              change={displayPrice.change}
              changePercent={displayPrice.changePercent}
              size="lg"
            />
          ) : (
            <span className="text-text-muted font-mono text-sm">No data available</span>
          )}
        </div>

        {/* Stats row */}
        {snapshot && (
          <div className="flex gap-6 font-mono text-xs">
            {[
              { label: 'Open', value: formatPrice(snapshot.open) },
              { label: 'High', value: formatPrice(snapshot.high) },
              { label: 'Low', value: formatPrice(snapshot.low) },
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
        {/* Range selector */}
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

      {/* News */}
      <NewsPanel ticker={ticker} />
    </div>
  );
}
