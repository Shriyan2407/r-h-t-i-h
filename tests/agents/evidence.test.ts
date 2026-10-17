import { describe, expect, it } from "vitest";
import { EvidenceLog, SOURCE_RELIABILITY, ageDays, evidenceQuality, newsReliability } from "@/lib/agents/evidence";

describe("evidence engine", () => {
  it("assigns sequential, agent-prefixed ids and source-type reliability", () => {
    const log = new EvidenceLog("Q");
    const a = log.add({ kind: "market_data", label: "Close", value: 100, display: "₹100.00", source: "Yahoo Finance", asOf: "2026-10-16" });
    const b = log.add({ kind: "ml_model", label: "Forecast", value: 0.02, display: "2.0%", source: "volatility-ridge@1.1.0", asOf: "2026-10-16" });
    expect([a, b]).toEqual(["Q1", "Q2"]);
    expect(log.all().map((e) => e.reliability)).toEqual([SOURCE_RELIABILITY.market_data, SOURCE_RELIABILITY.ml_model]);
  });

  it("an agent's own inference is the least trusted source type", () => {
    expect(Math.min(...Object.values(SOURCE_RELIABILITY))).toBe(SOURCE_RELIABILITY.agent_inference);
  });

  it("rates exchanges and wire services above aggregators", () => {
    expect(newsReliability("NSE")).toBeGreaterThan(newsReliability("Economic Times Markets"));
    expect(newsReliability("Economic Times Markets")).toBeGreaterThan(newsReliability("Google News — NSE India"));
    expect(newsReliability("Some Blog")).toBe(0.6);
  });

  it("measures age from the data's own timestamp and treats missing dates as unknown", () => {
    const now = new Date("2026-10-17T12:00:00Z");
    expect(ageDays("2026-10-10", now)).toBe(7);
    expect(ageDays(null, now)).toBeNull();
    expect(ageDays("not a date", now)).toBeNull();
  });

  it("flags stale market data after 4 days but news only after 30", () => {
    const now = new Date("2026-10-17T00:00:00Z");
    const q = evidenceQuality([
      { id: "Q1", kind: "market_data", label: "", value: 1, display: "1", source: "", asOf: "2026-10-10", reliability: 0.95 },
      { id: "N1", kind: "news", label: "", value: "h", display: "h", source: "", asOf: "2026-10-10", reliability: 0.6 },
      { id: "F1", kind: "fundamentals", label: "", value: 1, display: "1", source: "", asOf: null, reliability: 0.8 },
    ], now);
    expect(q).toMatchObject({ items: 3, stale: 1, undated: 1 });
    expect(q.meanReliability).toBeCloseTo((0.95 + 0.6 + 0.8) / 3, 12);
  });
});
