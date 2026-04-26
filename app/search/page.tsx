'use client';

import { useState, useEffect, useRef } from 'react';
import { searchTickers } from '@/lib/tickers';
import type { TickerInfo } from '@/lib/tickers';
import { StockDetailPanel } from '@/components/StockDetailPanel';
import type { Snapshot } from '@/types';
import { formatPrice, formatChangePercent, isPositiveChange } from '@/lib/utils';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TickerInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<Record<string, Snapshot>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Search as user types
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const found = searchTickers(q, 20);
    setResults(found);
  }, [query]);

  // Fetch snapshots for results
  useEffect(() => {
    if (results.length === 0) return;
    const symbols = results.map((r) => r.symbol).join(',');
    fetch(`/api/snapshots?symbols=${symbols}`)
      .then((r) => r.json())
      .then((data: Record<string, Snapshot>) => setSnapshots((prev) => ({ ...prev, ...data })))
      .catch(console.error);
  }, [results]);

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6">
      {/* Search bar */}
      <div className="mb-6">
        <div className="relative max-w-lg">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-mono text-sm">⌕</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            placeholder="Search ticker or company name…"
            className="w-full bg-bg-secondary border border-border rounded px-8 py-3 text-text-primary font-mono text-sm focus:outline-none focus:border-accent placeholder:text-text-muted placeholder:font-sans placeholder:normal-case tracking-widest"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]); setSelected(null); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {!query && (
        <div className="text-center py-20 text-text-muted font-mono text-sm">
          <div className="text-4xl mb-4 opacity-30">⌕</div>
          <p>Search for any stock ticker or company name to get started.</p>
        </div>
      )}

      {/* Results + Detail */}
      {query && results.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Results list */}
          <div className="xl:col-span-1">
            <div className="border border-border rounded overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-bg-tertiary">
                <span className="text-xs font-mono font-semibold text-text-secondary uppercase tracking-wider">
                  Results ({results.length})
                </span>
              </div>
              <div className="overflow-y-auto max-h-[600px]">
                {results.map((ticker) => {
                  const snap = snapshots[ticker.symbol];
                  const positive = snap ? isPositiveChange(snap.change) : true;
                  const isSelected = selected === ticker.symbol;
                  return (
                    <button
                      key={ticker.symbol}
                      onClick={() => setSelected(ticker.symbol)}
                      className={`w-full flex items-center justify-between px-4 py-3 border-b border-border last:border-b-0 transition-colors text-left ${
                        isSelected ? 'bg-bg-hover border-l-2 border-l-accent' : 'hover:bg-bg-hover'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-mono font-semibold text-sm text-text-primary tracking-wider">
                          {ticker.symbol}
                        </div>
                        <div className="font-sans text-xs text-text-muted truncate">{ticker.name}</div>
                      </div>
                      {snap && (
                        <div className="text-right ml-3 flex-shrink-0">
                          <div className="font-mono text-sm text-text-primary">{formatPrice(snap.price)}</div>
                          <div className={`font-mono text-xs ${positive ? 'text-gain' : 'text-loss'}`}>
                            {formatChangePercent(snap.changePercent)}
                          </div>
                        </div>
                      )}
                    </button>
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
      )}

      {/* No results */}
      {query && results.length === 0 && (
        <div className="text-center py-20 text-text-muted font-mono text-sm">
          No results for &ldquo;{query}&rdquo;. Try a different ticker or company name.
        </div>
      )}
    </div>
  );
}
