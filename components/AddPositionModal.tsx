'use client';

import { useState, useRef, useEffect } from 'react';
import { searchTickers } from '@/lib/tickers';
import type { TickerInfo } from '@/lib/tickers';

interface AddPositionModalProps {
  onClose: () => void;
  onSuccess: () => void;
  editTicker?: string;
  editShares?: number;
  editAvgPrice?: number;
}

export function AddPositionModal({ onClose, onSuccess, editTicker, editShares, editAvgPrice }: AddPositionModalProps) {
  const [ticker, setTicker] = useState(editTicker ?? '');
  const [shares, setShares] = useState(editShares?.toString() ?? '');
  const [avgPrice, setAvgPrice] = useState(editAvgPrice?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<TickerInfo[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ticker.length === 0) {
      setSuggestions([]);
      return;
    }
    const results = searchTickers(ticker);
    setSuggestions(results);
    setHighlightIndex(-1);
  }, [ticker]);

  function selectTicker(info: TickerInfo) {
    setTicker(info.symbol);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      selectTicker(suggestions[highlightIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticker: ticker.toUpperCase(),
        shares: parseFloat(shares),
        avg_buy_price: parseFloat(avgPrice),
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? 'Failed to save position');
    } else {
      onSuccess();
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-bg-secondary border border-border rounded-lg w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-text-primary font-mono font-semibold text-sm uppercase tracking-wider">
            {editTicker ? 'Edit Position' : 'Add Position'}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Ticker with autocomplete */}
          <div className="relative">
            <label className="block text-text-muted text-xs font-mono uppercase tracking-wider mb-1.5">
              Ticker / Company
            </label>
            <input
              ref={inputRef}
              type="text"
              value={ticker}
              onChange={(e) => { setTicker(e.target.value.toUpperCase()); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onKeyDown={handleKeyDown}
              disabled={!!editTicker}
              required
              maxLength={10}
              placeholder="e.g. AAPL or Apple"
              className="w-full bg-bg-tertiary border border-border rounded px-3 py-2 text-text-primary text-sm font-mono focus:outline-none focus:border-accent disabled:opacity-50 uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute top-full left-0 right-0 mt-1 bg-bg-secondary border border-border rounded shadow-xl z-50 overflow-hidden"
              >
                {suggestions.map((s, i) => (
                  <button
                    key={s.symbol}
                    type="button"
                    onMouseDown={() => selectTicker(s)}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between gap-3 transition-colors ${
                      i === highlightIndex ? 'bg-bg-hover' : 'hover:bg-bg-hover'
                    }`}
                  >
                    <span className="font-mono font-semibold text-sm text-text-primary">{s.symbol}</span>
                    <span className="font-sans text-xs text-text-muted truncate">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-text-muted text-xs font-mono uppercase tracking-wider mb-1.5">Shares</label>
            <input
              type="number"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              required
              min="0.0001"
              step="any"
              placeholder="e.g. 10"
              className="w-full bg-bg-tertiary border border-border rounded px-3 py-2 text-text-primary text-sm font-mono focus:outline-none focus:border-accent placeholder:text-text-muted"
            />
          </div>
          <div>
            <label className="block text-text-muted text-xs font-mono uppercase tracking-wider mb-1.5">Avg Buy Price ($)</label>
            <input
              type="number"
              value={avgPrice}
              onChange={(e) => setAvgPrice(e.target.value)}
              required
              min="0.0001"
              step="any"
              placeholder="e.g. 150.00"
              className="w-full bg-bg-tertiary border border-border rounded px-3 py-2 text-text-primary text-sm font-mono focus:outline-none focus:border-accent placeholder:text-text-muted"
            />
          </div>

          {error && <p className="text-loss text-xs font-mono">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent/80 disabled:opacity-50 text-white font-mono text-sm py-2 rounded transition-colors"
          >
            {loading ? 'Saving…' : editTicker ? 'Update Position' : 'Add Position'}
          </button>
        </form>
      </div>
    </div>
  );
}
