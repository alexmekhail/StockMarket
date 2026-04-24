'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { NewsArticle } from '@/types';
import { Skeleton } from './Skeleton';

interface NewsPanelProps {
  ticker: string;
}

export function NewsPanel({ ticker }: NewsPanelProps) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/stock/${ticker}/news`)
      .then((r) => r.json())
      .then((d) => setArticles(d.news ?? []))
      .catch(() => setError('Failed to load news'))
      .finally(() => setLoading(false));
  }, [ticker]);

  return (
    <div className="flex flex-col gap-0 border border-border rounded overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-bg-tertiary">
        <span className="text-xs font-mono font-semibold text-text-secondary uppercase tracking-wider">
          News — {ticker}
        </span>
      </div>

      {loading && (
        <div className="p-3 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 text-loss text-xs font-mono">{error}</div>
      )}

      {!loading && !error && articles.length === 0 && (
        <div className="p-4 text-text-muted text-xs font-mono">No news found for {ticker}.</div>
      )}

      {!loading && articles.map((article) => (
        <a
          key={article.id}
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block px-4 py-3 border-b border-border last:border-b-0 hover:bg-bg-hover transition-colors group"
        >
          <p className="text-text-primary text-sm leading-snug group-hover:text-accent transition-colors line-clamp-2">
            {article.headline}
          </p>
          <div className="mt-1.5 flex items-center gap-2 text-xs font-mono text-text-muted">
            {article.source && (
              <span className="text-text-secondary">{article.source}</span>
            )}
            {article.source && <span>·</span>}
            <span>{formatDistanceToNow(new Date(article.createdAt), { addSuffix: true })}</span>
          </div>
        </a>
      ))}
    </div>
  );
}
