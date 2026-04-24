import type { QuoteUpdate } from '@/types';

const WS_URL = 'wss://stream.data.alpaca.markets/v2/iex';

type Callback = (update: QuoteUpdate) => void;

class AlpacaSocketManager {
  private ws: WebSocket | null = null;
  private callbacks = new Map<string, Set<Callback>>();
  private prevClose = new Map<string, number>();
  private lastPrice = new Map<string, number>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isAuthenticated = false;

  initialize() {
    if (typeof window === 'undefined') return;
    if (
      this.ws?.readyState === WebSocket.OPEN ||
      this.ws?.readyState === WebSocket.CONNECTING
    )
      return;
    this.connect();
  }

  private connect() {
    const key = process.env.NEXT_PUBLIC_ALPACA_API_KEY;
    const secret = process.env.NEXT_PUBLIC_ALPACA_API_SECRET;
    if (!key || !secret) {
      console.warn('[AlpacaSocket] Missing NEXT_PUBLIC_ALPACA_API_KEY / NEXT_PUBLIC_ALPACA_API_SECRET');
      return;
    }

    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      this.ws!.send(JSON.stringify({ action: 'auth', key, secret }));
    };

    this.ws.onmessage = (event) => {
      try {
        const messages = JSON.parse(event.data as string);
        for (const msg of Array.isArray(messages) ? messages : [messages]) {
          this.handleMessage(msg);
        }
      } catch {}
    };

    this.ws.onclose = () => {
      this.isAuthenticated = false;
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private handleMessage(msg: Record<string, unknown>) {
    if (msg.T === 'success' && msg.msg === 'authenticated') {
      this.isAuthenticated = true;
      this.subscribeAll();
      return;
    }

    // Trade update
    if (msg.T === 't') {
      const ticker = msg.S as string;
      const price = msg.p as number;
      this.lastPrice.set(ticker, price);
      this.notify(ticker, price);
    }
  }

  private notify(ticker: string, price: number) {
    const prevClose = this.prevClose.get(ticker) ?? price;
    const change = price - prevClose;
    const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;
    const update: QuoteUpdate = { ticker, price, change, changePercent };
    this.callbacks.get(ticker)?.forEach((cb) => cb(update));
  }

  private subscribeAll() {
    const tickers = Array.from(this.callbacks.keys());
    if (tickers.length > 0) {
      this.ws!.send(JSON.stringify({ action: 'subscribe', trades: tickers }));
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }

  setPrevClose(ticker: string, prevClose: number) {
    this.prevClose.set(ticker, prevClose);
  }

  getCachedPrice(ticker: string): number | undefined {
    return this.lastPrice.get(ticker);
  }

  subscribe(ticker: string, callback: Callback) {
    if (!this.callbacks.has(ticker)) {
      this.callbacks.set(ticker, new Set());
    }
    this.callbacks.get(ticker)!.add(callback);

    // Emit cached value immediately so UI shows something on mount
    const cached = this.lastPrice.get(ticker);
    if (cached !== undefined) {
      this.notify(ticker, cached);
    }

    if (this.isAuthenticated && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'subscribe', trades: [ticker] }));
    } else {
      this.initialize();
    }
  }

  unsubscribe(ticker: string, callback: Callback) {
    const cbs = this.callbacks.get(ticker);
    if (!cbs) return;
    cbs.delete(callback);
    if (cbs.size === 0) {
      this.callbacks.delete(ticker);
      if (this.isAuthenticated && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: 'unsubscribe', trades: [ticker] }));
      }
    }
  }
}

// Singleton — safe to call from multiple components
export const alpacaSocket = new AlpacaSocketManager();
