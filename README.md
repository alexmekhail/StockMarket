# Market Terminal

A real-time stock market dashboard with a Bloomberg/trading-terminal aesthetic. Built with Next.js 14, Supabase, and Alpaca Markets API.

## Features

- **Live ticker bar** — scrolling marquee with real-time prices for 8 default tickers via WebSocket
- **Stock search** — search any ticker, navigate to a detail page
- **Price history chart** — intraday/weekly/monthly line charts via lightweight-charts
- **News feed** — latest news per ticker from Alpaca's news API
- **Watchlist** — add/remove tickers; live prices update via WebSocket (auth required)
- **Portfolio tracker** — track positions with real-time P&L calculations (auth required)
- **Supabase Auth** — email/password sign in & sign up

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS |
| Charts | lightweight-charts v4 |
| Auth & DB | Supabase (Postgres + Auth) |
| Market data | Alpaca Markets API (REST + WebSocket) |
| Deployment | Vercel |

---

## Prerequisites

1. **Alpaca Markets** account — [alpaca.markets](https://alpaca.markets)  
   Get your API Key ID and Secret from the dashboard. The free tier (IEX feed) is sufficient.

2. **Supabase** project — [supabase.com](https://supabase.com)  
   Get your project URL, anon key, and service role key.

---

## Local Setup

### 1. Clone & install

```bash
git clone https://github.com/your-username/StockMarket.git
cd StockMarket
npm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```env
# Alpaca Markets API (server-side REST calls)
ALPACA_API_KEY=your_alpaca_key_id
ALPACA_API_SECRET=your_alpaca_secret

# Alpaca Markets API (client-side WebSocket streaming)
# These are exposed to the browser — use a read-only market data key
NEXT_PUBLIC_ALPACA_API_KEY=your_alpaca_key_id
NEXT_PUBLIC_ALPACA_API_SECRET=your_alpaca_secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

> **Security note:** The Alpaca API key/secret are used client-side for WebSocket streaming.
> Alpaca does not offer read-only market data scopes, so use the same credentials.
> They grant access to market data only — never expose your brokerage trading credentials if those differ.

### 3. Set up Supabase database

In your Supabase project, go to **SQL Editor** and run [`supabase-schema.sql`](./supabase-schema.sql).

This creates the `watchlist` and `portfolio` tables with Row Level Security policies.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment (Vercel)

### Manual deploy

```bash
npm install -g vercel
vercel --prod
```

Set all environment variables in the Vercel dashboard under **Project → Settings → Environment Variables**.

### GitHub Actions CI/CD

The workflow in [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) deploys to Vercel on every push to `main`.

**Required GitHub Actions secrets:**

| Secret | Where to find it |
|--------|-----------------|
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens |
| `VERCEL_ORG_ID` | `.vercel/project.json` after `vercel link` |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` after `vercel link` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
| `ALPACA_API_KEY` | Alpaca dashboard |
| `ALPACA_API_SECRET` | Alpaca dashboard |
| `NEXT_PUBLIC_ALPACA_API_KEY` | Alpaca dashboard |
| `NEXT_PUBLIC_ALPACA_API_SECRET` | Alpaca dashboard |

To get your Vercel Org/Project IDs, run `vercel link` locally — it writes `.vercel/project.json`.

---

## Project Structure

```
app/
├── api/
│   ├── snapshots/route.ts          # Batch price snapshots
│   ├── stock/[ticker]/
│   │   ├── bars/route.ts           # Historical bar data
│   │   ├── news/route.ts           # News articles
│   │   └── snapshot/route.ts       # Single-stock snapshot
│   ├── watchlist/route.ts          # Watchlist CRUD
│   └── portfolio/route.ts          # Portfolio CRUD
├── stock/[ticker]/page.tsx         # Stock detail page
├── layout.tsx
└── page.tsx                        # Home (portfolio + watchlist)

components/
├── AuthProvider.tsx                # Supabase auth context + useAuth hook
├── AuthModal.tsx                   # Sign in / sign up modal
├── Header.tsx                      # Top nav with search + auth
├── TickerBar.tsx                   # Scrolling live ticker marquee
├── StockChart.tsx                  # lightweight-charts wrapper
├── NewsPanel.tsx                   # News feed
├── Watchlist.tsx                   # Watchlist panel
├── PortfolioTable.tsx              # Portfolio table with live P&L
├── AddPositionModal.tsx            # Add/edit portfolio position
├── PriceDisplay.tsx                # Formatted price + change
└── Skeleton.tsx                    # Loading skeleton components

lib/
├── alpaca.ts                       # Alpaca REST helpers
├── alpacaSocket.ts                 # WebSocket singleton manager
├── supabase.ts                     # Browser Supabase client
├── supabase-server.ts              # Server Supabase client (API routes)
└── utils.ts                        # Price formatting, date helpers

types/index.ts                      # Shared TypeScript interfaces
middleware.ts                       # Supabase session refresh
```

---

## Real-Time Architecture

WebSocket connections are managed by a **client-side singleton** (`lib/alpacaSocket.ts`):

- Connects to `wss://stream.data.alpaca.markets/v2/iex`
- Multiple components subscribe to the same ticker — only one WS message subscription per ticker
- Unsubscribes when no components are listening
- Automatically reconnects on disconnect (3-second backoff)
- On reconnect, re-subscribes to all active tickers

Initial prices are fetched via REST (snapshots endpoint) so the UI shows data immediately before the WebSocket authenticates.

---

## Alpaca API Notes

- Uses the **IEX feed** (free tier) for both REST and WebSocket
- WebSocket: authenticates, then subscribes to `trades` for real-time price updates
- REST endpoints used: `snapshots`, `bars`, `news`
- Rate limits: REST endpoints are subject to Alpaca's rate limits (200 requests/min on free tier)

---

## Database Schema

See [`supabase-schema.sql`](./supabase-schema.sql) for the full schema with RLS policies.

```sql
-- Watchlist: one row per user per ticker
watchlist (id, user_id, ticker, created_at)

-- Portfolio: one row per user per ticker (upsert on conflict)
portfolio (id, user_id, ticker, shares, avg_buy_price, created_at)
```

Both tables have Row Level Security — users can only read/write their own rows.
