import { NextRequest, NextResponse } from 'next/server';
import { fetchBars } from '@/lib/alpaca';
import { alpacaBarToChartPoint } from '@/lib/utils';
import type { TimeRange } from '@/types';

function getRangeParams(range: TimeRange): { timeframe: string; start: string; end: string } {
  const now = new Date();
  const end = now.toISOString();

  if (range === '1D') {
    // Go back 5 days so we always capture the most recent trading session,
    // even on weekends or after a holiday. We then trim to just the last day below.
    const start = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
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
    let chartData = bars
      .map(alpacaBarToChartPoint)
      .sort((a, b) => a.time - b.time);

    // For 1D: trim to only the most recent trading session.
    // Alpaca timestamps are UTC; ET market hours are UTC-4 (EDT) / UTC-5 (EST).
    // We subtract 5 hours as a conservative offset so the date always falls on the
    // correct US trading day regardless of DST.
    if (range === '1D' && chartData.length > 0) {
      const ET_OFFSET_S = 5 * 60 * 60; // 5 hours in seconds
      const lastTime = chartData[chartData.length - 1].time;
      const lastDateET = new Date((lastTime - ET_OFFSET_S) * 1000)
        .toISOString()
        .substring(0, 10);
      chartData = chartData.filter((d) => {
        const dateET = new Date((d.time - ET_OFFSET_S) * 1000)
          .toISOString()
          .substring(0, 10);
        return dateET === lastDateET;
      });
    }

    return NextResponse.json({ chartData, bars }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error(`[/api/stock/${ticker}/bars]`, err);
    return NextResponse.json({ error: 'Failed to fetch bars' }, { status: 502 });
  }
}
