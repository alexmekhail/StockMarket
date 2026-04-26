import { NextRequest, NextResponse } from 'next/server';
import { fetchBars } from '@/lib/alpaca';
import { alpacaBarToChartPoint } from '@/lib/utils';
import type { TimeRange } from '@/types';

function getRangeParams(range: TimeRange): { timeframe: string; start: string; end: string } {
  const now = new Date();
  const end = now.toISOString();

  if (range === '1D') {
    // Go back ~26 hours to capture the full latest trading session regardless of timezone.
    // The IEX feed returns minute bars only during market hours so we'll always get
    // a clean single day of data even with a larger window.
    const start = new Date(now.getTime() - 26 * 60 * 60 * 1000);
    return { timeframe: '1Min', start: start.toISOString(), end };
  }

  if (range === '1W') {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { timeframe: '15Min', start: start.toISOString(), end };
  }

  // 1M
  const start = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);
  return { timeframe: '1Day', start: start.toISOString(), end };
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
    const chartData = bars
      .map(alpacaBarToChartPoint)
      .sort((a, b) => a.time - b.time);

    return NextResponse.json({ chartData, bars }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error(`[/api/stock/${ticker}/bars]`, err);
    return NextResponse.json({ error: 'Failed to fetch bars' }, { status: 502 });
  }
}
