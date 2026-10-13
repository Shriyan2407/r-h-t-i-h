import { NextRequest, NextResponse } from "next/server";
import { TTL }               from "@/lib/services/cache";
import { sharedPeek, sharedWrap } from "@/lib/cache/shared";
import { timed }             from "@/lib/observability/metrics";
import { computeQuantScore, buildQuantSummary } from "@/lib/scoring/quantEngine";
import { callOllama, getOllamaModel } from "@/lib/ai/ollamaClient";
import { generateDeterministicAnalysis }   from "@/lib/ai/narrativeEngine";
import type { AIAnalysis, Verdict, TechnicalIndicators, FundamentalData } from "@/lib/types";
import { parseTicker, invalidTickerResponse } from "@/lib/validation/ticker";
import { getTechnicals } from "@/lib/services/technicals";
import { getFundamentals } from "@/lib/services/fundamentals";
import { getMacroIntelligence } from "@/lib/services/macro";
import { auth } from "@/lib/auth/auth";
import { enforceRateLimit, POLICIES } from "@/lib/ratelimit/guard";

/* ═══════════════════════════════════════════════════════════════
   R.H.T.I.H — Compressed Intelligence AI Analysis
   Priority: 1) Ollama local LLM  2) Claude (if key set)  3) Deterministic quant
   NEVER returns 503. Works fully offline.
═══════════════════════════════════════════════════════════════ */

export const maxDuration = 60;

function safeNum(v: any): number | null {
  const n = Number(v);
  return isNaN(n) ? null : Math.round(n * 100) / 100;
}
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

/* ── Internal data fetchers ──────────────────────────────── */

/**
 * Resolve a service call, or `null` if it fails or exceeds `ms`. Services are called
 * IN-PROCESS: the previous implementation fetched this app's own /api routes over HTTP,
 * which carried no session (so the auth proxy answered 401) and defaulted to
 * http://localhost:3000, so technicals, fundamentals and macro were always missing and every
 * stock fell through to a placeholder HOLD.
 */
function withTimeout<X>(p: Promise<X>, ms: number): Promise<X | null> {
  return Promise.race([
    p.catch((err) => {
      console.warn("[ai-analysis] upstream failed:", (err as Error).message);
      return null;
    }),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

async function getQuoteData(ticker: string) {
  const { default: yf } = await import("yahoo-finance2");
  const yfs = yf as any;
  for (const sym of [`${ticker}.NS`, `${ticker}.BO`]) {
    try {
      const q = await yfs.quote(sym);
      if (q?.regularMarketPrice) return q;
    } catch { /* try next */ }
  }
  return null;
}

async function getNewsHeadlines(ticker: string): Promise<string[]> {
  try {
    const { getStockNews } = await import("@/lib/services/newsAggregator");
    const items = await getStockNews(ticker);
    return items.slice(0, 15).map(n => `[${n.sentiment.toUpperCase()}] ${n.title} (${n.source})`);
  } catch { return []; }
}


/* ── Ollama prompt (compressed ~500 tokens) ──────────────── */

function buildOllamaPrompt(ticker: string, quote: any, quantSummary: string, headlines: string[]): string {
  const price    = safeNum(quote?.regularMarketPrice) ?? 0;
  const chgPct   = safeNum(quote?.regularMarketChangePercent) ?? 0;
  const hi52     = safeNum(quote?.fiftyTwoWeekHigh) ?? price * 1.3;
  const lo52     = safeNum(quote?.fiftyTwoWeekLow)  ?? price * 0.7;
  const mktCap   = quote?.marketCap ? `₹${(quote.marketCap / 1e12).toFixed(2)}T` : "N/A";
  const pe       = safeNum(quote?.trailingPE);
  const mktCapCat = (quote?.marketCap ?? 0) >= 2e12 ? "Large Cap" : (quote?.marketCap ?? 0) >= 5e11 ? "Mid Cap" : "Small Cap";
  const newsBlock = headlines.length > 0
    ? headlines.slice(0, 12).map((h, i) => `${i + 1}. ${h}`).join("\n")
    : "No recent news. Use sector knowledge.";

  return `R.H.T.I.H INTELLIGENCE — ${new Date().toLocaleDateString("en-IN")}
${ticker} | ₹${price.toFixed(2)} (${chgPct >= 0 ? "+" : ""}${chgPct.toFixed(2)}%) | ${mktCapCat} ${mktCap}
52W: ₹${lo52.toFixed(0)}–₹${hi52.toFixed(0)} | P/E: ${pe?.toFixed(1) ?? "N/A"}
Company: ${quote?.longName ?? quote?.shortName ?? ticker}
Sector: ${quote?.sector ?? "Unknown"} | Industry: ${quote?.industry ?? "Unknown"}

${quantSummary}

NEWS (${headlines.length}):
${newsBlock}

Return ONLY valid JSON (no markdown). Schema:
{
  "company_name":"<full name>",
  "snapshot":{"trend_bias":"<Bullish|Bearish|Neutral>","momentum":"<Strong|Moderate|Weak|Negative>","risk_profile":"<Conservative|Moderate|Aggressive>","analyst_consensus":"<Overweight|Neutral|Underweight>"},
  "lifecycle":{"founding_year":<n>,"key_milestones":[{"year":<n>,"event":"<specific>","impact":"POSITIVE|NEGATIVE|NEUTRAL"}],"business_evolution":"<2 sentences>","management_quality":"<Excellent|Good|Average|Poor> — reason","capital_allocation_quality":"<2 sentences>","crises_survived":["<c1>","<c2>","<c3>"],"competitive_moat":"<2 sentences>"},
  "technical":{"summary":"<3 sentences>","signals":[{"indicator":"RSI (14)","signal":"BUY|SELL|NEUTRAL","value":"<v>","interpretation":"<i>"},{"indicator":"MACD","signal":"BUY|SELL|NEUTRAL","value":"<v>","interpretation":"<i>"},{"indicator":"Trend","signal":"BUY|SELL|NEUTRAL","value":"<v>","interpretation":"<i>"},{"indicator":"EMA Alignment","signal":"BUY|SELL|NEUTRAL","value":"<v>","interpretation":"<i>"}],"key_levels":{"immediate_support":<n>,"immediate_resistance":<n>,"breakout_level":<n>,"breakdown_level":<n>},"volume_analysis":"<1 s>","momentum_analysis":"<1 s>"},
  "fundamentals":{"summary":"<3 s>","strengths":["<s1>","<s2>","<s3>"],"red_flags":[{"category":"<c>","flag":"<f>","severity":"HIGH|MEDIUM|LOW"}],"valuation_assessment":"<1 s>","financial_health":"<1 s>","cash_flow_quality":"<1 s>"},
  "macro":{"summary":"<2 s>","rbi_impact":"<1 s>","budget_impact":"<1 s>","sector_tailwinds":["<t1>","<t2>","<t3>"],"sector_headwinds":["<h1>","<h2>"],"policy_risks":["<r1>","<r2>"],"facts_vs_interpretation":{"facts":["<f1>","<f2>","<f3>"],"interpretations":["<i1>","<i2>","<i3>"]}},
  "sentiment":{"overall":"POSITIVE|NEGATIVE|NEUTRAL|MIXED","score":<-1 to 1>,"key_catalysts":["<c1>","<c2>"],"key_risks_from_news":["<r1>","<r2>"],"noise_filtered_summary":"<2 s>","sources":[{"headline":"<h>","source":"<s>","sentiment":"POSITIVE|NEGATIVE|NEUTRAL","signal_type":"SIGNAL|NOISE","published_at":"${new Date().toISOString()}"}]},
  "scenarios":[{"type":"BULL","target_price":<₹ ~25% above ${price.toFixed(0)}>,"probability":<35-45>,"timeline":"12 months","key_drivers":["<d1>","<d2>"],"invalidation_level":<₹>},{"type":"BASE","target_price":<₹ ~10% above ${price.toFixed(0)}>,"probability":<40-50>,"timeline":"12 months","key_drivers":["<d1>","<d2>"],"invalidation_level":<₹>},{"type":"BEAR","target_price":<₹ ~15% below ${price.toFixed(0)}>,"probability":<15-25>,"timeline":"9 months","key_drivers":["<d1>","<d2>"],"invalidation_level":<₹>}],
  "verdict":{"rating":"STRONG BUY|BUY|HOLD|SELL|STRONG SELL","timeline":"<3-6|6-12|12-18 months>","entry_range":[<₹lo>,<₹hi>],"stop_loss":<₹>,"target_1":<₹>,"target_2":<₹>,"risk_reward":<1.5-4>,"key_risks":["<r1>","<r2>","<r3>"],"key_catalysts":["<c1>","<c2>","<c3>"],"investment_thesis":"<2 sentences SPECIFIC to ${ticker}>","when_to_review":"<trigger>"}
}
RULES: Use price ₹${price.toFixed(2)}. Be SPECIFIC to ${ticker}. BULL+BASE+BEAR=100.`;
}

/* ── Parse Ollama/Claude response ────────────────────────── */

function parseAndDefault(raw: string, ticker: string, quote: any, quantScore: any): AIAnalysis {
  let jsonStr = raw;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) jsonStr = fenced[1];
  else {
    const s = raw.indexOf("{"); const e = raw.lastIndexOf("}");
    if (s !== -1 && e > s) jsonStr = raw.slice(s, e + 1);
  }
  jsonStr = jsonStr.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  let data: any;
  try { data = JSON.parse(jsonStr); }
  catch { throw new Error("LLM returned invalid JSON"); }

  const price = safeNum(quote?.regularMarketPrice) ?? 1000;
  const safe  = (v: any, fb: any) => (v != null ? v : fb);
  const mktCapCat = (quote?.marketCap ?? 0) >= 2e12 ? "Large Cap" : (quote?.marketCap ?? 0) >= 5e11 ? "Mid Cap" : "Small Cap";

  const result: AIAnalysis = {
    ticker:       ticker.toUpperCase(),
    company_name: safe(data.company_name, quote?.longName ?? ticker),
    generated_at: new Date().toISOString(),
    analysis_id:  `${ticker}-${Date.now()}`,
    snapshot: {
      market_cap_category: mktCapCat,
      trend_bias:          safe(data.snapshot?.trend_bias, "Neutral"),
      momentum:            safe(data.snapshot?.momentum, "Moderate"),
      risk_profile:        safe(data.snapshot?.risk_profile, "Moderate"),
      analyst_consensus:   safe(data.snapshot?.analyst_consensus, "Neutral"),
    },
    lifecycle: {
      founding_year:              safe(data.lifecycle?.founding_year, 2000),
      key_milestones:             safe(data.lifecycle?.key_milestones, []),
      business_evolution:         safe(data.lifecycle?.business_evolution, ""),
      management_quality:         safe(data.lifecycle?.management_quality, "Good"),
      capital_allocation_quality: safe(data.lifecycle?.capital_allocation_quality, ""),
      crises_survived:            safe(data.lifecycle?.crises_survived, []),
      competitive_moat:           safe(data.lifecycle?.competitive_moat, ""),
    },
    technical: {
      summary:           safe(data.technical?.summary, `Technical composite: ${quantScore.technical}/100`),
      signals:           safe(data.technical?.signals, []),
      key_levels: {
        immediate_support:    safeNum(data.technical?.key_levels?.immediate_support)    ?? Math.round(price * 0.95),
        immediate_resistance: safeNum(data.technical?.key_levels?.immediate_resistance) ?? Math.round(price * 1.05),
        breakout_level:       safeNum(data.technical?.key_levels?.breakout_level)       ?? Math.round(price * 1.08),
        breakdown_level:      safeNum(data.technical?.key_levels?.breakdown_level)      ?? Math.round(price * 0.92),
      },
      volume_analysis:   safe(data.technical?.volume_analysis, ""),
      momentum_analysis: safe(data.technical?.momentum_analysis, ""),
    },
    fundamentals: {
      summary:              safe(data.fundamentals?.summary, `Fundamental score: ${quantScore.fundamental}/100`),
      strengths:            safe(data.fundamentals?.strengths, []),
      red_flags:            safe(data.fundamentals?.red_flags, []),
      valuation_assessment: safe(data.fundamentals?.valuation_assessment, ""),
      financial_health:     safe(data.fundamentals?.financial_health, ""),
      cash_flow_quality:    safe(data.fundamentals?.cash_flow_quality, ""),
    },
    macro: {
      summary:          safe(data.macro?.summary, ""),
      rbi_impact:       safe(data.macro?.rbi_impact, ""),
      budget_impact:    safe(data.macro?.budget_impact, ""),
      sector_tailwinds: safe(data.macro?.sector_tailwinds, []),
      sector_headwinds: safe(data.macro?.sector_headwinds, []),
      policy_risks:     safe(data.macro?.policy_risks, []),
      facts_vs_interpretation: {
        facts:           safe(data.macro?.facts_vs_interpretation?.facts, []),
        interpretations: safe(data.macro?.facts_vs_interpretation?.interpretations, []),
      },
    },
    sentiment: {
      overall:                safe(data.sentiment?.overall, "NEUTRAL"),
      score:                  safeNum(data.sentiment?.score) ?? 0,
      key_catalysts:          safe(data.sentiment?.key_catalysts, []),
      key_risks_from_news:    safe(data.sentiment?.key_risks_from_news, []),
      noise_filtered_summary: safe(data.sentiment?.noise_filtered_summary, ""),
      sources:                safe(data.sentiment?.sources, []),
    },
    scenarios: (() => {
      const ex  = data.scenarios ?? [];
      const has = new Set(ex.map((s: any) => s.type));
      const def = [
        { type: "BULL", target_price: Math.round(price * 1.28), probability: 35, timeline: "12 months", key_drivers: ["Earnings beat", "Sector re-rating"],    invalidation_level: Math.round(price * 0.88) },
        { type: "BASE", target_price: Math.round(price * 1.12), probability: 45, timeline: "12 months", key_drivers: ["Steady execution", "Macro stability"],  invalidation_level: Math.round(price * 0.90) },
        { type: "BEAR", target_price: Math.round(price * 0.82), probability: 20, timeline: "9 months",  key_drivers: ["Earnings miss", "Sector headwinds"],    invalidation_level: Math.round(price * 1.10) },
      ];
      return [...ex, ...def.filter(d => !has.has(d.type))];
    })(),
    verdict: (() => {
      const v = data.verdict ?? {};
      const valid: Verdict[] = ["STRONG BUY","BUY","HOLD","SELL","STRONG SELL"];
      return {
        rating:            valid.includes(v.rating) ? v.rating : quantScore.verdict,
        // Never taken from the LLM: a model-written "confidence" is not a calibrated probability.
        signal_strength:   quantScore.signalStrength,
        probability:       null,
        timeline:          v.timeline ?? "6-12 months",
        entry_range:       Array.isArray(v.entry_range) && v.entry_range.length === 2 ? v.entry_range : [Math.round(price * 0.97), Math.round(price)],
        stop_loss:         safeNum(v.stop_loss)   ?? Math.round(price * 0.90),
        target_1:          safeNum(v.target_1)    ?? Math.round(price * 1.12),
        target_2:          safeNum(v.target_2)    ?? Math.round(price * 1.25),
        risk_reward:       safeNum(v.risk_reward) ?? 2.0,
        key_risks:         Array.isArray(v.key_risks)     ? v.key_risks     : [],
        key_catalysts:     Array.isArray(v.key_catalysts) ? v.key_catalysts : [],
        investment_thesis: v.investment_thesis ?? "",
        when_to_review:    v.when_to_review    ?? "Quarterly earnings",
      };
    })(),
  };
  return result;
}

/* ── Main analysis generator ─────────────────────────────── */

async function generateAnalysis(ticker: string): Promise<AIAnalysis & { _meta?: any }> {
  const T = ticker.toUpperCase().replace(/\.(NS|BO)$/i, "");

  const [quote, techData, fundData, headlines, macro] = await Promise.all([
    Promise.race([getQuoteData(T), new Promise<null>(r => setTimeout(() => r(null), 12_000))]),
    withTimeout(getTechnicals(T), 12_000),
    withTimeout(getFundamentals(T), 12_000),
    Promise.race([getNewsHeadlines(T), new Promise<string[]>(r => setTimeout(() => r([]), 8_000))]),
    withTimeout(getMacroIntelligence(), 10_000),
  ]);

  const price = safeNum(quote?.regularMarketPrice) ?? 0;
  const hi52  = safeNum(quote?.fiftyTwoWeekHigh)   ?? price * 1.3;
  const lo52  = safeNum(quote?.fiftyTwoWeekLow)    ?? price * 0.7;

  // Always compute deterministic quant scores
  const emptyFund: FundamentalData = { pe_ratio: null, pb_ratio: null, ps_ratio: null, ev_ebitda: null, sector_pe: null, roe: null, roce: null, roa: null, net_margin: null, operating_margin: null, gross_margin: null, revenue_growth_yoy: null, profit_growth_yoy: null, eps_growth_3yr: null, debt_to_equity: null, current_ratio: null, quick_ratio: null, interest_coverage: null, free_cash_flow: null, promoter_holding: null, fii_holding: null, dii_holding: null, pledged_shares: null, asset_turnover: null, inventory_turnover: null, receivables_turnover: null };
  const hasTech = techData !== null;
  const hasFund = fundData !== null;
  const quantScore = hasTech && price > 0
    ? computeQuantScore(techData as TechnicalIndicators, hasFund ? fundData as FundamentalData : emptyFund, price, hi52, lo52)
    : { technical: 50, momentum: 50, fundamental: 50, volatility: 50, risk: 60, composite: 52, verdict: "HOLD" as const, signalStrength: 0, signals: { bullish: [], bearish: [], neutral: ["Insufficient data for full scoring"] } };

  const quantSummary = buildQuantSummary(quantScore, price, T);

  // ── Attempt 1: Ollama (local LLM) ───────────────────────
  const ollamaModel = await getOllamaModel();
  if (ollamaModel) {
    try {
      const prompt = buildOllamaPrompt(T, quote, quantSummary, headlines);
      const raw    = await callOllama(prompt, "You are an institutional AI equity analyst for Indian markets (NSE/BSE). Return ONLY valid JSON. No markdown. No preamble.", 90_000);
      if (raw) {
        const analysis = parseAndDefault(raw, T, quote, quantScore);
        (analysis as any)._meta = { engine: `ollama/${ollamaModel}`, quant: quantScore, source: "ollama+quant" };
        return analysis;
      }
    } catch (e) {
      console.warn(`[ai-analysis] Ollama parse error: ${(e as Error).message}`);
    }
  }

  // ── Attempt 2: Claude (if API key set) ──────────────────
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (anthropicKey) {
    try {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey: anthropicKey });
      const model  = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6";
      const prompt = buildOllamaPrompt(T, quote, quantSummary, headlines);

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const msg = await client.messages.create({
            model, max_tokens: 4000,
            system: "You are R.H.T.I.H Intelligence Core — institutional AI equity analyst for Indian markets. Return ONLY valid JSON. No markdown.",
            messages: [{ role: "user", content: prompt }],
          });
          const text = msg.content.find(c => c.type === "text")?.text ?? "";
          if (text) {
            const analysis = parseAndDefault(text, T, quote, quantScore);
            (analysis as any)._meta = { engine: `claude/${model}`, quant: quantScore, source: "claude+quant" };
            return analysis;
          }
        } catch (e: any) {
          if (e?.status === 401 || e?.status === 403) break;
          if (attempt === 1) await sleep(1500);
        }
      }
    } catch { /* fall through to deterministic */ }
  }

  // ── Attempt 3: Pure deterministic (no LLM needed) ───────
  if (hasTech && hasFund && price > 0) {
    const analysis = generateDeterministicAnalysis(T, quote, techData as TechnicalIndicators, fundData as FundamentalData, quantScore, headlines, macro);
    (analysis as any)._meta = { engine: "deterministic-quant", quant: quantScore, source: "quant-only" };
    return analysis;
  }

  // ── Last resort: minimal deterministic with partial data ─
  const minimalTech: TechnicalIndicators = hasTech ? techData as TechnicalIndicators : {
    rsi_14: 50, macd: 0, macd_signal: 0, macd_histogram: 0,
    ema_20: price * 0.99, ema_50: price * 0.98, ema_200: price * 0.95,
    bb_upper: price * 1.03, bb_middle: price, bb_lower: price * 0.97,
    atr_14: price * 0.015, obv: 0, adx: 20, stoch_k: 50, stoch_d: 50,
    vwap: price, support_levels: [price * 0.95], resistance_levels: [price * 1.05],
    trend: "SIDEWAYS", trend_strength: "WEAK",
  };
  const analysis = generateDeterministicAnalysis(T, quote, minimalTech, emptyFund, quantScore, headlines, macro);
  (analysis as any)._meta = { engine: "minimal-fallback", quant: quantScore, source: "minimal" };
  return analysis;
}

/* ── Route handler ─────────────────────────────────────────── */

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

    // Only a cache miss costs real work (Yahoo, news, an LLM call), so only misses are limited.
    const cacheKey = `ai-analysis-v3:${T}`;
    if (!(await sharedPeek("ai-analysis", cacheKey))) {
      const session = await auth();
      const limited = await enforceRateLimit(
        req, POLICIES.aiAnalysis, session?.user?.id ? `user:${session.user.id}` : undefined,
      );
      if (limited) return limited;
    }

    const analysis = await sharedWrap("ai-analysis", cacheKey, TTL.INTELLIGENCE, () => timed("ai.analysis.generate", () => generateAnalysis(T)));

    return NextResponse.json(analysis, {
      headers: {
        "Cache-Control": "s-maxage=1200, stale-while-revalidate=2400",
        "X-Ticker": T,
        "X-Engine": (analysis as any)._meta?.engine ?? "unknown",
      },
    });

  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    console.error(`[ai-analysis/${T}]`, msg);
    // Internal error text can contain upstream URLs, stack details or provider messages.
    return NextResponse.json({ error: "Analysis is temporarily unavailable.", code: "ANALYSIS_FAILED", ticker: T }, { status: 500 });
  }
}
