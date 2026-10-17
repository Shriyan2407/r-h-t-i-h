import { describe, expect, it } from "vitest";
import { runAgent } from "@/lib/agents/agent";
import { ResearchContext, type DataLoaders } from "@/lib/agents/context";
import { parseIntent } from "@/lib/agents/intent";
import { classifyRisk, inverseVolWeights, positionCap, riskAgent, riskView, type RiskDetails } from "@/lib/agents/risk";
import { loaders, trendBars } from "./fixtures";

const NOW = new Date("2026-10-17T00:00:00Z");
const run = (q: string, over: Partial<DataLoaders> = {}) =>
  runAgent(riskAgent, new ResearchContext(parseIntent(q), loaders(over), { requestId: "t", now: NOW }));

// ~9.5 years of business days, so the 2020 and 2022 replay windows are covered.
const long = (opts = {}) => trendBars(2500, opts);

describe("risk agent: single stock", () => {
  it("measures volatility, drawdown, VaR, CVaR and Sharpe with cited evidence", async () => {
    const r = await run("How risky is TCS?", { stockBars: async (t) => ({ symbol: `${t}.NS`, bars: long() }), marketBars: async () => long({ start: 20000, wobble: 0.006 }) });
    expect(r.status).toBe("success");
    for (const k of ["annualVol", "maxDrawdown1y", "var95", "cvar95", "sharpe"]) expect(typeof r.metrics[k]).toBe("number");
    expect(r.metrics.cvar95 as number).toBeGreaterThanOrEqual(r.metrics.var95 as number);
    const d = r.details as RiskDetails;
    expect(d.stressTests.find((s) => s.id === "covid_2020")?.portfolioReturn).not.toBeNull();
  });

  it("is never bullish", async () => {
    const r = await run("How risky is TCS?", { stockBars: async (t) => ({ symbol: `${t}.NS`, bars: trendBars(800, { drift: 0.002, wobble: 0.001 }) }) });
    expect(["neutral", "lean_bearish", "bearish"]).toContain(r.view);
  });

  it("reports replay windows the history does not cover instead of estimating them", async () => {
    const r = await run("How risky is TCS?");
    const d = r.details as RiskDetails;
    expect(d.stressTests.find((s) => s.id === "covid_2020")?.portfolioReturn).toBeNull();
    expect(r.missingData.join(" ")).toMatch(/COVID crash.*does not cover/);
  });

  it("orders the replay that matches the user's scenario first", async () => {
    const rec = (await run("Should I hold TCS in a recession?")).details as RiskDetails;
    const rate = (await run("Should I hold TCS if there is a rate hike?")).details as RiskDetails;
    expect(rec.stressTests[0].id).toBe("covid_2020");
    expect(rate.stressTests[0].id).toBe("rates_2022");
  });

  it("labels beta-scaled shocks as hypothetical", async () => {
    const d = (await run("How risky is TCS?")).details as RiskDetails;
    expect(d.stressTests.filter((s) => s.id.startsWith("market_")).every((s) => /hypothetical/.test(s.label))).toBe(true);
  });

  it("sizes positions with the published volatility budget and states the profile it assumed", async () => {
    const d = (await run("How risky is TCS?")).details as RiskDetails;
    expect(d.recommendedPositionSize?.profile).toMatch(/moderate \(no risk profile stated\)/);
    expect(d.recommendedPositionSize?.rule).toMatch(/not a recommendation to buy/);
  });

  it("describes the impact on the user's saved portfolio when one exists", async () => {
    const r = await run("How risky is TCS?", { holdings: async () => [{ ticker: "TCS", quantity: 10, sector: "it" }, { ticker: "INFY", quantity: 10, sector: "it" }] });
    expect((r.details as RiskDetails).portfolioImpact).toMatch(/of your saved portfolio/);
  });
});

describe("risk agent: portfolios", () => {
  it("analyses saved holdings with concentration and stress tests", async () => {
    const r = await run("Should I hold my portfolio during a recession?", { holdings: async () => [{ ticker: "TCS", quantity: 100, sector: "it" }, { ticker: "INFY", quantity: 1, sector: "it" }] });
    const d = r.details as RiskDetails;
    expect(d.subject).toBe("portfolio");
    expect(r.metrics.topWeight as number).toBeGreaterThan(0.9);
    expect(d.levelReasons.join(" ")).toMatch(/concentration/);
  });

  it("builds inverse-volatility weights for named candidates", async () => {
    const calm = trendBars(800, { wobble: 0.004 }), wild = trendBars(800, { wobble: 0.02 });
    const r = await run("Build a portfolio from TCS, INFY, WIPRO and HCLTECH", { stockBars: async (t) => ({ symbol: `${t}.NS`, bars: t === "TCS" ? calm : wild }) });
    const w = (r.details as RiskDetails).proposedWeights!;
    expect(w).toHaveLength(4);
    const tcs = w.find((x) => x.ticker === "TCS")!.weight;
    expect(tcs).toBeGreaterThan(w.find((x) => x.ticker === "INFY")!.weight);
    expect(tcs).toBeLessThanOrEqual(0.3 + 1e-9); // moderate construction cap
    expect(w.reduce((a, x) => a + x.weight, 0)).toBeCloseTo(1, 9);
  });

  it("reports no view when there are no holdings", async () => {
    const r = await run("Review my portfolio");
    expect(r).toMatchObject({ view: "no_view", confidence: 0 });
  });
});

describe("risk rules", () => {
  it("bumps the level for drawdown, tail loss and illiquidity", () => {
    expect(classifyRisk({ annualVol: 0.15, maxDrawdown: -0.1, cvar95: 0.02, avgDailyValue: 1e9 }).level).toBe("low");
    expect(classifyRisk({ annualVol: 0.15, maxDrawdown: -0.5, cvar95: 0.02, avgDailyValue: 1e9 }).level).toBe("medium");
    expect(classifyRisk({ annualVol: 0.3, maxDrawdown: -0.5, cvar95: 0.08, avgDailyValue: 1e5 }).level).toBe("extreme");
  });

  it("maps risk levels to non-bullish views", () => {
    expect((["low", "medium", "high", "extreme"] as const).map(riskView)).toEqual(["neutral", "neutral", "lean_bearish", "bearish"]);
  });

  it("caps the position at the profile's ceiling", () => {
    expect(positionCap(0.1, "moderate").maxWeight).toBeCloseTo(0.1, 12); // 2.5%/10% = 25% -> capped at 10%
    expect(positionCap(0.5, "moderate").maxWeight).toBeCloseTo(0.05, 12); // 2.5%/50%
    expect(positionCap(0.5, "conservative").maxWeight).toBeCloseTo(0.03, 12);
  });

  it("inverse-vol weights respect the cap and sum to one", () => {
    const w = inverseVolWeights([0.1, 0.4, 0.4, 0.4], 0.3);
    expect(Math.max(...w)).toBeLessThanOrEqual(0.3 + 1e-9);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    expect(inverseVolWeights([0.2, 0.2], 0.3)).toEqual([0.5, 0.5]); // cap below 1/n is raised to 1/n
  });
});
