import type { AlpacaBar, NewsArticle, Snapshot } from '@/types';

const BASE_URL = 'https://data.alpaca.markets';
const DATA_V2 = `${BASE_URL}/v2`;
const DATA_V1B1 = `${BASE_URL}/v1beta1`;

function alpacaHeaders(): HeadersInit {
  return {
    'APCA-API-KEY-ID': process.env.ALPACA_API_KEY!,
    'APCA-API-SECRET-KEY': process.env.ALPACA_API_SECRET!,
    Accept: 'application/json',
  };
}

export async function fetchSnapshots(symbols: string[]): Promise<Record<string, Snapshot>> {
  const joined = symbols.join(',');
  const res = await fetch(
    `${DATA_V2}/stocks/snapshots?symbols=${joined}&feed=iex`,
    { headers: alpacaHeaders(), next: { revalidate: 0 } }
  );
  if (!res.ok) throw new Error(`Alpaca snapshots error: ${res.status}`);
  const raw = await res.json();

  const result: Record<string, Snapshot> = {};
  for (const [ticker, data] of Object.entries(raw as Record<string, any>)) {
    const price = data.latestTrade?.p ?? data.minuteBar?.c ?? 0;
    const prevClose = data.prevDailyBar?.c ?? price;
    const change = price - prevClose;
    const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;
    result[ticker] = {
      ticker,
      price,
      prevClose,
      change,
      changePercent,
      open: data.dailyBar?.o ?? 0,
      high: data.dailyBar?.h ?? 0,
      low: data.dailyBar?.l ?? 0,
      volume: data.dailyBar?.v ?? 0,
    };
  }
  return result;
}

export async function fetchBars(
  symbol: string,
  timeframe: string,
  start: string,
  end: string
): Promise<AlpacaBar[]> {
  const params = new URLSearchParams({
    timeframe,
    start,
    end,
    limit: '1000',
    feed: 'iex',
    adjustment: 'raw',
  });
  const res = await fetch(
    `${DATA_V2}/stocks/${encodeURIComponent(symbol)}/bars?${params}`,
    { headers: alpacaHeaders(), next: { revalidate: 0 } }
  );
  if (!res.ok) throw new Error(`Alpaca bars error: ${res.status}`);
  const data = await res.json();
  return data.bars ?? [];
}

export async function fetchNews(symbol: string, limit = 15): Promise<NewsArticle[]> {
  const params = new URLSearchParams({
    symbols: symbol,
    limit: String(limit),
  });
  const res = await fetch(
    `${DATA_V1B1}/news?${params}`,
    { headers: alpacaHeaders(), next: { revalidate: 300 } }
  );
  if (!res.ok) throw new Error(`Alpaca news error: ${res.status}`);
  const data = await res.json();
  return (data.news ?? []).map((item: any): NewsArticle => ({
    id: item.id,
    headline: item.headline,
    author: item.author ?? '',
    source: item.source ?? '',
    url: item.url,
    createdAt: item.created_at,
    summary: item.summary ?? '',
    symbols: item.symbols ?? [],
  }));
}
