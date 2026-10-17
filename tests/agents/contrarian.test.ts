import { describe, expect, it } from "vitest";
import { runAgent } from "@/lib/agents/agent";
import { ResearchContext } from "@/lib/agents/context";
import { contrarianAgent, emergingThesis, verdictFor, type ContrarianDetails } from "@/lib/agents/contrarian";
import { parseIntent } from "@/lib/agents/intent";
import type { AgentEvidence, AgentId, AgentResult, View } from "@/lib/agents/schema";
import { loaders } from "./fixtures";

const ev = (id: string, label: string, value: number, display = String(value)): AgentEvidence => ({ id, kind: "derived_indicator", label, value, display, source: "test", asOf: "2026-10-16", reliability: 0.9 });

const res = (agent: AgentId, view: View, over: Partial<AgentResult> = {}): AgentResult => ({
  agent, status: "success", startedAt: "", latencyMs: 1, conclusion: "", view, confidence: 0.8, claims: [], metrics: {}, risks: [], catalysts: [],
  disagreements: [], missingData: [], evidence: [], reasoningSummary: "", details: null, ...over,
});

const run = (prior: AgentResult[]) =>
  runAgent(contrarianAgent, new ResearchContext(parseIntent("Should I buy TCS?"), loaders(), { requestId: "t" }), prior);

describe("contrarian agent", () => {
  it("attacks a bullish consensus with the other agents' own evidence", async () => {
    const r = await run([
      res("quant", "bullish", { metrics: { rsi14: 78 }, evidence: [ev("Q1", "Price vs 200-day average", 0.32, "+32.0%"), ev("Q2", "RSI (14)", 78)] }),
      res("fundamental", "lean_bullish", { metrics: { pe: 72, peg: 3.1 }, evidence: [ev("F1", "Trailing P/E", 72, "72.0x"), ev("F2", "PEG (trailing P/E / earnings growth)", 3.1, "3.10")] }),
      res("risk", "lean_bearish", { metrics: { riskLevel: "high" }, evidence: [ev("R1", "TCS: 1-day 95% CVaR", 0.05, "5.00%")] }),
    ]);
    const d = r.details as ContrarianDetails;
    expect(d.thesis.direction).toBe("bullish");
    expect(d.thesisAttacks.map((a) => a.attack).join(" ")).toMatch(/Valuation is stretched/);
    expect(d.thesisAttacks.map((a) => a.attack).join(" ")).toMatch(/RISK|HIGH/i);
    expect(d.verdict).toBe("THESIS INVALIDATED");
    expect(r.view).toBe("lean_bearish");
    // Every re-cited item points back to the original agent and id.
    expect(r.evidence.every((e) => /\((Q|F|R)\d+\)$/.test(e.label))).toBe(true);
    for (const c of r.claims) for (const id of c.evidenceIds) expect(r.evidence.some((e) => e.id === id)).toBe(true);
  });

  it("lets a well-supported thesis survive", async () => {
    const r = await run([
      res("quant", "lean_bullish", { metrics: { rsi14: 55 } }),
      res("fundamental", "lean_bullish", { metrics: { pe: 22, peg: 1.2 } }),
      res("risk", "neutral", { metrics: { riskLevel: "medium" } }),
    ]);
    const d = r.details as ContrarianDetails;
    expect(d.verdict).toBe("THESIS SURVIVES");
    expect(r.view).toBe("neutral");
  });

  it("argues the other side of a bearish consensus", async () => {
    const r = await run([
      res("quant", "bearish", { metrics: { rsi14: 24 }, evidence: [ev("Q1", "RSI (14)", 24)] }),
      res("intelligence", "lean_bearish"),
      res("fundamental", "lean_bullish", { metrics: { pe: 12 }, evidence: [ev("F1", "Return on equity", 25, "25.0%"), ev("F2", "Trailing P/E", 12, "12.0x")] }),
    ]);
    const d = r.details as ContrarianDetails;
    expect(d.thesis.direction).toBe("bearish");
    expect(d.thesisAttacks.map((a) => a.attack).join(" ")).toMatch(/Fundamentals are solid/);
    expect(d.thesisAttacks.map((a) => a.attack).join(" ")).toMatch(/oversold/);
  });

  it("calls out disagreement and missing agents", async () => {
    const r = await run([res("quant", "bullish"), res("fundamental", "bearish"), res("intelligence", "no_view", { status: "partial" })]);
    const text = (r.details as ContrarianDetails).thesisAttacks.map((a) => a.attack).join(" ");
    expect(text).toMatch(/analysts disagree/);
    expect(text).toMatch(/no usable data/);
    expect(r.disagreements.length).toBe(1);
  });

  it("always notes that no directional model is validated when there is a directional thesis", async () => {
    const r = await run([res("quant", "bullish"), res("fundamental", "bullish")]);
    expect((r.details as ContrarianDetails).thesisAttacks.map((a) => a.attack).join(" ")).toMatch(/No model in this system has shown out-of-sample skill/);
  });

  it("ignores failed agents when forming the thesis", () => {
    expect(emergingThesis([res("quant", "bullish", { status: "failed" }), res("fundamental", "bearish")]).direction).toBe("bearish");
    expect(emergingThesis([]).direction).toBe("no_edge");
  });

  it("maps survival scores to verdicts", () => {
    expect([100, 65, 64, 35, 34, 0].map(verdictFor)).toEqual(["THESIS SURVIVES", "THESIS SURVIVES", "THESIS WEAKENED", "THESIS WEAKENED", "THESIS INVALIDATED", "THESIS INVALIDATED"]);
  });
});
