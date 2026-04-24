import { NextRequest, NextResponse } from 'next/server';
import { fetchNews } from '@/lib/alpaca';

export async function GET(
  _req: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase();
  try {
    const news = await fetchNews(ticker, 20);
    return NextResponse.json({ news }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error(`[/api/stock/${ticker}/news]`, err);
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 502 });
  }
}
