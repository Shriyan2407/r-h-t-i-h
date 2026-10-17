import { describe, expect, it } from "vitest";
import { failedResult, validateResult, type AgentResult } from "@/lib/agents/schema";

const ok = (over: Partial<AgentResult> = {}): AgentResult => ({
  agent: "quant",
  status: "success",
  startedAt: "2026-10-17T00:00:00.000Z",
  latencyMs: 12,
  conclusion: "Trend is up.",
  view: "lean_bullish",
  confidence: 0.8,
  claims: [{ text: "Price is above its 200-day average [Q1].", evidenceIds: ["Q1"], direction: "positive" }],
  metrics: { rsi14: 55 },
  risks: [],
  catalysts: [],
  disagreements: [],
  missingData: [],
  evidence: [{ id: "Q1", kind: "derived_indicator", label: "Price vs 200-day SMA", value: 0.05, display: "+5.0%", source: "Computed from Yahoo Finance daily bars", asOf: "2026-10-16", reliability: 0.9 }],
  reasoningSummary: "",
  details: {},
  ...over,
});

describe("agent result contract", () => {
  it("accepts a well-formed result unchanged", () => {
    const r = ok();
    expect(validateResult(r)).toBe(r);
  });

  it("fails a result whose claims cite evidence it did not provide", () => {
    const r = validateResult(ok({ claims: [{ text: "x [Q9]", evidenceIds: ["Q9"], direction: "neutral" }] }));
    expect(r.status).toBe("failed");
    expect(r.error).toMatch(/Q9/);
  });

  it("fails out-of-range confidence instead of clamping it", () => {
    const r = validateResult(ok({ confidence: 1.4 }));
    expect(r.status).toBe("failed");
    expect(r.view).toBe("no_view");
  });

  it("fails evidence with a malformed id or reliability", () => {
    expect(validateResult(ok({ evidence: [{ ...ok().evidence[0], id: "quant-1" }] })).status).toBe("failed");
    expect(validateResult(ok({ evidence: [{ ...ok().evidence[0], reliability: 2 }] })).status).toBe("failed");
  });

  it("a failed result carries no claims, evidence or view", () => {
    const f = failedResult("risk", "t", 5, "timeout");
    expect(f).toMatchObject({ status: "failed", view: "no_view", confidence: 0, claims: [], evidence: [], error: "timeout" });
  });
});
