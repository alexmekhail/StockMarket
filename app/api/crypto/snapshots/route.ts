import { NextRequest, NextResponse } from 'next/server';
import { fetchCryptoSnapshots } from '@/lib/alpaca';

export async function GET(req: NextRequest) {
  const symbols = req.nextUrl.searchParams.get('symbols');
  if (!symbols) {
    return NextResponse.json({ error: 'symbols param required' }, { status: 400 });
  }
  try {
    const tickers = symbols.split(',').map((s) => s.trim().toUpperCase());
    const data = await fetchCryptoSnapshots(tickers);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[/api/crypto/snapshots]', err);
    return NextResponse.json({ error: 'Failed to fetch crypto snapshots' }, { status: 502 });
  }
}
