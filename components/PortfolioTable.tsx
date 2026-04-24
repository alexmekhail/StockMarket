'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from './AuthProvider';
import { alpacaSocket } from '@/lib/alpacaSocket';
import { AddPositionModal } from './AddPositionModal';
import type { PortfolioPosition, QuoteUpdate, Snapshot } from '@/types';
import { formatPrice, formatLargeNumber, isPositiveChange } from '@/lib/utils';
import { Skeleton } from './Skeleton';

interface EnrichedPosition extends PortfolioPosition {
  currentPrice?: number;
  currentValue?: number;
  gainLoss?: number;
  gainLossPercent?: number;
}

export function PortfolioTable() {
  const { user } = useAuth();
  const [positions, setPositions] = useState<EnrichedPosition[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const callbacksRef = useRef<Map<string, (u: QuoteUpdate) => void>>(new Map());

  const subscribeToTickers = useCallback((tickers: string[]) => {
    callbacksRef.current.forEach((cb, t) => alpacaSocket.unsubscribe(t, cb));
    callbacksRef.current.clear();

    if (tickers.length > 0) {
      fetch(`/api/snapshots?symbols=${tickers.join(',')}`)
        .then((r) => r.json())
        .then((data: Record<string, Snapshot>) => {
          const initial: Record<string, number> = {};
          for (const [ticker, snap] of Object.entries(data)) {
            initial[ticker] = snap.price;
            alpacaSocket.setPrevClose(ticker, snap.prevClose);
          }
          setPrices((prev) => ({ ...prev, ...initial }));
        })
        .catch(console.error);
    }

    tickers.forEach((ticker) => {
      const cb = (update: QuoteUpdate) => {
        setPrices((prev) => ({ ...prev, [ticker]: update.price }));
      };
      callbacksRef.current.set(ticker, cb);
      alpacaSocket.subscribe(ticker, cb);
    });
  }, []);

  const loadPositions = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const r = await fetch('/api/portfolio');
      const d = await r.json();
      const list: PortfolioPosition[] = d.positions ?? [];
      setPositions(list);
      subscribeToTickers(list.map((p) => p.ticker));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user, subscribeToTickers]);

  useEffect(() => {
    loadPositions();
    return () => {
      callbacksRef.current.forEach((cb, t) => alpacaSocket.unsubscribe(t, cb));
      callbacksRef.current.clear();
    };
  }, [loadPositions]);

  async function deletePosition(id: string, ticker: string) {
    await fetch(`/api/portfolio?id=${id}`, { method: 'DELETE' });
    setPositions((prev) => prev.filter((p) => p.id !== id));
    const cb = callbacksRef.current.get(ticker);
    if (cb) { alpacaSocket.unsubscribe(ticker, cb); callbacksRef.current.delete(ticker); }
  }

  // Enrich positions with live prices
  const enriched: EnrichedPosition[] = positions.map((pos) => {
    const currentPrice = prices[pos.ticker];
    if (currentPrice === undefined) return pos;
    const currentValue = currentPrice * pos.shares;
    const costBasis = pos.avg_buy_price * pos.shares;
    const gainLoss = currentValue - costBasis;
    const gainLossPercent = costBasis !== 0 ? (gainLoss / costBasis) * 100 : 0;
    return { ...pos, currentPrice, currentValue, gainLoss, gainLossPercent };
  });

  const totalValue = enriched.reduce((sum, p) => sum + (p.currentValue ?? 0), 0);
  const totalGainLoss = enriched.reduce((sum, p) => sum + (p.gainLoss ?? 0), 0);

  if (!user) {
    return (
      <div className="border border-border rounded p-4 text-center">
        <p className="text-text-muted text-xs font-mono">Sign in to track your portfolio</p>
      </div>
    );
  }

  return (
    <>
      <div className="border border-border rounded overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-bg-tertiary flex items-center justify-between">
          <span className="text-xs font-mono font-semibold text-text-secondary uppercase tracking-wider">Portfolio</span>
          <div className="flex items-center gap-4">
            {totalValue > 0 && (
              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="text-text-muted">Total:</span>
                <span className="text-text-primary font-semibold">{formatPrice(totalValue)}</span>
                <span className={isPositiveChange(totalGainLoss) ? 'text-gain' : 'text-loss'}>
                  {isPositiveChange(totalGainLoss) ? '+' : ''}{formatPrice(totalGainLoss)}
                </span>
              </div>
            )}
            <button
              onClick={() => setShowModal(true)}
              className="text-xs font-mono border border-accent text-accent px-2 py-0.5 rounded hover:bg-accent hover:text-white transition-colors"
            >
              + Add
            </button>
          </div>
        </div>

        {loading && (
          <div className="p-2 space-y-1">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        )}

        {!loading && enriched.length === 0 && (
          <div className="p-6 text-text-muted text-xs font-mono text-center">
            No positions yet. Click "+ Add" to add your first holding.
          </div>
        )}

        {!loading && enriched.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-border text-text-muted">
                  <th className="text-left px-4 py-2 font-medium uppercase tracking-wider">Ticker</th>
                  <th className="text-right px-4 py-2 font-medium uppercase tracking-wider">Shares</th>
                  <th className="text-right px-4 py-2 font-medium uppercase tracking-wider">Avg Cost</th>
                  <th className="text-right px-4 py-2 font-medium uppercase tracking-wider">Price</th>
                  <th className="text-right px-4 py-2 font-medium uppercase tracking-wider">Value</th>
                  <th className="text-right px-4 py-2 font-medium uppercase tracking-wider">P&L</th>
                  <th className="text-right px-4 py-2 font-medium uppercase tracking-wider">P&L %</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {enriched.map((pos) => {
                  const gl = pos.gainLoss ?? 0;
                  const glPct = pos.gainLossPercent ?? 0;
                  const positive = isPositiveChange(gl);
                  return (
                    <tr key={pos.id} className="border-b border-border last:border-b-0 hover:bg-bg-hover group">
                      <td className="px-4 py-3 text-text-primary font-semibold tracking-wider">{pos.ticker}</td>
                      <td className="px-4 py-3 text-right text-text-secondary">{pos.shares}</td>
                      <td className="px-4 py-3 text-right text-text-secondary">{formatPrice(pos.avg_buy_price)}</td>
                      <td className="px-4 py-3 text-right text-text-primary">
                        {pos.currentPrice !== undefined ? formatPrice(pos.currentPrice) : <Skeleton className="h-3 w-16 ml-auto" />}
                      </td>
                      <td className="px-4 py-3 text-right text-text-primary">
                        {pos.currentValue !== undefined ? formatPrice(pos.currentValue) : '–'}
                      </td>
                      <td className={`px-4 py-3 text-right ${positive ? 'text-gain' : 'text-loss'}`}>
                        {pos.gainLoss !== undefined ? `${positive ? '+' : ''}${formatPrice(gl)}` : '–'}
                      </td>
                      <td className={`px-4 py-3 text-right ${positive ? 'text-gain' : 'text-loss'}`}>
                        {pos.gainLossPercent !== undefined ? `${positive ? '+' : ''}${glPct.toFixed(2)}%` : '–'}
                      </td>
                      <td className="px-2 py-3 text-right">
                        <button
                          onClick={() => deletePosition(pos.id, pos.ticker)}
                          className="text-text-muted hover:text-loss opacity-0 group-hover:opacity-100 transition-all text-base leading-none"
                          title="Remove"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <AddPositionModal
          onClose={() => setShowModal(false)}
          onSuccess={loadPositions}
        />
      )}
    </>
  );
}
