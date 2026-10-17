/**
 * Contracts for the investment committee. Agents never exchange free text: each returns an AgentResult that is
 * validated here before the next stage sees it. Agent-specific detail lives in `details` and has its own schema
 * in the agent's module.
 *
 * Three numbers are kept apart on purpose and must never be merged into one:
 *   confidence   how complete and fresh this agent's inputs were (0-1). NOT a probability of being right.
 *   probability  a calibrated model probability; only present when a validated model produced it.
 *   reliability  how much a single evidence item's source is trusted (0-1), set per source type.
 */
import { z } from "zod";

export const AGENT_IDS = ["strategist", "quant", "fundamental", "intelligence", "risk", "contrarian", "cio"] as const;
export type AgentId = (typeof AGENT_IDS)[number];

export const AGENT_NAMES: Record<AgentId, string> = {
  strategist: "Investment Strategist",
  quant: "Quantitative Analyst",
  fundamental: "Fundamental Analyst",
  intelligence: "Intelligence & Sentiment Analyst",
  risk: "Risk & Portfolio Manager",
  contrarian: "Research / Contrarian Analyst",
  cio: "CIO / Investment Committee",
};

/** Single-letter evidence prefixes, so a citation like [Q3] identifies the agent that produced it. */
export const EVIDENCE_PREFIX: Record<Exclude<AgentId, "cio">, string> = {
  strategist: "S",
  quant: "Q",
  fundamental: "F",
  intelligence: "N",
  risk: "R",
  contrarian: "C",
};

export const INTENTS = [
  "investment_decision",
  "explain_move",
  "valuation",
  "risk_assessment",
  "portfolio_review",
  "portfolio_construction",
  "general_research",
] as const;
export type IntentType = (typeof INTENTS)[number];

export const intentSchema = z.object({
  query: z.string(),
  intent: z.enum(INTENTS),
  /** Resolved NSE/BSE ticker, or null when the query names no asset we can resolve. */
  ticker: z.string().nullable(),
  /** The words that looked like an asset but could not be resolved (e.g. a US stock). */
  unresolvedAsset: z.string().nullable(),
  /** Extra tickers named in the query (portfolio construction or comparison). */
  tickers: z.array(z.string()),
  horizon: z.enum(["short", "medium", "long", "unknown"]),
  riskProfile: z.enum(["conservative", "moderate", "aggressive", "unknown"]),
  scenario: z.enum(["recession", "rate_shock", "market_crash", "inflation", "none"]),
});
export type Intent = z.infer<typeof intentSchema>;

export const SOURCE_TYPES = [
  "market_data",
  "derived_indicator",
  "statistical_model",
  "ml_model",
  "model_validation",
  "fundamentals",
  "news",
  "macro",
  "portfolio",
  "agent_inference",
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const evidenceSchema = z.object({
  id: z.string().regex(/^[A-Z]\d+$/),
  kind: z.enum(SOURCE_TYPES),
  label: z.string(),
  value: z.union([z.number(), z.string()]),
  /** Exactly how the value is shown; the only form a generated sentence may quote. */
  display: z.string(),
  source: z.string(),
  url: z.string().url().optional(),
  /** When the underlying data was observed (trading date, publish time), or null if unknown. */
  asOf: z.string().nullable(),
  reliability: z.number().min(0).max(1),
});
export type AgentEvidence = z.infer<typeof evidenceSchema>;

export const VIEWS = ["bullish", "lean_bullish", "neutral", "lean_bearish", "bearish", "no_view"] as const;
export type View = (typeof VIEWS)[number];

export const claimSchema = z.object({
  text: z.string(),
  evidenceIds: z.array(z.string()),
  direction: z.enum(["positive", "negative", "neutral"]),
});
export type Claim = z.infer<typeof claimSchema>;

export const agentResultSchema = z.object({
  agent: z.enum(AGENT_IDS),
  status: z.enum(["success", "partial", "failed"]),
  startedAt: z.string(),
  latencyMs: z.number().nonnegative(),
  conclusion: z.string(),
  view: z.enum(VIEWS),
  confidence: z.number().min(0).max(1),
  claims: z.array(claimSchema),
  metrics: z.record(z.string(), z.union([z.number(), z.string(), z.null()])),
  risks: z.array(z.string()),
  catalysts: z.array(z.string()),
  disagreements: z.array(z.string()),
  missingData: z.array(z.string()),
  evidence: z.array(evidenceSchema),
  reasoningSummary: z.string(),
  details: z.unknown(),
  error: z.string().optional(),
});
export type AgentResult<D = unknown> = Omit<z.infer<typeof agentResultSchema>, "details"> & { details: D };

export const DECISIONS = ["STRONG BUY", "BUY", "ACCUMULATE", "HOLD", "WATCH", "REDUCE", "SELL", "AVOID", "INSUFFICIENT DATA"] as const;
export type Decision = (typeof DECISIONS)[number];

/** Validates an agent's output; a result that fails validation is replaced by a failed result, never repaired. */
export function validateResult(r: AgentResult): AgentResult {
  const parsed = agentResultSchema.safeParse(r);
  if (parsed.success) {
    const ids = new Set(r.evidence.map((e) => e.id));
    const dangling = r.claims.flatMap((c) => c.evidenceIds).filter((id) => !ids.has(id));
    if (dangling.length === 0) return r;
    return failedResult(r.agent, r.startedAt, r.latencyMs, `claims cite unknown evidence: ${[...new Set(dangling)].join(", ")}`);
  }
  return failedResult(r.agent, r.startedAt, r.latencyMs, `invalid result: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
}

export function failedResult(agent: AgentId, startedAt: string, latencyMs: number, error: string): AgentResult {
  return {
    agent,
    status: "failed",
    startedAt,
    latencyMs,
    conclusion: "This agent did not produce a result.",
    view: "no_view",
    confidence: 0,
    claims: [],
    metrics: {},
    risks: [],
    catalysts: [],
    disagreements: [],
    missingData: [],
    evidence: [],
    reasoningSummary: "",
    details: null,
    error,
  };
}
