import type {
  StockQuote,
  OHLCVCandle,
  SearchResult,
  TechnicalIndicators,
  FundamentalData,
  AIAnalysis,
  MarketBreadth,
  ChartInterval,
  NewsItem,
  MacroIntelligence,
} from "./types";
import {
  generateMockSearchResult,
  generateMockTechnicalIndicators,
  generateMockFundamentals,
  generateMockNews,
  generateMockAIAnalysis,
  generateMockMarketBreadth,
  generateMockTrendingStocks,
} from "./mockData";

/* ═══════════════════════════════════════════════════════════════
   R.H.T.I.H — Unified API Client
   ALL data is fetched from internal Next.js routes.
   No Python backend required. Graceful fallback to mock data.
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

// ─── Search ──────────────────────────────────────────────────────────────────

export async function searchStocks(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  try {
    return await internal<SearchResult[]>(`/api/search?q=${encodeURIComponent(query)}`, undefined, 10_000);
  } catch (e) {
    console.warn("[API] Search failed, using mock:", (e as Error).message);
    return generateMockSearchResult(query);
  }
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
  try {
    return await internal<TechnicalIndicators>(`/api/technicals/${ticker}`, undefined, 25_000);
  } catch (e) {
    console.warn(`[API] Technicals failed for ${ticker}:`, (e as Error).message);
    let price = 1500;
    try { price = (await getStockQuote(ticker)).current_price; } catch { /* ignore */ }
    return generateMockTechnicalIndicators(ticker, price);
  }
}

// ─── Fundamentals ────────────────────────────────────────────────────────────

export async function getFundamentals(ticker: string): Promise<FundamentalData> {
  try {
    return await internal<FundamentalData>(`/api/fundamentals/${ticker}`, undefined, 20_000);
  } catch (e) {
    console.warn(`[API] Fundamentals failed for ${ticker}:`, (e as Error).message);
    let pe: number | null = null;
    try { pe = (await getStockQuote(ticker)).pe_ratio; } catch { /* ignore */ }
    return generateMockFundamentals(ticker, pe);
  }
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
  try {
    const data = await internal<{ items: RssNewsItem[] }>(
      `/api/news/${ticker}`,
      undefined,
      15_000,
    );
    return adaptNews(ticker, data.items ?? []);
  } catch (e) {
    console.warn(`[API] News failed for ${ticker}:`, (e as Error).message);
    return generateMockNews(ticker);
  }
}

// ─── AI Analysis ─────────────────────────────────────────────────────────────

export async function getAIAnalysis(ticker: string): Promise<AIAnalysis> {
  try {
    return await internal<AIAnalysis>(
      `/api/ai-analysis/${ticker}`,
      { cache: "no-store" },
      60_000,
    );
  } catch (e) {
    console.warn(`[API] AI analysis failed for ${ticker}:`, (e as Error).message);
    let price = 1500;
    let name  = ticker;
    try {
      const q = await getStockQuote(ticker);
      price = q.current_price;
      name  = q.company_name;
    } catch { /* ignore */ }
    return generateMockAIAnalysis(ticker, price, name);
  }
}

export async function getMacroIntelligence(): Promise<MacroIntelligence> {
  try {
    return await internal<MacroIntelligence>("/api/macro", undefined, 20_000);
  } catch (e) {
    console.warn("[API] Macro intelligence failed:", (e as Error).message);
    // Return minimal fallback so UI doesn't break
    return {
      fetched_at: new Date().toISOString(),
      regime: { type: "NEUTRAL", label: "Neutral", description: "Macro data unavailable — check connection", confidence: 50 },
      pressure_score: 50,
      rbi_stance: "NEUTRAL",
      indices: { nifty50: null, nifty_bank: null, india_vix: null },
      currency: { usd_inr: null },
      commodities: { crude_brent: null, gold: null },
      global: { sp500: null, us_10y: null },
      sector_rotation: [],
      macro_signals: [],
      risk_factors: ["Macro data fetch failed — retrying"],
    } as unknown as MacroIntelligence;
  }
}

export async function triggerAIAnalysis(ticker: string): Promise<{ job_id: string }> {
  try {
    return { job_id: `job_${ticker.toUpperCase()}_${Date.now()}` };
  } catch {
    return { job_id: `job_mock_${ticker.toUpperCase()}_${Date.now()}` };
  }
}

export async function getAnalysisStatus(
  jobId: string,
): Promise<{ status: "pending" | "running" | "completed" | "failed"; result?: AIAnalysis }> {
  const parts  = jobId.split("_");
  const ticker = parts[1] ?? "RELIANCE";
  let price = 1500;
  let name  = ticker;
  try {
    const q = await getStockQuote(ticker);
    price = q.current_price;
    name  = q.company_name;
  } catch { /* ignore */ }
  return { status: "completed", result: generateMockAIAnalysis(ticker, price, name) };
}

// ─── Market Breadth ──────────────────────────────────────────────────────────

export async function getMarketBreadth(): Promise<MarketBreadth> {
  try {
    return await internal<MarketBreadth>("/api/market/overview", undefined, 12_000);
  } catch (e) {
    console.warn("[API] Market overview failed:", (e as Error).message);
    return generateMockMarketBreadth();
  }
}

// ─── Trending ─────────────────────────────────────────────────────────────────

export async function getTrendingStocks(): Promise<SearchResult[]> {
  try {
    return await internal<SearchResult[]>("/api/market/trending", undefined, 10_000);
  } catch {
    return generateMockTrendingStocks();
  }
}
