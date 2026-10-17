/**
 * InvestmentOrchestrator — the single coordinator of the committee.
 *
 *   query -> intent -> plan (minimum agents, waves) -> shared data context
 *         -> wave 1 analysts in parallel -> contrarian -> CIO -> memo -> integrity check
 *
 * Every agent runs isolated (timeout, error capture, schema validation). A failed agent stays failed: its slot in
 * the memo says so and the CIO weighs what is left, or returns INSUFFICIENT DATA. Progress events are emitted as
 * agents actually start and finish, so a UI can show real activity rather than an animation.
 */
import { log } from "@/lib/observability/logger";
import { incr, recordTiming } from "@/lib/observability/metrics";
import { runAgent, type InvestmentAgent } from "./agent";
import type { CioDetails } from "./cio";
import { cioAgent } from "./cio";
import { ResearchContext, type DataLoaders, type DatasetSummary } from "./context";
import { contrarianAgent } from "./contrarian";
import { fundamentalAgent } from "./fundamental";
import { intelligenceAgent } from "./intelligence";
import { parseIntent } from "./intent";
import type { InvestmentMemo } from "./memo";
import { quantAgent } from "./quant";
import { riskAgent } from "./risk";
import { planExecution, type ExecutionPlan } from "./router";
import { AGENT_NAMES, type AgentEvidence, type AgentId, type AgentResult, type Intent } from "./schema";
import { strategistAgent } from "./strategist";

export const AGENTS: Record<AgentId, InvestmentAgent> = {
  strategist: strategistAgent as InvestmentAgent,
  quant: quantAgent as InvestmentAgent,
  fundamental: fundamentalAgent as InvestmentAgent,
  intelligence: intelligenceAgent as InvestmentAgent,
  risk: riskAgent as InvestmentAgent,
  contrarian: contrarianAgent as InvestmentAgent,
  cio: cioAgent as InvestmentAgent,
};

export type CommitteeEvent =
  | { type: "plan"; requestId: string; intent: Intent; plan: ExecutionPlan; agents: Array<{ id: AgentId; name: string; reason: string }> }
  | { type: "agent_started"; agent: AgentId; wave: number }
  | { type: "agent_finished"; agent: AgentId; status: AgentResult["status"]; latencyMs: number; view: AgentResult["view"]; confidence: number; conclusion: string }
  | { type: "result"; result: CommitteeResult }
  | { type: "error"; requestId: string; message: string };

export interface CommitteeResult {
  schema: "committee/1";
  requestId: string;
  createdAt: string;
  intent: Intent;
  plan: ExecutionPlan;
  results: AgentResult[];
  decision: Omit<CioDetails, "memo">;
  memo: InvestmentMemo;
  evidence: AgentEvidence[];
  datasets: DatasetSummary[];
  trace: { totalMs: number; agents: Array<{ agent: AgentId; wave: number; status: AgentResult["status"]; latencyMs: number; error?: string }> };
  integrity: { ok: boolean; problems: string[] };
}

export interface CommitteeOptions {
  requestId: string;
  now?: Date;
  onEvent?: (e: CommitteeEvent) => void;
  agentTimeoutMs?: number;
  datasetTimeoutMs?: number;
}

const CITE = /\[([A-Z]\d+)\]/g;

/** Every citation in the memo and in agent claims must resolve to evidence that was actually collected. */
export function checkIntegrity(results: readonly AgentResult[], memo: InvestmentMemo, evidence: readonly AgentEvidence[]): { ok: boolean; problems: string[] } {
  const ids = new Set(evidence.map((e) => e.id));
  const problems: string[] = [];
  const dup = evidence.map((e) => e.id).filter((id, i, a) => a.indexOf(id) !== i);
  if (dup.length) problems.push(`duplicate evidence ids: ${[...new Set(dup)].join(", ")}`);
  const scan = (where: string, text: string) => {
    for (const m of text.matchAll(CITE)) if (!ids.has(m[1])) problems.push(`${where} cites unknown evidence [${m[1]}]`);
  };
  for (const r of results) for (const c of r.claims) scan(`${r.agent} claim`, c.text);
  scan("memo", JSON.stringify(memo));
  return { ok: problems.length === 0, problems };
}

export async function runCommittee(query: string, loaders: DataLoaders, opts: CommitteeOptions): Promise<CommitteeResult> {
  const t0 = Date.now();
  const emit = (e: CommitteeEvent) => { try { opts.onEvent?.(e); } catch { /* a broken listener must not break the run */ } };
  const intent = parseIntent(query);
  const plan = planExecution(intent);
  const ctx = new ResearchContext(intent, loaders, { requestId: opts.requestId, now: opts.now, timeoutMs: opts.datasetTimeoutMs });
  ctx.plan = plan;
  emit({ type: "plan", requestId: opts.requestId, intent, plan, agents: plan.agents.map((id) => ({ id, name: AGENT_NAMES[id], reason: plan.reasons[id] ?? "" })) });

  const results: AgentResult[] = [];
  const trace: CommitteeResult["trace"]["agents"] = [];
  for (const [w, wave] of plan.waves.entries()) {
    const prior = [...results];
    const done = await Promise.all(wave.map(async (id) => {
      emit({ type: "agent_started", agent: id, wave: w + 1 });
      const r = await runAgent(AGENTS[id], ctx, prior, opts.agentTimeoutMs);
      recordTiming(`agent.${id}`, r.latencyMs, r.status === "failed");
      if (r.status === "failed") {
        incr(`agent.${id}.failed`);
        log.warn("committee.agent_failed", { requestId: opts.requestId, agent: id, error: r.error });
      }
      emit({ type: "agent_finished", agent: id, status: r.status, latencyMs: r.latencyMs, view: r.view, confidence: r.confidence, conclusion: r.conclusion });
      trace.push({ agent: id, wave: w + 1, status: r.status, latencyMs: r.latencyMs, ...(r.error ? { error: r.error } : {}) });
      return r;
    }));
    results.push(...done);
  }

  const cio = results.find((r) => r.agent === "cio");
  if (!cio || cio.status === "failed" || !cio.details) throw new Error(`CIO failed: ${cio?.error ?? "no result"}`);
  const { memo, ...decision } = cio.details as CioDetails;
  const evidence = results.flatMap((r) => r.evidence);
  const integrity = checkIntegrity(results, memo, evidence);
  if (!integrity.ok) {
    incr("committee.integrity_failed");
    log.error("committee.integrity_failed", { requestId: opts.requestId, problems: integrity.problems.slice(0, 5) });
  }
  const totalMs = Date.now() - t0;
  recordTiming("committee.total", totalMs);
  incr(`committee.decision.${(decision.decision ?? "none").replace(/\s+/g, "_").toLowerCase()}`);
  // Log the shape of the run, never the query text or holdings.
  log.info("committee.completed", {
    requestId: opts.requestId, intent: intent.intent, ticker: intent.ticker, decision: decision.decision, conviction: decision.conviction, totalMs,
    agents: trace.map((t) => `${t.agent}:${t.status}:${t.latencyMs}`), datasets: ctx.datasets().map((d) => `${d.name}:${d.status}`),
  });

  const result: CommitteeResult = {
    schema: "committee/1",
    requestId: opts.requestId,
    createdAt: (opts.now ?? new Date()).toISOString(),
    intent,
    plan,
    results,
    decision,
    memo,
    evidence,
    datasets: ctx.datasets(),
    trace: { totalMs, agents: trace },
    integrity,
  };
  emit({ type: "result", result });
  return result;
}
