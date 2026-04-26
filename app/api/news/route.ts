import { NextResponse } from 'next/server';
import { fetchGeneralNews } from '@/lib/alpaca';

export async function GET() {
  try {
    const news = await fetchGeneralNews(20);
    return NextResponse.json({ news }, { headers: { 'Cache-Control': 's-maxage=300' } });
  } catch (err) {
    console.error('[/api/news]', err);
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 502 });
  }
}
