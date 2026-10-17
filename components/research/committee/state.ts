import type { CommitteeEvent, CommitteeResult } from "@/lib/agents/orchestrator";
import type { AgentId, AgentResult } from "@/lib/agents/schema";

export type AgentRunStatus = "pending" | "running" | AgentResult["status"];

export interface AgentRow {
  id: AgentId;
  name: string;
  reason: string;
  wave: number;
  status: AgentRunStatus;
  latencyMs?: number;
  view?: AgentResult["view"];
  confidence?: number;
  conclusion?: string;
}

export type CommitteeState =
  | { phase: "idle" }
  | { phase: "running"; requestId: string | null; agents: AgentRow[]; blocked: string | null }
  | { phase: "done"; agents: AgentRow[]; result: CommitteeResult }
  | { phase: "error"; agents: AgentRow[]; message: string };

export const initialState: CommitteeState = { phase: "idle" };

/** Pure reducer over the NDJSON events the committee API streams. Unknown or out-of-order events are ignored. */
export function applyEvent(state: CommitteeState, e: CommitteeEvent): CommitteeState {
  const agents = state.phase === "idle" ? [] : state.agents;
  switch (e.type) {
    case "plan": {
      const waveOf = new Map<AgentId, number>();
      e.plan.waves.forEach((w, i) => w.forEach((a) => waveOf.set(a, i + 1)));
      return {
        phase: "running",
        requestId: e.requestId,
        blocked: e.plan.blocked,
        agents: e.agents.map((a) => ({ id: a.id, name: a.name, reason: a.reason, wave: waveOf.get(a.id) ?? 1, status: "pending" })),
      };
    }
    case "agent_started":
      if (state.phase !== "running") return state;
      return { ...state, agents: agents.map((a) => (a.id === e.agent ? { ...a, status: "running" } : a)) };
    case "agent_finished":
      if (state.phase !== "running") return state;
      return {
        ...state,
        agents: agents.map((a) => (a.id === e.agent ? { ...a, status: e.status, latencyMs: e.latencyMs, view: e.view, confidence: e.confidence, conclusion: e.conclusion } : a)),
      };
    case "result":
      return { phase: "done", agents, result: e.result };
    case "error":
      return { phase: "error", agents, message: e.message };
    default:
      return state;
  }
}

/** Splits an NDJSON buffer into complete lines plus the unfinished remainder. */
export function splitLines(buffer: string): { lines: string[]; rest: string } {
  const parts = buffer.split("\n");
  const rest = parts.pop() ?? "";
  return { lines: parts.filter((l) => l.trim().length > 0), rest };
}

export const VIEW_LABEL: Record<AgentResult["view"], string> = {
  bullish: "Bullish",
  lean_bullish: "Leans bullish",
  neutral: "Neutral",
  lean_bearish: "Leans bearish",
  bearish: "Bearish",
  no_view: "No view",
};

export function viewColor(v: AgentResult["view"] | undefined): string {
  if (v === "bullish" || v === "lean_bullish") return "var(--positive)";
  if (v === "bearish" || v === "lean_bearish") return "var(--negative)";
  return "var(--th-text-muted)";
}

export function decisionColor(d: string | null): string {
  if (!d || d === "INSUFFICIENT DATA") return "var(--th-text-muted)";
  if (d === "STRONG BUY" || d === "BUY" || d === "ACCUMULATE") return "var(--positive)";
  if (d === "REDUCE" || d === "SELL" || d === "AVOID") return "var(--negative)";
  return "var(--gold)";
}
