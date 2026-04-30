'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { searchTickers } from '@/lib/tickers';
import type { TickerInfo } from '@/lib/tickers';
import { StockDetailPanel } from '@/components/StockDetailPanel';
import type { Snapshot } from '@/types';
import { formatPrice, formatChangePercent, isPositiveChange } from '@/lib/utils';

export default function SearchPage() {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<TickerInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'stock' | 'crypto'>('stock');
  const [snapshots, setSnapshots] = useState<Record<string, Snapshot>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); return; }
    setResults(searchTickers(q, 20));
  }, [query]);

  // Fetch snapshots — split stocks and crypto, call separate endpoints
  useEffect(() => {
    if (results.length === 0) return;
    const stocks = results.filter((r) => r.type !== 'crypto').map((r) => r.symbol);
    const crypto = results.filter((r) => r.type === 'crypto').map((r) => r.symbol);

    const fetches: Promise<void>[] = [];

    if (stocks.length > 0) {
      fetches.push(
        fetch(`/api/snapshots?symbols=${stocks.join(',')}`)
          .then((r) => r.json())
          .then((d: Record<string, Snapshot>) => setSnapshots((p) => ({ ...p, ...d })))
          .catch(console.error)
      );
    }
    if (crypto.length > 0) {
      fetches.push(
        fetch(`/api/crypto/snapshots?symbols=${crypto.join(',')}`)
          .then((r) => r.json())
          .then((d: Record<string, Snapshot>) => setSnapshots((p) => ({ ...p, ...d })))
          .catch(console.error)
      );
    }
  }, [results]);

  const hasResults = query && results.length > 0;

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6">
      {/* Search bar — centered hero when empty, compact top bar when results are shown */}
      <div
        className={`transition-all duration-300 mb-6 flex flex-col items-center ${
          !hasResults ? 'justify-center min-h-[45vh]' : ''
        }`}
      >
        {!hasResults && (
          <div className="text-center mb-6">
            <div className="text-5xl mb-3 opacity-20 font-mono text-text-muted select-none">⌕</div>
            <p className="text-text-muted font-mono text-sm">Search stocks &amp; crypto</p>
          </div>
        )}

        <div className="relative w-full max-w-xl">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-mono text-sm select-none">⌕</span>
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

      {/* Results + Detail */}
      {hasResults && (
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
                  const isCrypto = ticker.type === 'crypto';
                  const isSelected = selected === ticker.symbol;
                  const href = isCrypto ? `/crypto/${ticker.symbol}` : `/stock/${ticker.symbol}`;

                  return (
                    <button
                      key={ticker.symbol}
                      onClick={() => { setSelected(ticker.symbol); setSelectedType(isCrypto ? 'crypto' : 'stock'); }}
                      className={`w-full flex items-center justify-between px-4 py-3 border-b border-border last:border-b-0 transition-colors text-left ${
                        isSelected ? 'bg-bg-hover border-l-2 border-l-accent' : 'hover:bg-bg-hover'
                      }`}
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-semibold text-sm text-text-primary tracking-wider">
                              {ticker.symbol}
                            </span>
                            {isCrypto && (
                              <span className="text-[9px] font-mono px-1 py-px rounded border border-amber-500/40 text-amber-400 bg-amber-500/10 uppercase leading-none">
                                crypto
                              </span>
                            )}
                          </div>
                          <div className="font-sans text-xs text-text-muted truncate">{ticker.name}</div>
                        </div>
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
              selectedType === 'crypto' ? (
                <div className="border border-border rounded flex flex-col items-center justify-center h-64 gap-3">
                  <p className="text-text-muted font-mono text-sm">View full chart for {selected}</p>
                  <Link
                    href={`/crypto/${selected}`}
                    className="font-mono text-xs px-4 py-2 rounded border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 transition-colors"
                  >
                    Open {selected} →
                  </Link>
                </div>
              ) : (
                <StockDetailPanel ticker={selected} />
              )
            ) : (
              <div className="border border-border rounded flex items-center justify-center h-64">
                <p className="text-text-muted font-mono text-sm">Select a result to view details</p>
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
