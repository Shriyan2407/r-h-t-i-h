/**
 * Common shape and runner for the seven agents. An agent is a pure analysis function over the context (and, for
 * the contrarian and CIO, the earlier agents' results). The runner adds timing, catches failures and validates the
 * output, so a broken agent becomes a visible `failed` result instead of a fabricated one.
 */
import type { ResearchContext } from "./context";
import { EvidenceLog } from "./evidence";
import { EVIDENCE_PREFIX, failedResult, validateResult, type AgentId, type AgentResult } from "./schema";

/** What an agent's analysis returns; the runner fills in identity and timing. */
export type AgentOutput<D = unknown> = Omit<AgentResult<D>, "agent" | "startedAt" | "latencyMs" | "evidence">;

export interface InvestmentAgent<D = unknown> {
  id: AgentId;
  analyze(ctx: ResearchContext, prior: readonly AgentResult[], evidence: EvidenceLog): Promise<AgentOutput<D>>;
}

export async function runAgent(agent: InvestmentAgent, ctx: ResearchContext, prior: readonly AgentResult[] = [], timeoutMs = 25_000): Promise<AgentResult> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const log = new EvidenceLog(agent.id === "cio" ? "X" : EVIDENCE_PREFIX[agent.id]);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const out = await Promise.race([
      agent.analyze(ctx, prior, log),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`timed out after ${timeoutMs} ms`)), timeoutMs); }),
    ]);
    return validateResult({ ...out, agent: agent.id, startedAt, latencyMs: Date.now() - t0, evidence: log.all() } as AgentResult);
  } catch (err) {
    return failedResult(agent.id, startedAt, Date.now() - t0, err instanceof Error ? err.message : String(err));
  } finally {
    clearTimeout(timer);
  }
}

/** Confidence from input coverage: the share of the inputs an agent needs that were actually available. */
export function coverageConfidence(available: number, needed: number): number {
  if (needed <= 0) return 0;
  return Math.round(Math.min(1, available / needed) * 100) / 100;
}

/** Result for an agent whose required data is entirely missing: no view, no claims, the gap stated. */
export function noDataOutput(conclusion: string, missingData: string[]): AgentOutput<null> {
  return {
    status: "partial",
    conclusion,
    view: "no_view",
    confidence: 0,
    claims: [],
    metrics: {},
    risks: [],
    catalysts: [],
    disagreements: [],
    missingData,
    reasoningSummary: "Required data was unavailable, so no analysis was performed.",
    details: null,
  };
}
