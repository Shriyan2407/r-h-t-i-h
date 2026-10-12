import { NextRequest, NextResponse } from "next/server";
import { parseTicker, invalidTickerResponse } from "@/lib/validation/ticker";

/* ═══════════════════════════════════════════════════════════════
   R.H.T.I.H — Intelligence API Route
   ALWAYS returns a valid report. No error objects, no blockers.
   Falls through: Ollama → Claude → Deterministic Quant.
═══════════════════════════════════════════════════════════════ */

export interface IntelligenceReport {
  ticker:            string;
  companyName?:      string;
  sector?:           string;
  exchange?:         string;
  currentTrend?:     string;
  currentSentiment?: string;
  aiConfidence?:     number;
  oneLiner?:         string;
  trendState?:       string;
  scores?: {
    technical:number; fundamental:number; momentum:number;
    institutional:number; riskReward:number; smartMoney:number;
    volatility:number; ltInvestment:number; swingTrade:number;
  };
  events?:              any[];
  narrativeEvolution?:  any[];
  sentimentChart?:      any[];
  smartMoneyAnalysis?:  string;
  macroConnections?:    string;
  techAnalysis?:        string;
  graphAnalysis?:       string;
  entryZone?:           { entry:string; stopLoss:string; target1:string; target2:string; riskReward:string };
  timeframes?:          Record<string, { trend:string; strength:string; risk:string; note:string }>;
  institutionalFlow?:   string;
  riskAnalysis?:        string;
  macroContext?:        string;
  aiInsights?:          string;
  bullCase?:            string;
  bearCase?:            string;
  invalidation?:        string;
  latestDevelopments?:  { headline:string; aiRead:string; date:string; sentiment:string }[];
  keyRisks?:            string[];
  narrativeSummary?:    string;
  _meta?: {
    ticker:string; generatedAt:string; newsCount:number;
    hasQuoteData:boolean; hasFinancialData:boolean; hasSentiment:boolean;
    sentimentScore:number|null; model:string; source:string;
    currentPrice:number|null; priceChange:number|null;
  };
}

/** Validate a report is a real report and not a stale error object */
function isValidReport(r: unknown): r is IntelligenceReport {
  if (!r || typeof r !== "object") return false;
  const obj = r as Record<string, unknown>;
  // Error objects have `error` or `code` but no `ticker`
  if ("error" in obj || obj.code === "NO_API_KEY") return false;
  return typeof obj.ticker === "string" && obj.ticker.length > 0;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  let T = "UNKNOWN";

  try {
    const { ticker } = await params;
    const parsedTicker = parseTicker(ticker);
    if (!parsedTicker) return invalidTickerResponse();
    T = parsedTicker;

    // Always bust cache — never serve a cached error object to the UI
    const { getIntelligenceReport } = await import("@/lib/services/intelligenceEngine");
    const report = await getIntelligenceReport(T, true);

    if (isValidReport(report)) {
      return NextResponse.json(report, {
        headers: {
          "Cache-Control": "no-store",
          "X-Engine":      String((report as any)?._meta?.model ?? "unknown"),
          "X-Ticker":      T,
        },
      });
    }

    // Fell through — try generating directly
    const { generateIntelligence } = await import("@/lib/services/intelligenceEngine");
    const fresh = await generateIntelligence(T);
    if (isValidReport(fresh)) {
      return NextResponse.json(fresh, {
        headers: { "Cache-Control": "no-store", "X-Ticker": T },
      });
    }

    throw new Error("Intelligence engine produced no valid report");

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[API /intelligence/${T}] falling back to deterministic:`, message);

    try {
      const { buildDeterministicReport } = await import("@/lib/services/deterministicIntelligence");
      const fallback = buildDeterministicReport(T, null, null, [], null);
      return NextResponse.json(fallback, {
        headers: { "Cache-Control": "no-store", "X-Engine": "emergency-deterministic" },
      });
    } catch (e2) {
      // Absolute last resort — minimal valid shape, NEVER an error object
      return NextResponse.json({
        ticker:           T,
        companyName:      T,
        sector:           "Market Data Unavailable",
        currentSentiment: "NEUTRAL",
        aiConfidence:     50,
        oneLiner:         `Live data temporarily unavailable for ${T}. Analysis will refresh automatically.`,
        trendState:       "Data loading",
        scores: {
          technical:50, fundamental:50, momentum:50, institutional:50,
          riskReward:50, smartMoney:50, volatility:50, ltInvestment:50, swingTrade:50,
        },
        _meta: {
          ticker: T, generatedAt: new Date().toISOString(), newsCount: 0,
          hasQuoteData: false, hasFinancialData: false, hasSentiment: false,
          sentimentScore: null, model: "emergency-fallback", source: "none",
          currentPrice: null, priceChange: null,
        },
      } satisfies IntelligenceReport);
    }
  }
}
