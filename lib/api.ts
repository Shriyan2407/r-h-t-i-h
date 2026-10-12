import type {
  StockQuote,
  OHLCVCandle,
  SearchResult,
  TechnicalIndicators,
  FundamentalData,
  AIAnalysis,
  ChartInterval,
  NewsItem,
} from "./types";

/* ═══════════════════════════════════════════════════════════════
   R.H.T.I.H — Unified API Client
   ALL data is fetched from internal Next.js routes.
   Failures PROPAGATE to the caller so the UI can show a real error state.
   Generated sample data is used only in explicit demo mode (see config/demo.ts),
   which can never be enabled in a production build.
═══════════════════════════════════════════════════════════════ */

/** Call an internal Next.js API route — always relative, no CORS. */
async function internal<T>(path: string, init?: RequestInit, timeoutMs = 30_000): Promise<T> {
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      signal:  ctrl.signal,
      ...init,
    });
    clearTimeout(tid);

    const text = await res.text();

    if (text.trim().startsWith("<")) {
      throw new Error(`API route ${path} returned HTML (status ${res.status}) — check server logs`);
    }

    let body: any;
    try { body = JSON.parse(text); } catch { throw new Error(`Non-JSON response from ${path}`); }

    if (!res.ok) {
      throw new Error(body?.error ?? body?.detail ?? `API error ${res.status}`);
    }

    return body as T;
  } finally {
    clearTimeout(tid);
  }
}

type MockModule = typeof import("./mockData");

/**
 * Run a real request. On failure: in demo mode (development only) return sample data;
 * everywhere else rethrow, so a failed request is never disguised as live data.
 */
async function orDemo<T>(
  label: string,
  real: () => Promise<T>,
  demo: (mock: MockModule) => T | Promise<T>,
): Promise<T> {
  try {
    return await real();
  } catch (err) {
    // The environment check is written out INLINE (not via the DEMO_MODE constant in
    // config/demo.ts) and the demo path lives INSIDE the `if`, on purpose. The bundler
    // replaces process.env.* with literals at build time and prunes an `if` whose
    // condition is constant-false - taking the dynamic import of mockData with it - so
    // in a production build the sample-data module is not shipped at all. (A flag
    // imported from another module, or code placed after a `throw`, is NOT pruned.)
    if (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      console.warn(`[API][demo] ${label} failed, using sample data:`, (err as Error).message);
      return demo(await import("./mockData"));
    }
    throw err;
  }
}

// ─── Search ──────────────────────────────────────────────────────────────────

export async function searchStocks(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  return orDemo(
    "search",
    () => internal<SearchResult[]>(`/api/search?q=${encodeURIComponent(query)}`, undefined, 10_000),
    (mock) => mock.generateMockSearchResult(query),
  );
}

// ─── Quote ───────────────────────────────────────────────────────────────────

export async function getStockQuote(ticker: string): Promise<StockQuote> {
  return internal<StockQuote>(`/api/stocks/${ticker}/quote`);
}

// ─── Chart Data ──────────────────────────────────────────────────────────────

export interface Candle {
  time:   string | number;
  open:   number;
  high:   number;
  low:    number;
  close:  number;
  volume: number;
}

export async function getChartData(ticker: string, interval: ChartInterval): Promise<Candle[]> {
  const data = await internal<{ candles: Candle[] }>(
    `/api/stocks/${ticker}/candles?range=${interval}`,
  );
  return data.candles;
}

// ─── Technical Indicators ────────────────────────────────────────────────────

export async function getTechnicalIndicators(ticker: string): Promise<TechnicalIndicators> {
  return orDemo(
    `technicals ${ticker}`,
    () => internal<TechnicalIndicators>(`/api/technicals/${ticker}`, undefined, 25_000),
    async (mock) => {
      let price = 1500;
      try { price = (await getStockQuote(ticker)).current_price; } catch { /* demo only */ }
      return mock.generateMockTechnicalIndicators(ticker, price);
    },
  );
}

// ─── Fundamentals ────────────────────────────────────────────────────────────

export async function getFundamentals(ticker: string): Promise<FundamentalData> {
  return orDemo(
    `fundamentals ${ticker}`,
    () => internal<FundamentalData>(`/api/fundamentals/${ticker}`, undefined, 20_000),
    async (mock) => {
      let pe: number | null = null;
      try { pe = (await getStockQuote(ticker)).pe_ratio; } catch { /* demo only */ }
      return mock.generateMockFundamentals(ticker, pe);
    },
  );
}

// ─── News ─────────────────────────────────────────────────────────────────────

/** Internal RSS news item shape (from newsAggregator service) */
interface RssNewsItem {
  title:       string;
  summary:     string;
  url:         string;
  source:      string;
  publishedAt: string;
  ageHours:    number;
  relevance:   number;
  sentiment:   "positive" | "negative" | "neutral";
}

/** Adapt RSS NewsItem → types.ts NewsItem */
function adaptNews(ticker: string, items: RssNewsItem[]): NewsItem[] {
  return items.map((item, idx) => ({
    id:           `${ticker}-${idx}-${item.publishedAt}`,
    headline:     item.title,
    summary:      item.summary ?? "",
    source:       item.source,
    url:          item.url,
    published_at: item.publishedAt,
    sentiment:    item.sentiment.toUpperCase() as NewsItem["sentiment"],
    signal_type:  item.relevance >= 0.5 ? "SIGNAL" : "NOISE",
    tickers:      [ticker],
  }));
}

export async function getNews(ticker: string): Promise<NewsItem[]> {
  return orDemo(
    `news ${ticker}`,
    async () => {
      const data = await internal<{ items: RssNewsItem[] }>(`/api/news/${ticker}`, undefined, 15_000);
      return adaptNews(ticker, data.items ?? []);
    },
    (mock) => mock.generateMockNews(ticker),
  );
}

// ─── AI Analysis ─────────────────────────────────────────────────────────────

export async function getAIAnalysis(ticker: string): Promise<AIAnalysis> {
  return orDemo(
    `ai-analysis ${ticker}`,
    () => internal<AIAnalysis>(`/api/ai-analysis/${ticker}`, { cache: "no-store" }, 60_000),
    async (mock) => {
      let price = 1500;
      let name  = ticker;
      try {
        const q = await getStockQuote(ticker);
        price = q.current_price;
        name  = q.company_name;
      } catch { /* demo only */ }
      return mock.generateMockAIAnalysis(ticker, price, name);
    },
  );
}
