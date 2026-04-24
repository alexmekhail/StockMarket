'use client';

import { useState } from 'react';

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
          <div>
            <label className="block text-text-muted text-xs font-mono uppercase tracking-wider mb-1.5">Ticker</label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              disabled={!!editTicker}
              required
              maxLength={10}
              className="w-full bg-bg-tertiary border border-border rounded px-3 py-2 text-text-primary text-sm font-mono focus:outline-none focus:border-accent disabled:opacity-50 uppercase tracking-widest"
            />
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
              className="w-full bg-bg-tertiary border border-border rounded px-3 py-2 text-text-primary text-sm font-mono focus:outline-none focus:border-accent"
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
              className="w-full bg-bg-tertiary border border-border rounded px-3 py-2 text-text-primary text-sm font-mono focus:outline-none focus:border-accent"
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
