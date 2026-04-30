'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Skeleton } from '@/components/Skeleton';

type Signal = 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
type Sentiment = 'Bullish' | 'Neutral' | 'Bearish';

interface InsightResult {
  signal: Signal;
  confidence: number;
  sentiment: Sentiment;
  reasons: string[];
  summary: string;
}

export interface StockInsightsData {
  price: number;
  changePercent: number;
  volume: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
}

interface StockInsightsProps {
  ticker: string;
  stockData: StockInsightsData;
}

const SIGNAL_CONFIG: Record<Signal, { bg: string; text: string; bar: string; icon: string }> = {
  'Strong Buy': { bg: 'bg-emerald-500', text: 'text-white',  bar: 'bg-emerald-500', icon: '▲▲' },
  'Buy':        { bg: 'bg-gain',        text: 'text-black',  bar: 'bg-gain',        icon: '▲'  },
  'Hold':       { bg: 'bg-amber-500',   text: 'text-black',  bar: 'bg-amber-500',   icon: '◆'  },
  'Sell':       { bg: 'bg-orange-500',  text: 'text-white',  bar: 'bg-orange-500',  icon: '▼'  },
  'Strong Sell':{ bg: 'bg-loss',        text: 'text-white',  bar: 'bg-loss',        icon: '▼▼' },
};

const SENTIMENT_COLOR: Record<Sentiment, string> = {
  Bullish: 'text-gain',
  Neutral: 'text-text-muted',
  Bearish: 'text-loss',
};

const BULLISH_WORDS = ['above', 'beat', 'oversold', 'rising', 'gain', 'strong', 'momentum', 'support', 'breakout', 'positive', 'high', 'surge', 'up'];
const BEARISH_WORDS = ['below', 'miss', 'overbought', 'falling', 'weak', 'resistance', 'negative', 'drop', 'decline', 'down', 'sell', 'loss', 'pressure'];

function reasonDotColor(text: string): string {
  const lower = text.toLowerCase();
  if (BULLISH_WORDS.some((w) => lower.includes(w))) return 'bg-gain';
  if (BEARISH_WORDS.some((w) => lower.includes(w))) return 'bg-loss';
  return 'bg-text-muted';
}

function SignalBadge({ signal }: { signal: Signal }) {
  const cfg = SIGNAL_CONFIG[signal];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${cfg.bg} ${cfg.text}`}
    >
      <span className="text-[9px] leading-none">{cfg.icon}</span>
      {signal}
    </span>
  );
}

export function StockInsights({ ticker, stockData }: StockInsightsProps) {
  const [result, setResult] = useState<InsightResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [generatedAt, setGeneratedAt] = useState('');

  // Keep a ref so fetchInsights always reads the latest stockData
  // without needing it as a useCallback dep (avoids re-fetching on every price tick)
  const stockDataRef = useRef(stockData);
  useEffect(() => {
    stockDataRef.current = stockData;
  });

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, ...stockDataRef.current }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data: InsightResult = await res.json();
      setResult(data);
      setGeneratedAt(new Date().toLocaleTimeString());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const cfg = result ? SIGNAL_CONFIG[result.signal] : null;

  return (
    <div className="border-t border-border bg-bg-secondary px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-xs font-bold text-text-muted uppercase tracking-widest">
          AI Insights
        </span>
        {!loading && (
          <button
            onClick={fetchInsights}
            className="font-mono text-sm text-text-muted hover:text-accent transition-colors px-1.5 py-0.5 rounded border border-transparent hover:border-border leading-none"
            title="Refresh analysis"
            aria-label="Refresh AI analysis"
          >
            ↻
          </button>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
          <div className="space-y-2 pt-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-2">
                <Skeleton className="mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
          <Skeleton className="h-4 w-3/4 mt-1" />
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="flex items-center justify-between py-2">
          <span className="font-mono text-xs text-text-muted">Analysis unavailable</span>
          <button
            onClick={fetchInsights}
            className="font-mono text-xs text-accent hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Success state */}
      {!loading && !error && result && cfg && (
        <>
          {/* Signal badge + sentiment */}
          <div className="flex items-center justify-between mb-3">
            <SignalBadge signal={result.signal} />
            <span className={`font-mono text-xs font-semibold ${SENTIMENT_COLOR[result.sentiment]}`}>
              {result.sentiment}
            </span>
          </div>

          {/* Confidence bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[10px] text-text-muted">Confidence</span>
              <span className="font-mono text-[10px] text-text-secondary">{result.confidence}%</span>
            </div>
            <div className="h-1 w-full rounded-full bg-bg-tertiary overflow-hidden">
              <div
                className={`h-full rounded-full ${cfg.bar}`}
                style={{ width: `${result.confidence}%` }}
              />
            </div>
          </div>

          {/* Reasons */}
          <ul className="space-y-2 mb-4">
            {result.reasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-2">
                <span
                  className={`mt-[5px] h-1.5 w-1.5 rounded-full flex-shrink-0 ${reasonDotColor(reason)}`}
                />
                <span className="font-mono text-xs text-text-secondary leading-relaxed">
                  {reason}
                </span>
              </li>
            ))}
          </ul>

          {/* Summary */}
          <p className="font-mono text-xs text-text-muted italic border-t border-border pt-3 mb-2 leading-relaxed">
            {result.summary}
          </p>

          {/* Timestamp */}
          {generatedAt && (
            <p className="font-mono text-[10px] text-text-muted">
              Generated at {generatedAt}
            </p>
          )}
        </>
      )}
    </div>
  );
}
