import { describe, expect, it } from "vitest";
import { runAgent, coverageConfidence, type InvestmentAgent } from "@/lib/agents/agent";
import { ResearchContext } from "@/lib/agents/context";
import { parseIntent } from "@/lib/agents/intent";
import { loaders } from "./fixtures";

const ctx = () => new ResearchContext(parseIntent("Should I buy TCS?"), loaders(), { requestId: "t" });
const base = { status: "success" as const, conclusion: "c", view: "neutral" as const, confidence: 0.5, metrics: {}, risks: [], catalysts: [], disagreements: [], missingData: [], reasoningSummary: "", details: null };

describe("agent runner", () => {
  it("adds identity, timing and the evidence the agent registered", async () => {
    const agent: InvestmentAgent = {
      id: "quant",
      async analyze(_c, _p, ev) {
        const id = ev.add({ kind: "market_data", label: "Close", value: 1, display: "₹1.00", source: "test", asOf: "2026-10-16" });
        return { ...base, claims: [{ text: `Close is ₹1.00 [${id}]`, evidenceIds: [id], direction: "neutral" }] };
      },
    };
    const r = await runAgent(agent, ctx());
    expect(r).toMatchObject({ agent: "quant", status: "success", evidence: [{ id: "Q1" }] });
    expect(r.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("turns a thrown error into a failed result", async () => {
    const r = await runAgent({ id: "risk", analyze: async () => { throw new Error("boom"); } }, ctx());
    expect(r).toMatchObject({ agent: "risk", status: "failed", error: "boom", view: "no_view" });
  });

  it("turns a hung agent into a failed result after the timeout", async () => {
    const r = await runAgent({ id: "fundamental", analyze: () => new Promise(() => {}) }, ctx(), [], 20);
    expect(r).toMatchObject({ status: "failed", error: "timed out after 20 ms" });
  });

  it("coverage confidence is the available share of required inputs", () => {
    expect(coverageConfidence(3, 4)).toBe(0.75);
    expect(coverageConfidence(5, 4)).toBe(1);
    expect(coverageConfidence(0, 0)).toBe(0);
  });
});
