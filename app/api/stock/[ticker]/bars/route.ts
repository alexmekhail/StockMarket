import { NextRequest, NextResponse } from 'next/server';
import { fetchBars } from '@/lib/alpaca';
import { alpacaBarToChartPoint } from '@/lib/utils';
import type { TimeRange } from '@/types';
import { subDays, subMonths, startOfDay, format } from 'date-fns';

function getRangeParams(range: TimeRange): { timeframe: string; start: string; end: string } {
  const now = new Date();
  const end = now.toISOString();

  if (range === '1D') {
    const start = new Date(now);
    start.setHours(9, 30, 0, 0);
    // If before market open, use previous day
    if (now < start) start.setDate(start.getDate() - 1);
    return { timeframe: '1Min', start: start.toISOString(), end };
  }
  if (range === '1W') {
    return { timeframe: '15Min', start: subDays(now, 7).toISOString(), end };
  }
  // 1M
  return { timeframe: '1Day', start: subMonths(now, 1).toISOString(), end };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase();
  const range = (req.nextUrl.searchParams.get('range') ?? '1D') as TimeRange;

  try {
    const { timeframe, start, end } = getRangeParams(range);
    const bars = await fetchBars(ticker, timeframe, start, end);
    const chartData = bars.map(alpacaBarToChartPoint);
    return NextResponse.json({ chartData, bars }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error(`[/api/stock/${ticker}/bars]`, err);
    return NextResponse.json({ error: 'Failed to fetch bars' }, { status: 502 });
  }
}
