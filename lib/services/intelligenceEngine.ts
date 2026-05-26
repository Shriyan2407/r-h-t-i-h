/* ═══════════════════════════════════════════════════════════════
   R.H.T.I.H — Intelligence Engine (Orchestrator)
   3-tier fallback: Ollama → Claude → Deterministic Quant
   NEVER returns an error object. Always returns valid report.
═══════════════════════════════════════════════════════════════ */

import YFClass from "yahoo-finance2";
const yahooFinance = new (YFClass as any)();

export type IntelligenceReport = Awaited<ReturnType<typeof generateIntelligence>>;

import { getStockNews }           from "./newsAggregator";
import { getSocialSentiment }     from "./socialSentiment";
import { buildInstitutionalPrompt } from "./promptBuilder";
import { callOllama }             from "@/lib/ai/ollamaClient";
import { callClaude, parseIntelligenceResponse } from "./claudeService";
import { buildDeterministicReport } from "./deterministicIntelligence";
import { cache, TTL }             from "./cache";

/* ── Startup: flush any stale NO_API_KEY error objects ───── */
(function purgeStaleCacheErrors() {
  try {
    const stats = cache.stats();
    for (const key of stats.keys) {
      if (!key.startsWith("intelligence:")) continue;
      const val = cache.get<any>(key);
      if (val && (val.error || val.code)) {
        cache.del(key);
        console.log(`[Intelligence] Purged stale cache error for key: ${key}`);
      }
    }
  } catch { /* non-critical */ }
})();

/* ── Yahoo Finance data fetcher ─────────────────────────── */

async function fetchYahooData(ticker: string) {
  const symbols  = [`${ticker}.NS`, `${ticker}.BO`, ticker];
  let quote: any = null;
  let summary: any = null;

  for (const sym of symbols) {
    try {
      const q = await yahooFinance.quote(sym);
      if (q?.regularMarketPrice) { quote = q; break; }
    } catch { /* try next */ }
  }

  for (const sym of [`${ticker}.NS`, `${ticker}.BO`]) {
    try {
      summary = await yahooFinance.quoteSummary(sym, {
        modules: [
          "assetProfile", "financialData", "defaultKeyStatistics",
          "summaryDetail", "majorHoldersBreakdown",
        ] as any,
      });
      if (summary?.assetProfile) break;
    } catch { /* try next */ }
  }

  return { quote, summary };
}

/* ── Ollama Intelligence wrapper ─────────────────────────── */

const SYSTEM_MSG = [
  "You are R.H.T.I.H Intelligence Core — an institutional AI equity analyst for Indian markets.",
  "You ALWAYS return valid JSON only.",
  "No markdown fences, no explanations outside the JSON.",
  "Your analysis is specific, non-generic, and evidence-based.",
].join(" ");

async function tryOllama(prompt: string, ticker: string): Promise<any | null> {
  try {
    const raw = await callOllama(prompt, SYSTEM_MSG, 90_000);
    if (!raw) return null;
    const report = parseIntelligenceResponse(raw, ticker);
    // Minimal validation
    if (report?.scores && report?.ticker) return report;
    return null;
  } catch { return null; }
}

/* ── Claude wrapper ─────────────────────────────────────── */

async function tryClaude(prompt: string, ticker: string): Promise<any | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;
  try {
    const raw    = await callClaude(prompt, SYSTEM_MSG);
    const report = parseIntelligenceResponse(raw, ticker);
    if (report?.scores && report?.ticker) return report;
    return null;
  } catch (err) {
    console.warn(`[Intelligence] Claude failed for ${ticker}:`, (err as Error).message);
    return null;
  }
}

/* ── Main intelligence generator ────────────────────────── */

export async function generateIntelligence(ticker: string) {
  const T = ticker.toUpperCase().replace(/\.(NS|BO)$/i, "");

  const timeout = <X>(p: Promise<X>, ms: number, fb: X): Promise<X> =>
    Promise.race([p, new Promise<X>(res => setTimeout(() => res(fb), ms))]);

  console.log(`[Intelligence] Fetching data for ${T}...`);

  const [{ quote, summary }, news, sentiment] = await Promise.all([
    timeout(fetchYahooData(T), 12_000, { quote: null, summary: null }),
    timeout(getStockNews(T, ""), 10_000, []),
    timeout(getSocialSentiment(T).catch(() => null), 8_000, null),
  ]);

  console.log(`[Intelligence] ${T}: quote=${!!quote}, news=${news.length}, sentiment=${!!sentiment}`);

  const prompt = buildInstitutionalPrompt({ ticker: T, quote, summary, news, sentiment });

  /* Tier 1 — Ollama */
  let report = await tryOllama(prompt, T);
  if (report) {
    console.log(`[Intelligence] ${T}: Ollama success`);
    report._meta = {
      ticker: T, generatedAt: new Date().toISOString(),
      newsCount: news.length, hasQuoteData: !!quote,
      hasFinancialData: !!summary, hasSentiment: !!sentiment,
      sentimentScore: sentiment?.overallScore ?? null,
      model: "ollama", source: "yahoo-finance2 + rss-news + ollama",
      currentPrice: quote?.regularMarketPrice ?? null,
      priceChange: quote?.regularMarketChangePercent ?? null,
    };
    return report;
  }

  /* Tier 2 — Claude */
  report = await tryClaude(prompt, T);
  if (report) {
    console.log(`[Intelligence] ${T}: Claude success`);
    report._meta = {
      ticker: T, generatedAt: new Date().toISOString(),
      newsCount: news.length, hasQuoteData: !!quote,
      hasFinancialData: !!summary, hasSentiment: !!sentiment,
      sentimentScore: sentiment?.overallScore ?? null,
      model: process.env.CLAUDE_MODEL ?? "claude-opus-4-5",
      source: "yahoo-finance2 + rss-news + reddit + claude-ai",
      currentPrice: quote?.regularMarketPrice ?? null,
      priceChange: quote?.regularMarketChangePercent ?? null,
    };
    return report;
  }

  /* Tier 3 — Deterministic quant (always succeeds) */
  console.log(`[Intelligence] ${T}: Using deterministic fallback`);
  return buildDeterministicReport(T, quote, summary, news, sentiment);
}

/* ── Cached wrapper (public API) ─────────────────────────── */

export async function getIntelligenceReport(ticker: string, bustCache = false) {
  const T   = ticker.toUpperCase().replace(/\.(NS|BO)$/i, "");
  const key = `intelligence:${T}`;

  // Always evict stale error objects — they must never be served to the frontend
  const cached = cache.get<any>(key);
  if (bustCache || (cached !== null && (cached.error || cached.code))) {
    cache.del(key);
  }

  return cache.wrap(key, TTL.INTELLIGENCE, () => generateIntelligence(T));
}
