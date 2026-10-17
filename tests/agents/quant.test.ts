import { describe, expect, it } from "vitest";
import { runAgent } from "@/lib/agents/agent";
import { ResearchContext, type DataLoaders } from "@/lib/agents/context";
import { parseIntent } from "@/lib/agents/intent";
import { quantAgent, viewFromScore, type QuantDetails } from "@/lib/agents/quant";
import { loaders, trendBars } from "./fixtures";

const NOW = new Date("2026-10-17T00:00:00Z");
const run = (q: string, over: Partial<DataLoaders> = {}) =>
  runAgent(quantAgent, new ResearchContext(parseIntent(q), loaders(over), { requestId: "t", now: NOW }));

describe("quant agent", () => {
  it("scores a steady uptrend as bullish with cited signals", async () => {
    const r = await run("Should I buy TCS?", { stockBars: async (t) => ({ symbol: `${t}.NS`, bars: trendBars(800, { drift: 0.0015, wobble: 0.004 }) }) });
    expect(r.status).toBe("success");
    expect(["bullish", "lean_bullish"]).toContain(r.view);
    expect(r.claims.length).toBeGreaterThan(2);
    for (const c of r.claims) expect(c.evidenceIds.every((id) => r.evidence.some((e) => e.id === id))).toBe(true);
  });

  it("scores a steady downtrend as bearish", async () => {
    const r = await run("Should I buy TCS?", { stockBars: async (t) => ({ symbol: `${t}.NS`, bars: trendBars(800, { drift: -0.0015, wobble: 0.004 }) }) });
    expect(["bearish", "lean_bearish"]).toContain(r.view);
    expect(r.risks.join(" ")).toMatch(/downtrend/);
  });

  it("never reports a direction probability and says why", async () => {
    const r = await run("Should I buy TCS?");
    const d = r.details as QuantDetails;
    expect(r.metrics.predictionProbability).toBeNull();
    expect(d.probability.available).toBe(false);
    expect(d.probability.reason).toMatch(/No direction model passed validation/);
    expect(d.historicalReliability.directionalAccuracy.available).toBe(false);
  });

  it("uses the registered volatility model and reports its validation separately", async () => {
    const r = await run("Should I buy TCS?");
    const d = r.details as QuantDetails;
    expect(d.volatilityForecast.available).toBe(true);
    expect(d.historicalReliability.volatilityModel?.folds).toBeGreaterThan(0);
    expect(r.evidence.some((e) => e.kind === "ml_model")).toBe(true);
    expect(r.evidence.some((e) => e.kind === "model_validation")).toBe(true);
  });

  it("reports missing market data and lowers confidence instead of inventing beta", async () => {
    const r = await run("Should I buy TCS?", { marketBars: async () => null });
    expect(r.status).toBe("partial");
    expect(r.metrics.beta).toBeNull();
    expect(r.missingData.join(" ")).toMatch(/NIFTY 50/);
    expect(r.confidence).toBeLessThan(1);
  });

  it("halves confidence when prices are stale", async () => {
    const fresh = await run("Should I buy TCS?");
    const stale = await run("Should I buy TCS?", { stockBars: async (t) => ({ symbol: `${t}.NS`, bars: trendBars(800, { end: "2026-09-01" }) }) });
    expect(stale.confidence).toBeLessThan(fresh.confidence);
    expect(stale.missingData.join(" ")).toMatch(/days old/);
  });

  it("returns no view when there is no price history", async () => {
    const r = await run("Should I buy TCS?", { stockBars: async () => null });
    expect(r).toMatchObject({ view: "no_view", confidence: 0, status: "partial" });
  });

  it("summarises breadth for a portfolio", async () => {
    const r = await run("Build a portfolio from TCS, INFY and HDFCBANK");
    const d = r.details as QuantDetails;
    expect(d.subject).toBe("portfolio");
    expect(d.breadth?.tickers).toBe(3);
  });

  it("maps rule scores to views at the published thresholds", () => {
    expect([3, 1, 0, -1, -3].map(viewFromScore)).toEqual(["bullish", "lean_bullish", "neutral", "lean_bearish", "bearish"]);
  });
});
