import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { computeQuantScore } from "@/lib/scoring/quantEngine";
import { computeRbiStance } from "@/lib/services/macro";
import type { FundamentalData, TechnicalIndicators } from "@/lib/types";

const src = (p: string) => readFileSync(p, "utf8");

/** Missing market inputs must stay missing: these defaults used to stand in for real values. */
describe("no invented defaults for missing market data", () => {
  it("the AI-analysis route does not invent a 52-week range from the price", () => {
    expect(src("app/api/ai-analysis/[ticker]/route.ts")).not.toMatch(/price \* (?:1\.3|0\.7)/);
  });

  it("macro code does not substitute a fixed India VIX, USD/INR or US 10Y", () => {
    expect(src("lib/services/macro.ts")).not.toMatch(/(?:indiaVix|usdInr|us10y)\?\.price \?\? \d/);
  });

  it("rate pressure is UNKNOWN when an input is missing, and never claimed as the RBI's own stance", () => {
    expect(computeRbiStance({ indiaVix: { price: 12 }, usdInr: { price: 82 } })).toBe("UNKNOWN");
    expect(computeRbiStance({ indiaVix: { price: 12 }, usdInr: { price: 82 }, us10y: { price: 3.8 } })).toBe("DOVISH");
    expect(src("lib/ai/narrativeEngine.ts")).not.toMatch(/RBI is in an easing phase|RBI maintains a hawkish stance/);
  });

  it("a missing 52-week range skips the range rule instead of scoring an invented one", () => {
    const tech = { rsi_14: 50, macd: 0, macd_signal: 0, macd_histogram: 0, ema_20: 100, ema_50: 100, ema_200: 100, bb_upper: 110, bb_middle: 100, bb_lower: 90, atr_14: 2, obv: 0, adx: 20, stoch_k: 50, stoch_d: 50, vwap: 100, support_levels: [], resistance_levels: [], trend: "SIDEWAYS", trend_strength: "WEAK" } as TechnicalIndicators;
    const fund = Object.fromEntries(["pe_ratio", "roe"].map((k) => [k, null])) as unknown as FundamentalData;
    const s = computeQuantScore(tech, fund, 100, NaN, NaN);
    expect([...s.signals.bullish, ...s.signals.bearish].join(" ")).not.toMatch(/52-week/);
  });
});
