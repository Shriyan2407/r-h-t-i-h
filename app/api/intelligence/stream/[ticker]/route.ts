import { NextRequest } from "next/server";
import { parseTicker, invalidTickerResponse } from "@/lib/validation/ticker";

/* ═══════════════════════════════════════════════════════════════
   R.H.T.I.H — Intelligence SSE Streaming Route
   Timeline:
     t=0ms   → send {type:"status"} + start data fetch
     t≈2s    → send {type:"quant"}  quant report (deterministic, instant)
     t≈2.2s  → send {type:"status"} "AI analyzing..."
     t=5s…   → heartbeat comments every 5s to keep connection alive
     t≈25-75s→ send {type:"ai"}     AI-enriched narrative (if Ollama available)
     t=end   → send {type:"done"}
═══════════════════════════════════════════════════════════════ */

export const dynamic          = "force-dynamic";
export const maxDuration      = 120; // Vercel: 2 min edge timeout

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function heartbeat(): string {
  return `: heartbeat\n\n`;
}

/** Merge only the narrative fields from AI into the quant base report */
function mergeAiNarrative(base: any, ai: any): any {
  if (!ai || typeof ai !== "object") return base;

  const NARRATIVE_FIELDS = [
    "currentSentiment", "oneLiner", "trendState",
    "smartMoneyAnalysis", "macroConnections", "techAnalysis",
    "aiInsights", "bullCase", "bearCase", "narrativeSummary", "keyRisks",
  ] as const;

  const merged = { ...base };
  for (const field of NARRATIVE_FIELDS) {
    if (ai[field] !== undefined && ai[field] !== null && ai[field] !== "") {
      merged[field] = ai[field];
    }
  }
  return merged;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker } = await params;
  const T = parseTicker(ticker);
  if (!T) return invalidTickerResponse();

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (chunk: string) => {
        try { controller.enqueue(enc.encode(chunk)); } catch { /* closed */ }
      };

      let heartbeatId: ReturnType<typeof setInterval> | null = null;

      const cleanup = () => {
        if (heartbeatId) { clearInterval(heartbeatId); heartbeatId = null; }
      };

      try {
        send(sse("status", { message: "Fetching live market data…" }));

        /* ── Step 1: parallel data fetch ─────────────────────── */
        const timeout = <X>(p: Promise<X>, ms: number, fb: X): Promise<X> =>
          Promise.race([p, new Promise<X>(r => setTimeout(() => r(fb), ms))]);

        const [{ quote, summary }, news, sentiment] = await Promise.all([
          timeout(
            (async () => {
              const { default: YFClass } = await import("yahoo-finance2");
              const yf = new (YFClass as any)();
              const syms = [`${T}.NS`, `${T}.BO`, T];
              let q: any = null, s: any = null;
              for (const sym of syms) {
                try { const r = await yf.quote(sym); if (r?.regularMarketPrice) { q = r; break; } } catch { /* */ }
              }
              for (const sym of [`${T}.NS`, `${T}.BO`]) {
                try {
                  s = await yf.quoteSummary(sym, {
                    modules: ["assetProfile","financialData","defaultKeyStatistics","summaryDetail","majorHoldersBreakdown"] as any,
                  });
                  if (s?.assetProfile) break;
                } catch { /* */ }
              }
              return { quote: q, summary: s };
            })(),
            12_000, { quote: null, summary: null }
          ),
          timeout(
            (async () => {
              const { getStockNews } = await import("@/lib/services/newsAggregator");
              return getStockNews(T, "");
            })(),
            10_000, [] as any[]
          ),
          timeout(
            (async () => {
              const { getSocialSentiment } = await import("@/lib/services/socialSentiment");
              return getSocialSentiment(T).catch(() => null);
            })(),
            8_000, null
          ),
        ]);

        /* ── Step 2: deterministic quant report (< 2s) ───────── */
        const { buildDeterministicReport } = await import("@/lib/services/deterministicIntelligence");
        const quantReport = buildDeterministicReport(T, quote, summary, news, sentiment);
        quantReport._meta = {
          ticker:           T,
          generatedAt:      new Date().toISOString(),
          newsCount:        news.length,
          hasQuoteData:     !!quote,
          hasFinancialData: !!summary,
          hasSentiment:     !!sentiment,
          sentimentScore:   (sentiment as any)?.overallScore ?? null,
          model:            "deterministic-quant",
          source:           "yahoo-finance2 + rss-news",
          currentPrice:     quote?.regularMarketPrice ?? null,
          priceChange:      quote?.regularMarketChangePercent ?? null,
        };

        send(sse("quant", { report: quantReport }));
        send(sse("status", { message: "Quant engine complete — AI analysis in progress…" }));

        /* ── Step 3: start heartbeat ─────────────────────────── */
        heartbeatId = setInterval(() => send(heartbeat()), 5_000);

        /* ── Step 4: compact AI prompt ───────────────────────── */
        const { buildCompactPrompt } = await import("@/lib/services/promptBuilder");
        const scores = quantReport.scores ?? {
          technical:50, fundamental:50, momentum:50, institutional:50,
          riskReward:50, smartMoney:50, volatility:50, ltInvestment:50, swingTrade:50,
        };
        const composite = Math.round(
          (scores.technical + scores.fundamental + scores.momentum +
           scores.institutional + scores.riskReward + scores.smartMoney) / 6
        );

        const compactPrompt = buildCompactPrompt({
          ticker: T, quote, summary, news, scores, composite,
        });

        const SYSTEM = [
          "You are R.H.T.I.H Intelligence Core — an institutional AI equity analyst for Indian markets.",
          "You ALWAYS return valid JSON only. No markdown fences, no explanations outside JSON.",
          "Your analysis is specific, non-generic, and evidence-based.",
        ].join(" ");

        /* ── Step 5: try Ollama fast path ────────────────────── */
        let aiReport: any = null;
        try {
          const { callOllamaFast }             = await import("@/lib/ai/ollamaClient");
          const { parseIntelligenceResponse }  = await import("@/lib/services/claudeService");

          const raw = await callOllamaFast(compactPrompt, SYSTEM, 75_000);
          if (raw) {
            // parseIntelligenceResponse validates & cleans; suppress "missing required fields" throw
            try {
              aiReport = parseIntelligenceResponse(raw, T);
            } catch {
              // Partial parse fallback — extract JSON directly
              const match = raw.match(/\{[\s\S]*\}/);
              if (match) {
                try { aiReport = JSON.parse(match[0]); } catch { /* */ }
              }
            }
          }
        } catch { /* Ollama offline — skip */ }

        /* ── Step 6: try Claude if Ollama failed ─────────────── */
        if (!aiReport && process.env.ANTHROPIC_API_KEY?.trim()) {
          try {
            const { callClaude, parseIntelligenceResponse } = await import("@/lib/services/claudeService");
            const raw = await callClaude(compactPrompt, SYSTEM);
            try {
              aiReport = parseIntelligenceResponse(raw, T);
            } catch {
              const match = raw.match(/\{[\s\S]*\}/);
              if (match) {
                try { aiReport = JSON.parse(match[0]); } catch { /* */ }
              }
            }
          } catch { /* Claude failed — no problem, quant is already sent */ }
        }

        /* ── Step 7: send AI-enriched report if available ──────── */
        if (aiReport) {
          const enriched = mergeAiNarrative(quantReport, aiReport);
          enriched._meta = {
            ...quantReport._meta,
            model:  aiReport._meta?.model ?? (process.env.ANTHROPIC_API_KEY ? "claude" : "ollama"),
            source: "yahoo-finance2 + rss-news + ai-narrative",
          };
          send(sse("ai", { report: enriched }));
        }

        send(sse("done", {}));

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Stream /intelligence/stream/${T}]:`, msg);
        send(sse("error", { message: msg }));
      } finally {
        cleanup();
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":      "text/event-stream; charset=utf-8",
      "Cache-Control":     "no-store, no-cache",
      "X-Accel-Buffering": "no",       // Nginx: disable proxy buffering
      "Connection":        "keep-alive",
    },
  });
}
