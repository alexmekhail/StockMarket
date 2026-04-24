'use client';

import { useEffect, useState, useRef } from 'react';
import { alpacaSocket } from '@/lib/alpacaSocket';
import type { QuoteUpdate, Snapshot } from '@/types';
import { formatPrice, formatChangePercent, isPositiveChange } from '@/lib/utils';

const DEFAULT_TICKERS = ['AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMZN', 'GOOGL', 'META', 'SPY'];

interface TickerState {
  price: number;
  change: number;
  changePercent: number;
}

export function TickerBar() {
  const [prices, setPrices] = useState<Record<string, TickerState>>({});
  const callbacksRef = useRef<Map<string, (u: QuoteUpdate) => void>>(new Map());

  // Fetch initial snapshots
  useEffect(() => {
    fetch(`/api/snapshots?symbols=${DEFAULT_TICKERS.join(',')}`)
      .then((r) => r.json())
      .then((data: Record<string, Snapshot>) => {
        const initial: Record<string, TickerState> = {};
        for (const [ticker, snap] of Object.entries(data)) {
          initial[ticker] = {
            price: snap.price,
            change: snap.change,
            changePercent: snap.changePercent,
          };
          alpacaSocket.setPrevClose(ticker, snap.prevClose);
        }
        setPrices(initial);
      })
      .catch(console.error);
  }, []);

  // Subscribe to WebSocket updates
  useEffect(() => {
    DEFAULT_TICKERS.forEach((ticker) => {
      const cb = (update: QuoteUpdate) => {
        setPrices((prev) => ({
          ...prev,
          [ticker]: {
            price: update.price,
            change: update.change,
            changePercent: update.changePercent,
          },
        }));
      };
      callbacksRef.current.set(ticker, cb);
      alpacaSocket.subscribe(ticker, cb);
    });

    return () => {
      callbacksRef.current.forEach((cb, ticker) => {
        alpacaSocket.unsubscribe(ticker, cb);
      });
      callbacksRef.current.clear();
    };
  }, []);

  const tickers = DEFAULT_TICKERS.filter((t) => prices[t]);

  if (tickers.length === 0) {
    return (
      <div className="h-8 bg-bg-secondary border-b border-border flex items-center px-4">
        <span className="text-text-muted text-xs font-mono animate-pulse">Loading market data…</span>
      </div>
    );
  }

  // Duplicate for seamless loop
  const items = [...tickers, ...tickers];

  return (
    <div className="h-8 bg-bg-secondary border-b border-border overflow-hidden flex items-center">
      <div className="flex animate-ticker-scroll whitespace-nowrap" style={{ width: 'max-content' }}>
        {items.map((ticker, idx) => {
          const p = prices[ticker];
          if (!p) return null;
          const positive = isPositiveChange(p.change);
          return (
            <span
              key={`${ticker}-${idx}`}
              className="inline-flex items-center gap-2 px-5 border-r border-border/50 text-xs font-mono"
            >
              <span className="text-text-secondary font-semibold tracking-wider">{ticker}</span>
              <span className="text-text-primary">{formatPrice(p.price)}</span>
              <span className={positive ? 'text-gain' : 'text-loss'}>
                {formatChangePercent(p.changePercent)}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
