'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { alpacaSocket } from '@/lib/alpacaSocket';
import { StockDetailPanel } from '@/components/StockDetailPanel';
import type { WatchlistItem, QuoteUpdate, Snapshot } from '@/types';
import { formatPrice, formatChangePercent, isPositiveChange } from '@/lib/utils';
import { Skeleton } from '@/components/Skeleton';

interface LivePrice {
  price: number;
  change: number;
  changePercent: number;
}

export default function WatchlistPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [prices, setPrices] = useState<Record<string, LivePrice>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const callbacksRef = useRef<Map<string, (u: QuoteUpdate) => void>>(new Map());

  const subscribeToTickers = useCallback((tickers: string[]) => {
    callbacksRef.current.forEach((cb, t) => alpacaSocket.unsubscribe(t, cb));
    callbacksRef.current.clear();

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
        if (list.length > 0) setSelected(list[0].ticker);
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
    setItems((prev) => {
      const next = prev.filter((i) => i.ticker !== ticker);
      if (selected === ticker) setSelected(next[0]?.ticker ?? null);
      return next;
    });
    const cb = callbacksRef.current.get(ticker);
    if (cb) { alpacaSocket.unsubscribe(ticker, cb); callbacksRef.current.delete(ticker); }
  }

  if (!user) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 py-20 text-center">
        <p className="text-text-muted font-mono text-sm">Sign in to view your watchlist.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
          <div className="xl:col-span-2">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 py-20 text-center">
        <p className="text-text-muted font-mono text-sm">
          Your watchlist is empty.{' '}
          <Link href="/search" className="text-accent hover:underline">
            Search for a stock
          </Link>{' '}
          to add it.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Watchlist sidebar */}
        <div className="xl:col-span-1">
          <div className="border border-border rounded overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-bg-tertiary">
              <span className="text-xs font-mono font-semibold text-text-secondary uppercase tracking-wider">
                Watchlist ({items.length})
              </span>
            </div>
            <div className="overflow-y-auto max-h-[600px]">
              {items.map((item) => {
                const p = prices[item.ticker];
                const positive = p ? isPositiveChange(p.change) : true;
                const isSelected = selected === item.ticker;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between px-4 py-3 border-b border-border last:border-b-0 transition-colors group ${
                      isSelected ? 'bg-bg-hover border-l-2 border-l-accent' : 'hover:bg-bg-hover'
                    }`}
                  >
                    <button
                      onClick={() => setSelected(item.ticker)}
                      className="flex-1 flex items-center justify-between gap-3 text-left"
                    >
                      <div>
                        <div className="font-mono font-semibold text-sm text-text-primary tracking-wider">
                          {item.ticker}
                        </div>
                      </div>
                      {p ? (
                        <div className="text-right">
                          <div className="font-mono text-sm text-text-primary">{formatPrice(p.price)}</div>
                          <div className={`font-mono text-xs ${positive ? 'text-gain' : 'text-loss'}`}>
                            {formatChangePercent(p.changePercent)}
                          </div>
                        </div>
                      ) : (
                        <Skeleton className="h-8 w-16" />
                      )}
                    </button>
                    <button
                      onClick={() => removeFromWatchlist(item.ticker)}
                      className="ml-2 text-text-muted hover:text-loss opacity-0 group-hover:opacity-100 transition-all text-lg leading-none flex-shrink-0"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Detail panel */}
        <div className="xl:col-span-2">
          {selected ? (
            <StockDetailPanel ticker={selected} />
          ) : (
            <div className="border border-border rounded flex items-center justify-center h-64">
              <p className="text-text-muted font-mono text-sm">Select a stock to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
