import { NextRequest, NextResponse } from 'next/server';
import { fetchCryptoBars } from '@/lib/alpaca';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const symbol    = searchParams.get('symbol');
  const timeframe = searchParams.get('timeframe');
  const start     = searchParams.get('start');
  const end       = searchParams.get('end');

  if (!symbol || !timeframe || !start || !end) {
    return NextResponse.json({ error: 'symbol, timeframe, start, end required' }, { status: 400 });
  }
  try {
    const bars = await fetchCryptoBars(symbol.toUpperCase(), timeframe, start, end);
    return NextResponse.json({ bars }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[/api/crypto/bars]', err);
    return NextResponse.json({ error: 'Failed to fetch crypto bars' }, { status: 502 });
  }
}
