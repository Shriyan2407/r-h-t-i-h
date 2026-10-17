import { describe, expect, it } from "vitest";
import { runAgent } from "@/lib/agents/agent";
import { ResearchContext, type DataLoaders } from "@/lib/agents/context";
import { fundamentalAgent, viewFromFundamentalScore, type FundamentalDetails } from "@/lib/agents/fundamental";
import { parseIntent } from "@/lib/agents/intent";
import { fundamentals, loaders } from "./fixtures";

const run = (q: string, over: Partial<DataLoaders> = {}) =>
  runAgent(fundamentalAgent, new ResearchContext(parseIntent(q), loaders(over), { requestId: "t" }));

describe("fundamental agent", () => {
  it("grades a profitable, growing, lightly-levered company as strong", async () => {
    const r = await run("Is TCS overvalued?");
    const d = r.details as FundamentalDetails;
    expect(d.growth.grade).toBe("strong");
    expect(d.profitability.grade).toBe("strong");
    expect(d.financialHealth.grade).toBe("strong");
    expect(d.fundamentalScore).toBeGreaterThanOrEqual(58);
    expect(["bullish", "lean_bullish"]).toContain(r.view);
  });

  it("flags loss-making, shrinking, highly-levered companies", async () => {
    const r = await run("Is TCS overvalued?", { fundamentals: async () => fundamentals({ pe_ratio: -12, revenue_growth_yoy: -8, profit_growth_yoy: -30, roe: 4, debt_to_equity: 220, free_cash_flow: -500, current_ratio: 0.8 }) });
    const d = r.details as FundamentalDetails;
    expect(d.growth.grade).toBe("weak");
    expect(d.financialHealth.grade).toBe("weak");
    expect(["bearish", "lean_bearish"]).toContain(r.view);
    expect(r.risks.join(" ")).toMatch(/leverage/);
  });

  it("reports unavailable figures as DATA_UNAVAILABLE rather than estimating them", async () => {
    const r = await run("Is TCS overvalued?", { fundamentals: async () => fundamentals({ roe: null, operating_margin: null, net_margin: null }) });
    const d = r.details as FundamentalDetails;
    expect(d.profitability.grade).toBe("DATA_UNAVAILABLE");
    expect(r.missingData.join(" ")).toMatch(/Return on equity \(DATA_UNAVAILABLE\)/);
    expect(r.missingData.join(" ")).toMatch(/ROCE \(DATA_UNAVAILABLE\)/);
    expect(d.competitivePosition.grade).toBe("DATA_UNAVAILABLE");
    expect(r.confidence).toBeLessThan(1);
  });

  it("does not score debt/equity for a bank", async () => {
    const r = await run("Should I buy HDFCBANK?", { fundamentals: async () => fundamentals({ debt_to_equity: 900 }) });
    const d = r.details as FundamentalDetails;
    expect(d.financialHealth.notes.join(" ")).toMatch(/not meaningful for a lender/);
    expect(r.risks.join(" ")).not.toMatch(/leverage/);
  });

  it("computes PEG only from a positive trailing P/E and positive growth", async () => {
    const r = await run("Is TCS overvalued?", { fundamentals: async () => fundamentals({ pe_ratio: 60, profit_growth_yoy: 10 }) });
    expect(r.metrics.peg).toBeCloseTo(6, 9);
    const neg = await run("Is TCS overvalued?", { fundamentals: async () => fundamentals({ pe_ratio: 60, profit_growth_yoy: -5 }) });
    expect(neg.metrics.peg).toBeNull();
  });

  it("returns no view when fundamentals are unavailable", async () => {
    const r = await run("Is TCS overvalued?", { fundamentals: async () => null });
    expect(r).toMatchObject({ view: "no_view", confidence: 0 });
  });

  it("every claim cites evidence the agent registered", async () => {
    const r = await run("Is TCS overvalued?");
    const ids = new Set(r.evidence.map((e) => e.id));
    for (const c of r.claims) for (const id of c.evidenceIds) expect(ids.has(id)).toBe(true);
    expect(r.evidence.every((e) => e.id.startsWith("F"))).toBe(true);
  });

  it("maps scores to views at the published thresholds", () => {
    expect([75, 60, 50, 40, 20, null].map(viewFromFundamentalScore)).toEqual(["bullish", "lean_bullish", "neutral", "lean_bearish", "bearish", "no_view"]);
  });
});
