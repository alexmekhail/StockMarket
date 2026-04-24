export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export function formatChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}`;
}

export function formatChangePercent(pct: number): string {
  const arrow = pct >= 0 ? '▲' : '▼';
  return `${arrow} ${Math.abs(pct).toFixed(2)}%`;
}

export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}K`;
  return volume.toString();
}

export function formatLargeNumber(n: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function isPositiveChange(change: number): boolean {
  return change >= 0;
}

export function alpacaBarToChartPoint(bar: { t: string; c: number }): { time: number; value: number } {
  return {
    time: Math.floor(new Date(bar.t).getTime() / 1000),
    value: bar.c,
  };
}

export function getTradingDayStart(): Date {
  const now = new Date();
  const start = new Date(now);
  start.setHours(9, 30, 0, 0);
  if (now < start) {
    start.setDate(start.getDate() - 1);
  }
  return start;
}

export function getISO(date: Date): string {
  return date.toISOString();
}
