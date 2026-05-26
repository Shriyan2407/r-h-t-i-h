import { NextRequest, NextResponse } from "next/server";
import { cache, TTL } from "@/lib/services/cache";
import { getStockHistory }  from "@/lib/stockHistory";
import type { StockHistoryProfile, EventSentiment } from "@/lib/stockHistory";

/* ═══════════════════════════════════════════════════════════════
   R.H.T.I.H — Company History API Route
   Returns company-specific institutional history intelligence.

   Priority chain:
   1. Hardcoded deep profiles (RELIANCE, TCS, HDFCBANK, ADANIENT, INFY,
      ICICIBANK, BHARTIARTL, HAL, IRFC) — enriched with live news
   2. Dynamic sector-playbook generation for all other tickers

   Always returns a valid StockHistoryProfile — never an error object.
═══════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export interface HistoryAPIResponse extends StockHistoryProfile {
  _meta: {
    ticker:       string;
    generatedAt:  string;
    source:       "hardcoded" | "dynamic";
    isKnownStock: boolean;
    newsCount:    number;
    currentPrice: number | null;
    priceChange:  number | null;
    model:        string;
  };
}

/* Known tickers that have deep hardcoded profiles */
const KNOWN_TICKERS = new Set([
  "RELIANCE","TCS","HDFCBANK","ADANIENT","INFY",
  "ICICIBANK","BHARTIARTL","HAL","IRFC",
]);

function newsToLatestDev(news: any[]): StockHistoryProfile["latestDevelopments"] {
  return news.slice(0, 4).map(n => ({
    headline: n.title,
    aiRead: n.sentiment === "positive"
      ? `Institutional read: Constructive development — adds to the forward earnings visibility and sustains the primary investment thesis. Smart money likely viewing this as confirmation signal to maintain or add exposure.`
      : n.sentiment === "negative"
      ? `Institutional read: Warrants monitoring — assess whether this represents a structural shift or a transient headwind. Institutions will look for management commentary and subsequent quarter data before adjusting positioning materially.`
      : `Institutional read: Neutral development — watch for secondary implications on margin profile or competitive positioning. No immediate thesis change but worth tracking for trend confirmation.`,
    date:      new Date(n.publishedAt ?? Date.now()).toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
    sentiment: (n.sentiment === "positive" ? "BULLISH" : n.sentiment === "negative" ? "BEARISH" : "NEUTRAL") as EventSentiment,
  }));
}

async function fetchLiveData(ticker: string) {
  const timeout = <X>(p: Promise<X>, ms: number, fb: X): Promise<X> =>
    Promise.race([p, new Promise<X>(r => setTimeout(() => r(fb), ms))]);

  const [{ quote, summary }, news] = await Promise.all([
    timeout(
      (async () => {
        const { default: YFClass } = await import("yahoo-finance2");
        const yf = new (YFClass as any)();
        let q: any = null, s: any = null;
        for (const sym of [`${ticker}.NS`, `${ticker}.BO`, ticker]) {
          try { const r = await yf.quote(sym); if (r?.regularMarketPrice) { q = r; break; } } catch { /**/ }
        }
        for (const sym of [`${ticker}.NS`, `${ticker}.BO`]) {
          try {
            s = await yf.quoteSummary(sym, {
              modules: ["assetProfile","financialData","defaultKeyStatistics","summaryDetail"] as any,
            });
            if (s?.assetProfile) break;
          } catch { /**/ }
        }
        return { quote: q, summary: s };
      })(),
      12_000, { quote: null, summary: null }
    ),
    timeout(
      (async () => {
        const { getStockNews } = await import("@/lib/services/newsAggregator");
        return getStockNews(ticker, "");
      })(),
      10_000, [] as any[]
    ),
  ]);

  return { quote, summary, news };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker } = await params;
  const T = ticker.toUpperCase().replace(/\.(NS|BO)$/i, "");
  const cacheKey = `history:${T}`;

  /* ── Serve from cache ─────────────────────────── */
  const cached = cache.get<HistoryAPIResponse>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "no-store", "X-Cache": "HIT", "X-Ticker": T },
    });
  }

  try {
    const { quote, summary, news } = await fetchLiveData(T);
    const liveDevelopments = newsToLatestDev(news);

    let response: HistoryAPIResponse;

    if (KNOWN_TICKERS.has(T)) {
      /* ── Deep hardcoded profile + live news enrichment ─── */
      const base = getStockHistory(T);
      const mergedDevelopments = [
        ...liveDevelopments,
        ...(base.latestDevelopments ?? []),
      ].slice(0, 6);

      response = {
        ...base,
        latestDevelopments: mergedDevelopments,
        _meta: {
          ticker:       T,
          generatedAt:  new Date().toISOString(),
          source:       "hardcoded",
          isKnownStock: true,
          newsCount:    news.length,
          currentPrice: quote?.regularMarketPrice ?? null,
          priceChange:  quote?.regularMarketChangePercent ?? null,
          model:        "institutional-archive",
        },
      };

      cache.set(cacheKey, response, TTL.STATIC); // 24h for deep profiles

    } else {
      /* ── Dynamic generation via sector playbooks ─────── */
      const { buildCompanyHistory } = await import("@/lib/services/companyHistoryEngine");
      const dynamic = buildCompanyHistory(T, quote, summary, news);

      response = {
        ...dynamic,
        _meta: {
          ticker:       T,
          generatedAt:  new Date().toISOString(),
          source:       "dynamic",
          isKnownStock: false,
          newsCount:    news.length,
          currentPrice: quote?.regularMarketPrice ?? null,
          priceChange:  quote?.regularMarketChangePercent ?? null,
          model:        "sector-playbook",
        },
      };

      cache.set(cacheKey, response, 1800); // 30m for dynamic profiles
    }

    return NextResponse.json(response, {
      headers: { "Cache-Control": "no-store", "X-Cache": "MISS", "X-Ticker": T },
    });

  } catch (err) {
    console.error(`[History API /${T}]:`, err);
    /* Absolute last resort — minimal valid shape */
    const fallback = getStockHistory(T); // returns generic for unknown tickers
    const resp: HistoryAPIResponse = {
      ...fallback,
      _meta: {
        ticker:       T,
        generatedAt:  new Date().toISOString(),
        source:       "hardcoded",
        isKnownStock: KNOWN_TICKERS.has(T),
        newsCount:    0,
        currentPrice: null,
        priceChange:  null,
        model:        "fallback",
      },
    };
    return NextResponse.json(resp, { headers: { "Cache-Control": "no-store" } });
  }
}
