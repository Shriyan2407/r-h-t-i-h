import { NextRequest, NextResponse } from "next/server";
import { TTL } from "@/lib/services/cache";
import { sharedGet, sharedSet } from "@/lib/cache/shared";
import { getStockHistory }  from "@/lib/stockHistory";
import type { StockHistoryProfile, EventSentiment } from "@/lib/stockHistory";
import { parseTicker, invalidTickerResponse } from "@/lib/validation/ticker";

/* ═══════════════════════════════════════════════════════════════
   EquityLens — Company History API Route

   Priority chain:
   1. Cache (HIT → serve immediately)
   2. For KNOWN tickers → hardcoded deep profile + live news enrichment
   3. For ALL OTHER tickers → Claude AI generates real company history
   4. Fallback → sector playbook (no API key / Claude timeout)
   5. Last resort → generic fallback

   Cache TTL:
   - Known tickers: 24h (stable institutional archive)
   - AI-generated:  4h  (semi-fresh but expensive)
   - Sector fallback: 30m
═══════════════════════════════════════════════════════════════ */

export const dynamic    = "force-dynamic";
export const maxDuration = 60;

export interface HistoryAPIResponse extends StockHistoryProfile {
  _meta: {
    ticker:       string;
    generatedAt:  string;
    source:       "hardcoded" | "ai-generated" | "sector-playbook" | "fallback";
    isKnownStock: boolean;
    newsCount:    number;
    currentPrice: number | null;
    priceChange:  number | null;
    model:        string;
  };
}

/* Known tickers with hand-curated deep profiles */
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
  const T = parseTicker(ticker);
  if (!T) return invalidTickerResponse();

  /* ── Cache hit ───────────────────────────────────────────── */
  const cached = await sharedGet<HistoryAPIResponse>("history", T);
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
      /* ── Deep hardcoded profile + live news enrichment ────── */
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

      await sharedSet("history", T, response, TTL.STATIC); // 24h

    } else {
      /* ── AI-generated company-specific history ───────────── */
      let dynamic: StockHistoryProfile;
      let source: HistoryAPIResponse["_meta"]["source"] = "ai-generated";
      let model = "claude-ai-historian";

      try {
        const { generateAICompanyHistory } = await import("@/lib/services/aiHistoryEngine");
        dynamic = await generateAICompanyHistory(T, quote, summary, news);
      } catch (aiErr) {
        console.warn(`[History API] AI generation failed for ${T}, falling back to sector playbook:`, aiErr);
        /* Fallback: sector playbook (no API key or Claude timeout) */
        const { buildCompanyHistory } = await import("@/lib/services/companyHistoryEngine");
        dynamic = buildCompanyHistory(T, quote, summary, news);
        source  = "sector-playbook";
        model   = "sector-playbook";
      }

      /* Merge live news into latestDevelopments */
      dynamic.latestDevelopments = liveDevelopments.length > 0
        ? liveDevelopments
        : dynamic.latestDevelopments;

      response = {
        ...dynamic,
        _meta: {
          ticker:       T,
          generatedAt:  new Date().toISOString(),
          source,
          isKnownStock: false,
          newsCount:    news.length,
          currentPrice: quote?.regularMarketPrice ?? null,
          priceChange:  quote?.regularMarketChangePercent ?? null,
          model,
        },
      };

      /* Cache AI results for 4h (expensive to regenerate) */
      await sharedSet("history", T, response, source === "ai-generated" ? 14_400 : 1800);
    }

    return NextResponse.json(response, {
      headers: { "Cache-Control": "no-store", "X-Cache": "MISS", "X-Ticker": T },
    });

  } catch (err) {
    console.error(`[History API /${T}]:`, err);
    const fallback = getStockHistory(T);
    const resp: HistoryAPIResponse = {
      ...fallback,
      _meta: {
        ticker:       T,
        generatedAt:  new Date().toISOString(),
        source:       "fallback",
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
