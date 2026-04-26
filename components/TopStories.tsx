'use client';

import { useEffect, useState } from 'react';
import type { NewsArticle } from '@/types';
import { formatDistanceToNow } from 'date-fns';

export function TopStories() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/news')
      .then((r) => r.json())
      .then((d) => setArticles(d.news ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="border border-border rounded overflow-hidden h-full flex flex-col">
      <div className="px-4 py-2.5 border-b border-border bg-bg-tertiary flex-shrink-0">
        <span className="text-xs font-mono font-semibold text-text-secondary uppercase tracking-wider">
          Top Stories
        </span>
      </div>

      <div className="overflow-y-auto flex-1">
        {loading && (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-1.5 animate-pulse">
                <div className="h-3 bg-bg-hover rounded w-3/4" />
                <div className="h-3 bg-bg-hover rounded w-1/2" />
                <div className="h-2 bg-bg-hover rounded w-1/4" />
              </div>
            ))}
          </div>
        )}

        {!loading && articles.length === 0 && (
          <div className="p-4 text-text-muted text-xs font-mono text-center">No stories available.</div>
        )}

        {!loading &&
          articles.map((article) => (
            <a
              key={article.id}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-3 border-b border-border last:border-b-0 hover:bg-bg-hover transition-colors group"
            >
              <p className="font-mono text-xs text-text-primary leading-snug group-hover:text-accent transition-colors line-clamp-2">
                {article.headline}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="font-mono text-[10px] text-text-muted">{article.source}</span>
                <span className="text-text-muted text-[10px]">·</span>
                <span className="font-mono text-[10px] text-text-muted">
                  {formatDistanceToNow(new Date(article.createdAt), { addSuffix: true })}
                </span>
                {article.symbols.length > 0 && (
                  <>
                    <span className="text-text-muted text-[10px]">·</span>
                    <span className="font-mono text-[10px] text-accent">
                      {article.symbols.slice(0, 3).join(' ')}
                    </span>
                  </>
                )}
              </div>
            </a>
          ))}
      </div>
    </div>
  );
}
