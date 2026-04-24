'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { alpacaSocket } from '@/lib/alpacaSocket';
import type { WatchlistItem, QuoteUpdate, Snapshot } from '@/types';
import { formatPrice, formatChangePercent, isPositiveChange } from '@/lib/utils';
import { Skeleton } from './Skeleton';

interface LivePrice {
  price: number;
  change: number;
  changePercent: number;
}

export function Watchlist() {
  const { user } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [prices, setPrices] = useState<Record<string, LivePrice>>({});
  const [loading, setLoading] = useState(true);
  const callbacksRef = useRef<Map<string, (u: QuoteUpdate) => void>>(new Map());

  const subscribeToTickers = useCallback((tickers: string[]) => {
    // Unsubscribe existing
    callbacksRef.current.forEach((cb, t) => alpacaSocket.unsubscribe(t, cb));
    callbacksRef.current.clear();

    // Fetch snapshots for prevClose
    if (tickers.length > 0) {
      fetch(`/api/snapshots?symbols=${tickers.join(',')}`)
        .then((r) => r.json())
        .then((data: Record<string, Snapshot>) => {
          const initial: Record<string, LivePrice> = {};
          for (const [ticker, snap] of Object.entries(data)) {
            initial[ticker] = { price: snap.price, change: snap.change, changePercent: snap.changePercent };
            alpacaSocket.setPrevClose(ticker, snap.prevClose);
          }
          setPrices((prev) => ({ ...prev, ...initial }));
        })
        .catch(console.error);
    }

    tickers.forEach((ticker) => {
      const cb = (update: QuoteUpdate) => {
        setPrices((prev) => ({
          ...prev,
          [ticker]: { price: update.price, change: update.change, changePercent: update.changePercent },
        }));
      };
      callbacksRef.current.set(ticker, cb);
      alpacaSocket.subscribe(ticker, cb);
    });
  }, []);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    fetch('/api/watchlist')
      .then((r) => r.json())
      .then((d) => {
        const list: WatchlistItem[] = d.watchlist ?? [];
        setItems(list);
        subscribeToTickers(list.map((i) => i.ticker));
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    return () => {
      callbacksRef.current.forEach((cb, t) => alpacaSocket.unsubscribe(t, cb));
      callbacksRef.current.clear();
    };
  }, [user, subscribeToTickers]);

  async function removeFromWatchlist(ticker: string) {
    await fetch(`/api/watchlist?ticker=${ticker}`, { method: 'DELETE' });
    setItems((prev) => prev.filter((i) => i.ticker !== ticker));
    const cb = callbacksRef.current.get(ticker);
    if (cb) { alpacaSocket.unsubscribe(ticker, cb); callbacksRef.current.delete(ticker); }
  }

  if (!user) {
    return (
      <div className="border border-border rounded p-4 text-center">
        <p className="text-text-muted text-xs font-mono">Sign in to view your watchlist</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-bg-tertiary">
        <span className="text-xs font-mono font-semibold text-text-secondary uppercase tracking-wider">Watchlist</span>
      </div>

      {loading && (
        <div className="p-2 space-y-1">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="p-4 text-text-muted text-xs font-mono text-center">
          Your watchlist is empty. Search for a stock to add it.
        </div>
      )}

      {!loading && items.map((item) => {
        const p = prices[item.ticker];
        const positive = p ? isPositiveChange(p.change) : true;
        return (
          <div key={item.id} className="flex items-center justify-between px-3 py-2.5 border-b border-border last:border-b-0 hover:bg-bg-hover group">
            <Link href={`/stock/${item.ticker}`} className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono font-semibold text-sm text-text-primary">{item.ticker}</span>
                {p ? (
                  <div className="text-right">
                    <div className="font-mono text-sm text-text-primary">{formatPrice(p.price)}</div>
                    <div className={`font-mono text-xs ${positive ? 'text-gain' : 'text-loss'}`}>
                      {formatChangePercent(p.changePercent)}
                    </div>
                  </div>
                ) : (
                  <Skeleton className="h-8 w-20" />
                )}
              </div>
            </Link>
            <button
              onClick={() => removeFromWatchlist(item.ticker)}
              className="ml-2 text-text-muted hover:text-loss opacity-0 group-hover:opacity-100 transition-all text-lg leading-none"
              title="Remove"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
