'use client';

import { useEffect, useState, useRef } from 'react';
import { alpacaSocket } from '@/lib/alpacaSocket';
import { StockChart } from '@/components/StockChart';
import { NewsPanel } from '@/components/NewsPanel';
import { PriceDisplay } from '@/components/PriceDisplay';
import { StockInsights } from '@/components/StockInsights';
import { Skeleton } from '@/components/Skeleton';
import { useAuth } from '@/components/AuthProvider';
import type { QuoteUpdate, Snapshot, ChartDataPoint, TimeRange } from '@/types';
import { isPositiveChange, formatVolume, formatPrice } from '@/lib/utils';
import Link from 'next/link';

const RANGES: TimeRange[] = ['1D', '1W', '1M'];

interface Props {
  ticker: string;
}

export function StockDetailPanel({ ticker }: Props) {
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

  // Reset state when ticker changes
  useEffect(() => {
    setSnapshot(null);
    setLivePrice(null);
    setChartData([]);
    setChartLoading(true);
    setSnapshotLoading(true);
  }, [ticker]);

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

  useEffect(() => {
    setChartLoading(true);
    fetch(`/api/stock/${ticker}/bars?range=${range}`)
      .then((r) => r.json())
      .then((d) => setChartData(d.chartData ?? []))
      .catch(console.error)
      .finally(() => setChartLoading(false));
  }, [ticker, range]);

  useEffect(() => {
    if (!user) return;
    fetch('/api/watchlist')
      .then((r) => r.json())
      .then((d) => {
        setInWatchlist((d.watchlist ?? []).some((item: { ticker: string }) => item.ticker === ticker));
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
    <div className="border border-border rounded overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-bg-tertiary flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href={`/stock/${ticker}`}
            className="font-mono font-bold text-xl text-text-primary tracking-widest hover:text-accent transition-colors"
          >
            {ticker}
          </Link>
          {user && (
            <button
              onClick={toggleWatchlist}
              disabled={watchlistLoading}
              className={`text-xs font-mono px-2 py-0.5 rounded border transition-colors ${
                inWatchlist
                  ? 'border-gain text-gain hover:bg-gain hover:text-black'
                  : 'border-border text-text-muted hover:border-accent hover:text-accent'
              }`}
            >
              {inWatchlist ? '★ Watching' : '☆ Watch'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          {snapshotLoading ? (
            <Skeleton className="h-6 w-36" />
          ) : displayPrice ? (
            <PriceDisplay
              price={displayPrice.price}
              change={displayPrice.change}
              changePercent={displayPrice.changePercent}
              size="sm"
            />
          ) : null}

          {snapshot && (
            <div className="flex gap-4 font-mono text-xs text-text-muted">
              <span>O: <span className="text-text-secondary">{formatPrice(snapshot.open)}</span></span>
              <span>H: <span className="text-text-secondary">{formatPrice(snapshot.high)}</span></span>
              <span>L: <span className="text-text-secondary">{formatPrice(snapshot.low)}</span></span>
              <span>V: <span className="text-text-secondary">{formatVolume(snapshot.volume)}</span></span>
            </div>
          )}
        </div>
      </div>

      {/* Range selector */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-bg-secondary">
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

      {/* Chart */}
      <StockChart data={chartData} isPositive={positive} loading={chartLoading} />

      {/* News */}
      <div className="border-t border-border">
        <NewsPanel ticker={ticker} />
      </div>

      {/* AI Insights */}
      {snapshot && (
        <StockInsights
          ticker={ticker}
          stockData={{
            price: snapshot.price,
            changePercent: snapshot.changePercent,
            volume: snapshot.volume,
            open: snapshot.open,
            high: snapshot.high,
            low: snapshot.low,
            prevClose: snapshot.prevClose,
          }}
        />
      )}
    </div>
  );
}
