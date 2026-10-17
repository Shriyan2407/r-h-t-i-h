import { describe, expect, it } from "vitest";
import { runAgent } from "@/lib/agents/agent";
import { ResearchContext, type DataLoaders } from "@/lib/agents/context";
import { parseIntent } from "@/lib/agents/intent";
import { strategistAgent, type StrategistDetails } from "@/lib/agents/strategist";
import { loaders, macro, trendBars } from "./fixtures";

const run = (q = "Should I buy TCS?", over: Partial<DataLoaders> = {}) =>
  runAgent(strategistAgent, new ResearchContext(parseIntent(q), loaders(over), { requestId: "t" }));

const vixAt = (level: number) => trendBars(800, { start: level, drift: 0, wobble: 0 });

describe("strategist agent", () => {
  it("classifies the regime and cites what historically followed it", async () => {
    const r = await run();
    const d = r.details as StrategistDetails;
    expect(d.marketRegime?.name).toBeTruthy();
    expect(r.evidence.some((e) => e.kind === "statistical_model")).toBe(true);
    expect(d.scenarios?.bear.description).toMatch(/Market stress/);
  });

  it("never goes beyond a lean view, because regimes describe risk, not returns", async () => {
    for (const vixLevel of [10, 30]) {
      for (const drift of [0.002, -0.002]) {
        const r = await run("Should I buy TCS?", { marketBars: async (w) => (w === "index" ? trendBars(800, { start: 20000, drift, wobble: 0.002 }) : vixAt(vixLevel)) });
        expect(["lean_bullish", "neutral", "lean_bearish"]).toContain(r.view);
      }
    }
  });

  it("flags a high-volatility regime as a risk", async () => {
    const r = await run("Should I buy TCS?", { marketBars: async (w) => (w === "index" ? trendBars(800, { start: 20000, drift: -0.002, wobble: 0.002 }) : vixAt(30)) });
    expect((r.details as StrategistDetails).marketRegime?.vol).toBe("HIGH");
    expect(r.view).toBe("lean_bearish");
    expect(r.risks.join(" ")).toMatch(/High-volatility regime/);
  });

  it("reports policy rate, CPI and GDP as unavailable instead of inventing them", async () => {
    const r = await run();
    expect(r.missingData.join(" ")).toMatch(/RBI policy rate.*DATA_UNAVAILABLE/);
    expect(r.missingData.join(" ")).toMatch(/CPI inflation \(DATA_UNAVAILABLE\)/);
  });

  it("omits macro values that are missing rather than defaulting them", async () => {
    const r = await run("Should I buy TCS?", { macro: async () => macro({ currency: { usd_inr: null } } as never) });
    expect(r.evidence.some((e) => e.label === "USD/INR")).toBe(false);
    expect(r.evidence.some((e) => e.label === "India VIX")).toBe(true);
  });

  it("reports the stock's sector move as a one-week figure, not a cycle call", async () => {
    const r = await run("Should I buy TCS?");
    expect((r.details as StrategistDetails).sectorOutlook).toMatch(/IT sector index moved \+2\.1%.*too short to call a sector cycle/);
  });

  it("notes an unstated horizon instead of assuming one", async () => {
    const r = await run("Should I buy TCS?");
    expect((r.details as StrategistDetails).strategicImplication).toMatch(/No investment horizon was stated/);
  });

  it("returns no view when neither regime nor macro data is available", async () => {
    const r = await run("Should I buy TCS?", { macro: async () => null, marketBars: async () => null });
    expect(r).toMatchObject({ view: "no_view", confidence: 0 });
  });
});
