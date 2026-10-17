import { describe, expect, it } from "vitest";
import { runAgent } from "@/lib/agents/agent";
import { cioAgent, decide, scoreToDecision, type CioDetails, type CommitteeInput } from "@/lib/agents/cio";
import { ResearchContext } from "@/lib/agents/context";
import { parseIntent } from "@/lib/agents/intent";
import type { AgentEvidence, AgentId, AgentResult, View } from "@/lib/agents/schema";
import { loaders } from "./fixtures";

const NOW = new Date("2026-10-17T00:00:00Z");
const e = (id: string, reliability = 0.9, asOf = "2026-10-16"): AgentEvidence => ({ id, kind: "derived_indicator", label: id, value: 1, display: "1", source: "t", asOf, reliability });
const res = (agent: AgentId, view: View, over: Partial<AgentResult> = {}): AgentResult => ({
  agent, status: "success", startedAt: "", latencyMs: 1, conclusion: `${agent} says ${view}`, view, confidence: 0.9, claims: [], metrics: {}, risks: [], catalysts: [],
  disagreements: [], missingData: [], evidence: [e(`${agent[0].toUpperCase()}1`)], reasoningSummary: "", details: null, ...over,
});
const contra = (verdict: string) => res("contrarian", "neutral", { details: { verdict, thesisAttacks: [{ attack: "x", severity: 1, evidenceIds: [] }] } });
const ALL: AgentId[] = ["strategist", "quant", "fundamental", "intelligence", "risk", "contrarian", "cio"];

const input = (results: AgentResult[], over: Partial<CommitteeInput> = {}): CommitteeInput => ({
  intent: "investment_decision", horizon: "unknown", results, plan: { agents: ALL, blocked: null }, held: false, now: NOW, ...over,
});

describe("CIO decision rules", () => {
  it("does not average blindly: the weighted score follows role and evidence quality", () => {
    const strongFund = decide(input([res("fundamental", "bullish"), res("intelligence", "bearish", { confidence: 0.2 }), res("quant", "neutral"), res("risk", "neutral", { metrics: { riskLevel: "medium" } }), contra("THESIS SURVIVES")]));
    expect(strongFund.score!).toBeGreaterThan(0);
    expect(strongFund.disagreements).toHaveLength(1);
    expect(strongFund.disagreements[0].resolution).toMatch(/Fundamental Analyst/);
  });

  it("returns INSUFFICIENT DATA when the core analysts have nothing", () => {
    const d = decide(input([res("quant", "no_view", { status: "partial", confidence: 0 }), res("fundamental", "no_view", { status: "partial", confidence: 0 }), res("strategist", "lean_bullish")]));
    expect(d.decision).toBe("INSUFFICIENT DATA");
    expect(d.conviction).toBe(0);
    expect(d.decisionNote).toMatch(/Quantitative Analyst/);
  });

  it("returns INSUFFICIENT DATA for a blocked question without running analysis", () => {
    const d = decide(input([], { plan: { agents: ["cio"], blocked: "NVIDIA is not covered" } }));
    expect(d).toMatchObject({ decision: "INSUFFICIENT DATA", decisionNote: "NVIDIA is not covered", conviction: 0 });
  });

  it("gives no decision for an explanatory question", () => {
    const d = decide(input([res("quant", "bearish"), res("intelligence", "lean_bearish")], { intent: "explain_move", plan: { agents: ["intelligence", "quant", "fundamental", "cio"], blocked: null } }));
    expect(d.decision).toBeNull();
    expect(d.decisionNote).toMatch(/explanation, not an investment decision/);
  });

  it("caps the decision when risk is extreme or high", () => {
    const bull = [res("quant", "bullish"), res("fundamental", "bullish"), res("strategist", "lean_bullish"), res("intelligence", "lean_bullish"), contra("THESIS SURVIVES")];
    const extreme = decide(input([...bull, res("risk", "bearish", { metrics: { riskLevel: "extreme" } })]));
    expect(extreme.decision).toBe("WATCH");
    expect(extreme.overrides.join(" ")).toMatch(/EXTREME/);
    const high = decide(input([...bull, res("risk", "lean_bearish", { metrics: { riskLevel: "high" } })]));
    expect(["ACCUMULATE", "HOLD", "WATCH"]).toContain(high.decision);
  });

  it("downgrades when the contrarian weakens or invalidates the thesis", () => {
    const bull = [res("quant", "bullish"), res("fundamental", "bullish"), res("strategist", "lean_bullish"), res("risk", "neutral", { metrics: { riskLevel: "low" } })];
    const survives = decide(input([...bull, contra("THESIS SURVIVES")]));
    const weakened = decide(input([...bull, contra("THESIS WEAKENED")]));
    const invalid = decide(input([...bull, contra("THESIS INVALIDATED")]));
    const order = ["AVOID", "SELL", "REDUCE", "WATCH", "HOLD", "ACCUMULATE", "BUY", "STRONG BUY"];
    expect(order.indexOf(weakened.decision!)).toBeLessThan(order.indexOf(survives.decision!));
    expect(order.indexOf(invalid.decision!)).toBeLessThan(order.indexOf(weakened.decision!));
  });

  it("requires unanimity, a surviving thesis and moderate risk for STRONG BUY", () => {
    const all = [res("quant", "bullish"), res("fundamental", "bullish"), res("strategist", "bullish"), res("intelligence", "bullish"), res("risk", "neutral", { metrics: { riskLevel: "low" } })];
    expect(decide(input([...all, contra("THESIS SURVIVES")])).decision).toBe("STRONG BUY");
    expect(decide(input([...all, contra("THESIS WEAKENED")])).decision).not.toBe("STRONG BUY");
    const disagree = decide(input([...all.slice(0, 3), res("intelligence", "lean_bearish", { confidence: 0.05 }), all[4], contra("THESIS SURVIVES")]));
    expect(disagree.decision).toBe("BUY");
    expect(disagree.overrides.join(" ")).toMatch(/STRONG BUY requires/);
    const mediumRisk = decide(input([...all.slice(0, 4), res("risk", "neutral", { metrics: { riskLevel: "high" } }), contra("THESIS SURVIVES")]));
    expect(mediumRisk.decision).not.toBe("STRONG BUY");
  });

  it("weights stale evidence down", () => {
    const fresh = decide(input([res("quant", "bullish"), res("fundamental", "bearish")]));
    const staleQuant = decide(input([res("quant", "bullish", { evidence: [e("Q1", 0.9, "2026-08-01")] }), res("fundamental", "bearish")]));
    expect(staleQuant.score!).toBeLessThan(fresh.score!);
  });

  it("a long horizon shifts weight toward fundamentals", () => {
    const rs = [res("quant", "bullish"), res("fundamental", "bearish")];
    expect(decide(input(rs, { horizon: "long" })).score!).toBeLessThan(decide(input(rs, { horizon: "short" })).score!);
  });

  it("uses SELL/REDUCE for a held position and AVOID/WATCH otherwise", () => {
    expect(scoreToDecision(-1, true)).toBe("SELL");
    expect(scoreToDecision(-1, false)).toBe("AVOID");
    expect(scoreToDecision(-0.5, true)).toBe("REDUCE");
    expect(scoreToDecision(-0.5, false)).toBe("WATCH");
  });

  it("conviction falls with disagreement and missing analysts", () => {
    const agree = decide(input([res("quant", "bullish"), res("fundamental", "bullish")], { plan: { agents: ["quant", "fundamental", "cio"], blocked: null } }));
    const split = decide(input([res("quant", "bullish"), res("fundamental", "lean_bearish", { confidence: 0.3 })], { plan: { agents: ["quant", "fundamental", "cio"], blocked: null } }));
    expect(split.conviction).toBeLessThan(agree.conviction);
  });
});

describe("CIO agent memo", () => {
  it("produces every memo section and never states a probability", async () => {
    const ctx = new ResearchContext(parseIntent("Should I buy TCS for the long term?"), loaders(), { requestId: "t", now: NOW });
    ctx.plan = { agents: ALL, blocked: null };
    const prior = [res("quant", "bullish", { claims: [{ text: "Trend up [Q1].", evidenceIds: ["Q1"], direction: "positive" }] }), res("fundamental", "lean_bullish"), res("risk", "neutral", { metrics: { riskLevel: "medium" } }), contra("THESIS SURVIVES")];
    const r = await runAgent(cioAgent, ctx, prior);
    const memo = (r.details as CioDetails).memo;
    expect(memo.asset).toBe("TCS");
    expect(memo.timeHorizon).toMatch(/Long term/);
    expect(memo.why).toContain("Trend up [Q1].");
    for (const k of ["executiveThesis", "finalDecision", "currentContext"] as const) expect(memo[k].length).toBeGreaterThan(0);
    expect(memo.whatWouldChangeOurMind.length).toBeGreaterThan(0);
    expect(memo.disclaimers.join(" ")).toMatch(/not a probability of profit/);
    expect(JSON.stringify(memo)).not.toMatch(/probability of (?:success|gain) is|\d+% (?:chance|probability)/i);
  });
});
