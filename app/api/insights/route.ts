import { NextRequest, NextResponse } from 'next/server';

interface InsightRequest {
  ticker: string;
  price: number;
  changePercent: number;
  volume: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
}

interface InsightResult {
  signal: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
  confidence: number;
  sentiment: 'Bullish' | 'Neutral' | 'Bearish';
  reasons: string[];
  summary: string;
}

const FALLBACK: InsightResult = {
  signal: 'Hold',
  confidence: 50,
  sentiment: 'Neutral',
  reasons: [
    'Insufficient data to generate analysis',
    'Please try again later',
    'Market conditions unclear',
    'No strong directional signals detected',
  ],
  summary: 'Unable to generate analysis at this time.',
};

// In-memory rate limit + result cache (resets on server restart)
// Add to Vercel env vars: ANTHROPIC_API_KEY
const lastCalled = new Map<string, number>();
const cache = new Map<string, InsightResult>();
const RATE_LIMIT_MS = 60_000;

export async function POST(req: NextRequest) {
  let body: InsightRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { ticker } = body;
  if (!ticker) {
    return NextResponse.json({ error: 'Missing ticker' }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[/api/insights] ANTHROPIC_API_KEY not set');
    return NextResponse.json(FALLBACK);
  }

  const now = Date.now();
  const last = lastCalled.get(ticker) ?? 0;
  if (now - last < RATE_LIMIT_MS) {
    const cached = cache.get(ticker);
    if (cached) return NextResponse.json(cached);
  }
  lastCalled.set(ticker, now);

  const intradayPosition =
    body.high !== body.low
      ? `${(((body.price - body.low) / (body.high - body.low)) * 100).toFixed(0)}% of intraday range`
      : 'flat intraday range';

  const priceVsOpen =
    body.open !== 0
      ? `${body.price >= body.open ? '+' : ''}${(((body.price - body.open) / body.open) * 100).toFixed(2)}% from open`
      : 'n/a';

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: `You are a quantitative stock analyst. Given stock metrics, produce a structured JSON analysis.
Return ONLY valid JSON, no preamble or markdown fences. Schema:
{
  "signal": "Strong Buy" | "Buy" | "Hold" | "Sell" | "Strong Sell",
  "confidence": number (0-100),
  "sentiment": "Bullish" | "Neutral" | "Bearish",
  "reasons": string[] (exactly 4 items, each under 80 characters, specific and data-driven),
  "summary": string (one sentence, under 120 characters)
}`,
        messages: [
          {
            role: 'user',
            content: `Analyze this stock and return JSON only:
Ticker: ${ticker}
Current Price: $${body.price}
Change Today: ${body.changePercent > 0 ? '+' : ''}${body.changePercent.toFixed(2)}%
Volume: ${body.volume.toLocaleString()}
Open: $${body.open}
Day High: $${body.high}
Day Low: $${body.low}
Previous Close: $${body.prevClose}
Price vs Open: ${priceVsOpen}
Intraday Range Position: ${intradayPosition}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error('[/api/insights] Anthropic error:', res.status, await res.text());
      return NextResponse.json(FALLBACK);
    }

    const data = await res.json();
    const text: string = data.content?.[0]?.text ?? '';

    let result: InsightResult;
    try {
      result = JSON.parse(text);
    } catch {
      console.error('[/api/insights] JSON parse failed:', text);
      result = FALLBACK;
    }

    cache.set(ticker, result);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[/api/insights]', err);
    return NextResponse.json(FALLBACK);
  }
}
