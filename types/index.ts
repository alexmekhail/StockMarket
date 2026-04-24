export interface QuoteUpdate {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface Snapshot {
  ticker: string;
  price: number;
  prevClose: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
}

export interface AlpacaBar {
  t: string;   // ISO timestamp
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  vw: number;
}

export interface ChartDataPoint {
  time: number;  // Unix seconds (UTCTimestamp)
  value: number;
}

export interface NewsArticle {
  id: number;
  headline: string;
  author: string;
  source: string;
  url: string;
  createdAt: string;
  summary: string;
  symbols: string[];
}

export interface WatchlistItem {
  id: string;
  ticker: string;
  user_id: string;
  created_at: string;
}

export interface PortfolioPosition {
  id: string;
  ticker: string;
  shares: number;
  avg_buy_price: number;
  user_id: string;
  created_at: string;
}

export type TimeRange = '1D' | '1W' | '1M';
